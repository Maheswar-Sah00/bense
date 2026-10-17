// Makes a YouCam Hair Color render look like dyed hair instead of a flat coat of paint.
//
// Live tests (2026-10-17) showed the render keeps the new colour but loses the photo's own light
// and shade: the gloss bands, the darker underlayer and the strand contrast flatten into one
// even tone, and `shine_intensity` (0, 50, 80) barely changed that. So on the device we keep
// YouCam's colour and put the original photo's lightness structure back:
//
//   lightness = YouCam's median hair L* + the original's deviation from its own median
//               (scaled, because lighter hair shows more contrast), plus a little of YouCam's texture
//   colour    = YouCam's a*/b* (lightly smoothed) + some of the original's tonal variation,
//               with less colour in deep shadow and bright shine, as on real hair
//
// The hair outline comes from YouCam too: its #00FF00 mask render when we have one, otherwise
// the pixels the render changed. Edges are feathered so there is no cut-out line.
//
// `maxLiftL` stops the picture from showing more lightening than the prediction allows: the
// "probable result" for box-dyed hair must not come out lighter than the hair already is.
import type { RgbaImage } from './hairLevelMeasure'

export interface FinishOptions {
  /** Most the hair's median L* may rise above the original's. Undefined = YouCam's lightness. */
  maxLiftL?: number
}

export interface FinishResult {
  image: RgbaImage
  /** Median L* of the original hair and of the finished target. */
  hairL: number
  targetL: number
}

/** Below this many clear hair pixels there is nothing to finish, and the raw render is kept. */
export const MIN_HAIR_PIXELS = 200

const WHITE = [0.95047, 1.0, 1.08883] as const
const LINEAR = new Float32Array(256).map((_, v) => {
  const c = v / 255
  return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92
})

const channels = (img: RgbaImage) => img.channels ?? (img.data.length === img.width * img.height * 3 ? 3 : 4)

const smoothstep = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
const fInv = (t: number) => (t * t * t > 0.008856 ? t * t * t : (t - 16 / 116) / 7.787)

interface LabPlanes {
  L: Float32Array
  a: Float32Array
  b: Float32Array
}

function toLab(img: RgbaImage): LabPlanes {
  const n = img.width * img.height
  const c = channels(img)
  const L = new Float32Array(n)
  const a = new Float32Array(n)
  const b = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const r = LINEAR[img.data[i * c]]
    const g = LINEAR[img.data[i * c + 1]]
    const bl = LINEAR[img.data[i * c + 2]]
    const x = f((0.4124 * r + 0.3576 * g + 0.1805 * bl) / WHITE[0])
    const y = f((0.2126 * r + 0.7152 * g + 0.0722 * bl) / WHITE[1])
    const z = f((0.0193 * r + 0.1192 * g + 0.9505 * bl) / WHITE[2])
    L[i] = 116 * y - 16
    a[i] = 500 * (x - y)
    b[i] = 200 * (y - z)
  }
  return { L, a, b }
}

/** CIE Lab to linear sRGB (unclamped). */
function labToLinear(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116
  const x = fInv(fy + a / 500) * WHITE[0]
  const y = fInv(fy) * WHITE[1]
  const z = fInv(fy - b / 200) * WHITE[2]
  return [
    3.2406 * x - 1.5372 * y - 0.4986 * z,
    -0.9689 * x + 1.8758 * y + 0.0415 * z,
    0.0557 * x - 0.204 * y + 1.057 * z,
  ]
}

const toByte = (l: number) => {
  const c = Math.min(1, Math.max(0, l))
  return Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255)
}

/** Separable Gaussian blur of one plane. */
export function blur(src: Float32Array, width: number, height: number, sigma: number): Float32Array {
  if (sigma <= 0.05) return src.slice()
  const radius = Math.ceil(sigma * 3)
  const kernel = new Float32Array(radius * 2 + 1)
  let sum = 0
  for (let i = -radius; i <= radius; i++) sum += kernel[i + radius] = Math.exp(-(i * i) / (2 * sigma * sigma))
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum
  const tmp = new Float32Array(src.length)
  const out = new Float32Array(src.length)
  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      let acc = 0
      for (let k = -radius; k <= radius; k++) {
        const xx = Math.min(width - 1, Math.max(0, x + k))
        acc += src[row + xx] * kernel[k + radius]
      }
      tmp[row + x] = acc
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0
      for (let k = -radius; k <= radius; k++) {
        const yy = Math.min(height - 1, Math.max(0, y + k))
        acc += tmp[yy * width + x] * kernel[k + radius]
      }
      out[y * width + x] = acc
    }
  }
  return out
}

/** Value at a fraction (0–1) of the sorted values; samples large sets for speed. */
function quantile(values: Float32Array, at: number): number {
  const step = Math.max(1, Math.floor(values.length / 40000))
  const picked: number[] = []
  for (let i = 0; i < values.length; i += step) picked.push(values[i])
  picked.sort((x, y) => x - y)
  return picked[Math.min(picked.length - 1, Math.max(0, Math.round(at * (picked.length - 1))))]
}

