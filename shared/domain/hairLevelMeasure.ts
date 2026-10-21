// Measures the starting hair level from the selfie itself.
//
// 1. YouCam Hair Color recolours only the hair, so a vivid #00FF00 render marks exactly which
//    pixels are hair (the "mask"). This is YouCam's segmentation; we don't guess hair pixels.
// 2. In the ORIGINAL photo we take the median CIE L* of those pixels (median, so highlights and
//    shadows don't dominate), after dropping the mask's edge pixels, which mix hair with skin or
//    background.
// 3. Optionally the user taps the white card they held in the selfie. Its colour gives per-channel
//    gains in linear RGB that remove the light's colour cast and the camera's exposure, so the hair
//    is measured as if lit by neutral light.
// 4. L* maps to a level with the same bands the shade model uses (levelToLightness). Those bands
//    are uncalibrated against salon-graded hair, so the result is a suggestion the user confirms.
//
// Ported from tests/boxtruth.py (measure_from_files); the parity test checks both agree.
import type { Lab } from './colour'
import { toHairLevel, type HairLevel } from './hairLevel'
import { classifyHairLook, type HairLook } from './hairLook'

export const MASK_COLOUR = '#00FF00'
/** Render pixel counts as hair when green exceeds both red and blue by this much (harness value). */
export const MASK_THRESHOLD = 40
/** sRGB value a white card is mapped to: L* ≈ 96, typical of white paper. */
export const CARD_TARGET = 245
/** Card patch radius, as a share of the image's shorter side. */
export const CARD_RADIUS = 0.03

export interface RgbaImage {
  width: number
  height: number
  /** RGBA (4 bytes per pixel, canvas ImageData layout) or RGB (3 bytes per pixel). */
  data: Uint8ClampedArray | Uint8Array
  channels?: 3 | 4
}

/** A point on the photo, as fractions of its width and height (so it survives resizing). */
export interface CardPoint {
  x: number
  y: number
}

export type CardProblem = 'outside' | 'on-hair' | 'too-dark' | 'too-colourful' | 'uneven'

export interface CardSample {
  point: CardPoint
  /** Card colour before correction. */
  lab: Lab
  /** Per-channel gains applied in linear RGB. */
  gains: [number, number, number]
  /** Share of card pixels at 250+ in any channel; a clipped card under-corrects. */
  clipped: number
}

export interface LevelMeasurement {
  status: 'measured' | 'no-hair'
  hairPixels: number
  /** Share of the image that is hair. */
  hairShare: number
  /** Median CIE Lab of the hair (after calibration, if any). */
  lab: Lab
  /** Interquartile range of hair L*, a sign of highlights, roots or uneven light. */
  spreadL: number
  levelExact: number
  level: HairLevel
  range: { min: HairLevel; max: HairLevel }
  /** The hair's colour (natural, grey, or a dye colour), from its hue. Set when measured. */
  look?: HairLook
  calibrated: boolean
  card?: CardSample
  notes: string[]
}

export interface MeasureOptions {
  card?: CardPoint
  /** Edge-erosion passes (default 1). 0 reproduces the harness exactly. */
  erode?: number
  /** Ignore pixels that were already green in the original (default true). */
  skipGreenOriginal?: boolean
}

export class CardError extends Error {
  readonly problem: CardProblem
  constructor(problem: CardProblem) {
    super(CARD_MESSAGES[problem])
    this.problem = problem
  }
}

export const CARD_MESSAGES: Record<CardProblem, string> = {
  outside: 'That point is too close to the edge of the photo. Tap the middle of your white card.',
  'on-hair': 'That’s hair, not the card. Tap the middle of your white card.',
  'too-dark': 'That spot is too dark to be a white card. Tap the card, or retake the photo in brighter light.',
  'too-colourful': 'That spot is too colourful to be a white card. Tap plain white paper or card.',
  uneven: 'That spot isn’t evenly lit (an edge, shadow or pattern). Tap a plain part of the card.',
}

// ---------------------------------------------------------------- colour maths (same as colour.ts)

