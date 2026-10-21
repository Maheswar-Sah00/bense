// Names the hair's colour, not just its lightness. Lightness alone called purple hair "Medium
// brown" (L* 31.6 is level 4), and YouCam's colour families are natural shades only (it said
// "Blonde"), so the hue is read here.
//
// Natural hair pigment sits in a narrow warm band of CIELAB hue. Measured on the test photos:
// brown ≈ 38° at chroma 8, black chroma 4–5, natural red 52° at chroma 35 (41 at the 90th
// percentile), blonde 71–77° at chroma 27–34. Purple hair from a live test was 322° at chroma 57.
// A strongly coloured pixel outside the warm band, or far more colourful than natural hair gets,
// can only be dye.
import { HAIR_LEVEL_NAMES, type HairLevel } from './hairLevel'

export type HairLookKind = 'natural' | 'grey' | 'vivid' | 'streaks'
export type DyeColour = 'red' | 'pink' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple'

export interface HairLook {
  kind: HairLookKind
  /** What a person would call it: "Purple", "Copper red", "Dark brown with blue streaks". */
  name: string
  /** The main dye colour, for vivid hair and streaks. */
  colour?: DyeColour
  /** Median chroma C* and hue angle h° of the hair. */
  chroma: number
  hue: number
  /** Share of hair pixels coloured in a way natural hair never is. */
  dyedShare: number
}

/** Hues natural hair spans, in CIELAB degrees: auburn near 35°, copper near 52°, blonde near 75°. */
export const NATURAL_HUE = { min: 28, max: 105 } as const
/** Below this chroma a pixel's hue is mostly noise or the light's tint (black hair reads 4–5). */
export const MIN_DYE_CHROMA = 15
/** Natural hair, red included, stays well under this (41 at the 90th percentile in testing). */
export const MAX_NATURAL_CHROMA = 50
/** Share of dyed pixels that makes the whole head a dye colour, or streaks of one. */
const VIVID_SHARE = 0.4
const STREAK_SHARE = 0.12