/** Hair weight 0–1 from YouCam's #00FF00 mask render: how clearly each pixel turned green. */
export function alphaFromMask(maskRender: RgbaImage): Float32Array {
  const n = maskRender.width * maskRender.height
  const c = channels(maskRender)
  const alpha = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const r = maskRender.data[i * c]
    const g = maskRender.data[i * c + 1]
    const b = maskRender.data[i * c + 2]
    alpha[i] = smoothstep((g - Math.max(r, b)) / 255, 0.06, 0.24)
  }
  return alpha
}

/** Hair weight 0–1 from where a render changed the photo (CIE76 colour difference). */
export function alphaFromChange(original: RgbaImage, render: RgbaImage): Float32Array {
  assertSameSize(original, render)
  const o = toLab(original)
  const r = toLab(render)
  const alpha = new Float32Array(o.L.length)
  for (let i = 0; i < alpha.length; i++) {
    const d = Math.hypot(o.L[i] - r.L[i], o.a[i] - r.a[i], o.b[i] - r.b[i])
    alpha[i] = smoothstep(d, 4, 14)
  }
  return alpha
}

function assertSameSize(a: RgbaImage, b: RgbaImage) {
  if (a.width !== b.width || a.height !== b.height) throw new Error('The photo and its render must be the same size.')
}

/** Returns null when the render shows too little hair to finish. */
export function finishHair(
  original: RgbaImage,
  render: RgbaImage,
  hairAlpha: Float32Array,
  opts: FinishOptions = {},
): FinishResult | null {
  assertSameSize(original, render)
  const { width, height } = original
  const n = width * height
  if (hairAlpha.length !== n) throw new Error('The hair mask must match the photo size.')
  // The working size varies (512–1024 px); blur radii are tuned at 1024.
  const scale = Math.max(width, height) / 1024

  const o = toLab(original)
  const r = toLab(render)

  let core = 0
  for (let i = 0; i < n; i++) if (hairAlpha[i] > 0.9) core++
  if (core < MIN_HAIR_PIXELS) return null
  const pick = (plane: Float32Array) => {
    const out = new Float32Array(core)
    for (let i = 0, j = 0; i < n; i++) if (hairAlpha[i] > 0.9) out[j++] = plane[i]
    return out
  }
  const hairL = pick(o.L)
  const H = [quantile(hairL, 0.5), quantile(pick(o.a), 0.5), quantile(pick(o.b), 0.5)]
  const T = [quantile(pick(r.L), 0.5), quantile(pick(r.a), 0.5), quantile(pick(r.b), 0.5)]
  if (opts.maxLiftL !== undefined) T[0] = Math.min(T[0], H[0] + Math.max(0, opts.maxLiftL))

  // Pixels far brighter than any hair are skin or background caught by the mask's edge.
  const brightest = quantile(hairL, 0.95)
  // Light and shade stay within the hair's own range, so edge pixels that mix in a bright
  // background can't turn into a pale rim around the hair.
  const devLow = quantile(hairL, 0.01) - H[0]
  const devHigh = quantile(hairL, 0.99) - H[0]
  const weight = new Float32Array(n)
  for (let i = 0; i < n; i++) weight[i] = hairAlpha[i] * (1 - smoothstep(o.L[i], brightest + 8, brightest + 22))
  const alpha = blur(weight, width, height, 1.0 * scale)

  // Lighter hair shows more light-and-shade contrast than dark hair, and vice versa.
  const gain = Math.min(2, Math.max(0.6, (T[0] + 16) / (H[0] + 16)))
  const shade = blur(o.L, width, height, 0.6 * scale)
  const ra = blur(r.a, width, height, 1.5 * scale)
  const rb = blur(r.b, width, height, 1.5 * scale)

  const oc = channels(original)
  const out = new Uint8ClampedArray(n * 4)
  for (let i = 0; i < n; i++) {
    const w = alpha[i]
    const or = LINEAR[original.data[i * oc]]
    const og = LINEAR[original.data[i * oc + 1]]
    const ob = LINEAR[original.data[i * oc + 2]]
    let lr = or
    let lg = og
    let lb = ob
    if (w > 0.002) {
      const dev = Math.min(devHigh, Math.max(devLow, shade[i] - H[0]))
      const shaded = T[0] + 0.75 * gain * dev + 0.25 * (r.L[i] - T[0])
      // At the soft edge YouCam's own render is cleaner; the photo's shading takes over inside.
      const L = r.L[i] + (shaded - r.L[i]) * smoothstep(w, 0.5, 0.95)
      // Deep shadow and bright shine carry less colour, as on real hair.
      const sat = 1 - 0.45 * smoothstep(Math.abs(L - T[0]), 12, 40)
      const a = (ra[i] + 0.35 * (o.a[i] - H[1])) * sat
      const b = (rb[i] + 0.35 * (o.b[i] - H[2])) * sat
      const [hr, hg, hb] = labToLinear(L, a, b).map((v) => Math.min(1, Math.max(0, v)))
      lr = or * (1 - w) + hr * w
      lg = og * (1 - w) + hg * w
      lb = ob * (1 - w) + hb * w
    }
    out[i * 4] = toByte(lr)
    out[i * 4 + 1] = toByte(lg)
    out[i * 4 + 2] = toByte(lb)
    out[i * 4 + 3] = 255
  }
  return { image: { width, height, data: out, channels: 4 }, hairL: H[0], targetL: T[0] }
}