const WHITE = [0.95047, 1.0, 1.08883] as const
const LINEAR = new Float64Array(256).map((_, v) => {
  const c = v / 255
  return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92
})
const toLinear = (v: number) => {
  const c = v / 255
  return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92
}

export function linearToLab(r: number, g: number, b: number): Lab {
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / WHITE[0])
  const y = f((0.2126 * r + 0.7152 * g + 0.0722 * b) / WHITE[1])
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / WHITE[2])
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

/** Inverse of levelToLightness (L* = 12 + 7 × (level − 1)); unrounded, unclamped. */
export function lightnessToLevel(L: number): number {
  return (L - 12) / 7 + 1
}

// ---------------------------------------------------------------- mask

const px = (img: RgbaImage) => img.channels ?? (img.data.length === img.width * img.height * 3 ? 3 : 4)

/** 1 where the render turned the pixel clearly green (and, by default, the original wasn't green). */
export function hairMask(original: RgbaImage, render: RgbaImage, opts: Pick<MeasureOptions, 'skipGreenOriginal'> = {}): Uint8Array {
  if (original.width !== render.width || original.height !== render.height) {
    throw new Error('The photo and its hair render must be the same size.')
  }
  const n = original.width * original.height
  const oc = px(original)
  const rc = px(render)
  const skipGreen = opts.skipGreenOriginal ?? true
  const mask = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const r = render.data[i * rc]
    const g = render.data[i * rc + 1]
    const b = render.data[i * rc + 2]
    if (g - Math.max(r, b) <= MASK_THRESHOLD) continue
    if (skipGreen) {
      const og = original.data[i * oc + 1]
      if (og - Math.max(original.data[i * oc], original.data[i * oc + 2]) > 25) continue
    }
    mask[i] = 1
  }
  return mask
}

/** Removes one pixel from every edge of the mask (4-neighbour erosion). */
export function erode(mask: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(mask.length)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      out[i] = mask[i] & mask[i - 1] & mask[i + 1] & mask[i - width] & mask[i + width]
    }
  }
  return out
}

// ---------------------------------------------------------------- white card

/** Reads the card patch and returns the gains that map it to neutral white. Throws CardError. */
export function sampleCard(original: RgbaImage, point: CardPoint, mask?: Uint8Array): CardSample {
  const { width, height } = original
  const c = px(original)
  const radius = Math.max(2, Math.round(Math.min(width, height) * CARD_RADIUS))
  const cx = Math.round(point.x * width)
  const cy = Math.round(point.y * height)
  if (cx - radius < 0 || cy - radius < 0 || cx + radius >= width || cy + radius >= height) throw new CardError('outside')

  let count = 0
  let onHair = 0
  let clipped = 0
  const sum = [0, 0, 0]
  const ls: number[] = []
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > radius ** 2) continue
      const i = y * width + x
      if (mask?.[i]) onHair++
      const r = original.data[i * c]
      const g = original.data[i * c + 1]
      const b = original.data[i * c + 2]
      if (Math.max(r, g, b) >= 250) clipped++
      sum[0] += LINEAR[r]
      sum[1] += LINEAR[g]
      sum[2] += LINEAR[b]
      ls.push(linearToLab(LINEAR[r], LINEAR[g], LINEAR[b])[0])
      count++
    }
  }
  if (onHair / count > 0.2) throw new CardError('on-hair')
  const mean = sum.map((s) => s / count) as [number, number, number]
  const lab = linearToLab(...mean)
  const meanL = ls.reduce((a, b) => a + b, 0) / ls.length
  const sd = Math.sqrt(ls.reduce((a, b) => a + (b - meanL) ** 2, 0) / ls.length)
  if (lab[0] < 45) throw new CardError('too-dark')
  if (Math.hypot(lab[1], lab[2]) > 30) throw new CardError('too-colourful')
  if (sd > 6) throw new CardError('uneven')
  const target = toLinear(CARD_TARGET)
  return { point, lab, gains: mean.map((m) => target / Math.max(m, 1e-4)) as [number, number, number], clipped: clipped / count }
}

// ---------------------------------------------------------------- measurement