const COLOURS: DyeColour[] = ['red', 'pink', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple']
const COLOUR_NAMES: Record<DyeColour, string> = {
  red: 'Red',
  pink: 'Pink',
  orange: 'Orange',
  yellow: 'Yellow',
  green: 'Green',
  teal: 'Teal',
  blue: 'Blue',
  purple: 'Purple',
}

/**
 * Hue to colour word, with bands set from sRGB references in CIELAB: cherry 26°, red 40°, copper
 * 50°, orange 60°, yellow 103°, green 136°, teal 196°, sky blue 235°, royal blue 292°, blue 306°,
 * violet 313°, purple 328°, hot pink 351°. Pink is told from red by lightness afterwards.
 */
function colourOfHue(h: number): DyeColour {
  if (h >= 340 || h < 45) return 'red'
  if (h < 70) return 'orange'
  if (h < 115) return 'yellow'
  if (h < 170) return 'green'
  if (h < 225) return 'teal'
  if (h < 309) return 'blue'
  return 'purple'
}

export const hueOf = (a: number, b: number) => ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360

/** Per-colour pixel counts, with summed L* and C* to name each one. */
class Tally {
  readonly count = new Float64Array(COLOURS.length)
  readonly sumL = new Float64Array(COLOURS.length)
  readonly sumC = new Float64Array(COLOURS.length)
  total = 0
  add(colour: DyeColour, L: number, C: number) {
    const k = COLOURS.indexOf(colour)
    this.count[k]++
    this.sumL[k] += L
    this.sumC[k] += C
    this.total++
  }
  merge(other: Tally): Tally {
    const out = new Tally()
    for (let k = 0; k < COLOURS.length; k++) {
      out.count[k] = this.count[k] + other.count[k]
      out.sumL[k] = this.sumL[k] + other.sumL[k]
      out.sumC[k] = this.sumC[k] + other.sumC[k]
    }
    out.total = this.total + other.total
    return out
  }
  /** Colours by pixel count, most first, with what each should be called. */
  ranked(): { colour: DyeColour; count: number; name: string }[] {
    return COLOURS.map((colour, k) => ({ colour, k }))
      .filter(({ k }) => this.count[k] > 0)
      .sort((x, y) => this.count[y.k] - this.count[x.k])
      .map(({ colour, k }) => {
        const L = this.sumL[k] / this.count[k]
        const C = this.sumC[k] / this.count[k]
        let named: DyeColour = colour
        if (colour === 'red' && L >= 50) named = 'pink'
        let name = COLOUR_NAMES[named]
        if (colour === 'red' && L < 33) name = 'Burgundy'
        else if (colour === 'orange') name = 'Bright copper'
        else if (colour === 'yellow' && C >= MAX_NATURAL_CHROMA) name = 'Bright yellow'
        else if (L >= 62 && C < 35 && named !== 'pink' && named !== 'yellow') name = `Pastel ${name.toLowerCase()}`
        return { colour: named, count: this.count[k], name }
      })
  }
}

/** Natural shade name: the level's name, or a red one when the hair is clearly red. */
function naturalName(level: HairLevel, chroma: number, hue: number): string {
  if (chroma >= 26 && hue >= NATURAL_HUE.min && hue < 62) {
    if (level >= 8) return 'Strawberry blonde'
    return hue < 45 ? 'Auburn' : 'Copper red'
  }
  return HAIR_LEVEL_NAMES[level]
}

/**
 * Reads the hair's colour from its per-pixel CIELAB values (already light-corrected, if a card
 * was tapped). `medianLab` and `level` come from the lightness measurement.
 */
export function classifyHairLook(
  L: ArrayLike<number>,
  A: ArrayLike<number>,
  B: ArrayLike<number>,
  medianLab: readonly [number, number, number],
  level: HairLevel,
): HairLook {
  const n = L.length
  // Off-hue: a clear colour outside the natural band (purple, blue, green, pink…).
  // Hot: a natural hue, but more colourful than natural hair gets (bright copper, fire red).
  const off = new Tally()
  const hot = new Tally()
  for (let i = 0; i < n; i++) {
    const C = Math.hypot(A[i], B[i])
    if (C < MIN_DYE_CHROMA) continue
    const h = hueOf(A[i], B[i])
    if (h < NATURAL_HUE.min || h >= NATURAL_HUE.max) off.add(colourOfHue(h), L[i], C)
    else if (C >= MAX_NATURAL_CHROMA) hot.add(colourOfHue(h), L[i], C)
  }
  const chroma = Math.hypot(medianLab[1], medianLab[2])
  const hue = hueOf(medianLab[1], medianLab[2])
  const offShare = n ? off.total / n : 0
  const dyedShare = n ? (off.total + hot.total) / n : 0
  const base = { chroma, hue, dyedShare }

  if (offShare >= VIVID_SHARE || (dyedShare >= VIVID_SHARE && chroma >= 45)) {
    const [top, second] = off.merge(hot).ranked()
    // Two-colour hair ("pink and blue") when the second colour is a real part of it.
    const name =
      second && second.name !== top.name && second.count >= 0.4 * top.count && second.count >= 0.15 * n
        ? `${top.name} and ${second.name.toLowerCase()}`
        : top.name
    return { kind: 'vivid', name, colour: top.colour, ...base }
  }
  if (offShare >= STREAK_SHARE) {
    const [top] = off.ranked()
    return {
      kind: 'streaks',
      name: `${naturalName(level, chroma, hue)} with ${top.name.toLowerCase()} streaks`,
      colour: top.colour,
      ...base,
    }
  }
  // No pigment left: grey, white or silver (blonde keeps a yellow tint, chroma 25+).
  if (chroma < 6 && medianLab[0] >= 45) return { kind: 'grey', name: 'Grey or white', ...base }
  return { kind: 'natural', name: naturalName(level, chroma, hue), ...base }
}

/** True when the reading shows dye, all over or in streaks. */
export const isDyedLook = (look: HairLook | undefined): look is HairLook & { colour: DyeColour } =>
  look?.kind === 'vivid' || look?.kind === 'streaks'