function median(values: Float64Array): number {
  const sorted = values.slice().sort()
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function quantile(sorted: Float64Array, q: number): number {
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  return sorted[lo] + (sorted[Math.min(lo + 1, sorted.length - 1)] - sorted[lo]) * (pos - lo)
}

const MIN_HAIR_PIXELS = 200
const MIN_HAIR_SHARE = 0.005

export function measureHairLevel(original: RgbaImage, render: RgbaImage, opts: MeasureOptions = {}): LevelMeasurement {
  const { width, height } = original
  const raw = hairMask(original, render, opts)
  let mask = raw
  for (let k = 0; k < (opts.erode ?? 1); k++) mask = erode(mask, width, height)
  let count = mask.reduce((a, b) => a + b, 0)
  // Thin hair (short crops, fringes) can vanish when eroded; then use the unshrunk mask.
  if (count < MIN_HAIR_PIXELS) {
    mask = raw
    count = raw.reduce((a, b) => a + b, 0)
  }
  const card = opts.card ? sampleCard(original, opts.card, raw) : undefined
  const gains = card?.gains ?? [1, 1, 1]

  const hairShare = count / (width * height)
  const notes: string[] = []
  if (count < MIN_HAIR_PIXELS || hairShare < MIN_HAIR_SHARE) {
    return {
      status: 'no-hair',
      hairPixels: count,
      hairShare,
      lab: [0, 0, 0],
      spreadL: 0,
      levelExact: 0,
      level: 1,
      range: { min: 1, max: 1 },
      calibrated: !!card,
      card,
      notes: ['YouCam found too little hair in this photo to measure. Show more of your hair, or choose your level yourself.'],
    }
  }

  const c = px(original)
  const L = new Float64Array(count)
  const A = new Float64Array(count)
  const B = new Float64Array(count)
  let j = 0
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue
    const lab = linearToLab(
      Math.min(1, LINEAR[original.data[i * c]] * gains[0]),
      Math.min(1, LINEAR[original.data[i * c + 1]] * gains[1]),
      Math.min(1, LINEAR[original.data[i * c + 2]] * gains[2]),
    )
    L[j] = lab[0]
    A[j] = lab[1]
    B[j] = lab[2]
    j++
  }
  const sortedL = L.slice().sort()
  const lab: Lab = [median(L), median(A), median(B)]
  const spreadL = quantile(sortedL, 0.75) - quantile(sortedL, 0.25)
  const levelExact = lightnessToLevel(lab[0])
  const level = toHairLevel(levelExact)
  // Without a card, exposure and light colour can move L* by a level either way.
  const half = card ? 0.5 : 1
  const range = { min: toHairLevel(levelExact - half), max: toHairLevel(levelExact + half) }
  const look = classifyHairLook(L, A, B, lab, level)

  if (look.kind === 'vivid') {
    notes.push(`${look.name} isn’t a natural hair colour, so this is dye. The level is how deep the colour is.`)
  } else if (look.kind === 'streaks') {
    notes.push(`About ${Math.round(look.dyedShare * 100)}% of your hair is ${look.colour}, which is dye. The level is for the rest.`)
  } else if (look.kind === 'grey') {
    notes.push('Grey or white hair has little pigment left. If it’s mixed with darker hair, go by the darker hair.')
  }
  if (card) {
    notes.push('Calibrated with your white card, so the light’s colour and the camera’s exposure are corrected.')
    if (card.clipped > 0.3) notes.push('Your card is overexposed in the photo, so your hair may read a little light.')
  } else {
    notes.push('Not calibrated: lighting and camera exposure can shift this by about a level. Tap your white card to correct for them.')
  }
  if (hairShare < 0.03) notes.push('Only a small area of hair was visible, so this reading is less certain.')
  if (levelExact < 1.5) {
    notes.push('Very dark hair can read darker in photos because of shadows between strands. Check this against the swatches.')
  }
  if (spreadL > 25) notes.push('Your hair varies a lot in lightness (roots, highlights or uneven light). We used the middle value.')

  return { status: 'measured', hairPixels: count, hairShare, lab, spreadL, levelExact, level, range, look, calibrated: !!card, card, notes }
}
