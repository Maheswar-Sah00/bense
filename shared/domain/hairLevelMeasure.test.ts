import { describe, expect, it } from 'vitest'
import { hexToLab } from './colour'
import { levelToLightness } from './shadeCatalogue'
import { CardError, lightnessToLevel, measureHairLevel, type RgbaImage } from './hairLevelMeasure'

const W = 120
const H = 160
type Rgb = [number, number, number]

/** Builds a photo and its #00FF00 render: hair fills `hair(x, y)`, everything else is skin/background. */
function scene(opts: { hair: Rgb; other?: Rgb; card?: Rgb; isHair?: (x: number, y: number) => boolean; edge?: Rgb }) {
  const isHair = opts.isHair ?? ((_x: number, y: number) => y < H / 2)
  const photo = new Uint8ClampedArray(W * H * 4)
  const render = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      const hair = isHair(x, y)
      const onCard = !!opts.card && x >= 80 && x < 110 && y >= 110 && y < 150
      const border = hair && opts.edge && (!isHair(x - 1, y) || !isHair(x + 1, y) || !isHair(x, y - 1) || !isHair(x, y + 1))
      const c: Rgb = border ? opts.edge! : hair ? opts.hair : onCard ? opts.card! : (opts.other ?? [214, 170, 150])
      photo.set([...c, 255], i)
      render.set(hair ? [20, 230, 30, 255] : [...c, 255], i)
    }
  }
  return { photo: { width: W, height: H, data: photo } as RgbaImage, render: { width: W, height: H, data: render } as RgbaImage }
}

/** Simulates a light's colour cast and exposure: per-channel gains in linear RGB. */
function underLight(img: RgbaImage, gains: Rgb): RgbaImage {
  const data = new Uint8ClampedArray(img.data.length)
  for (let i = 0; i < img.data.length; i += 4) {
    for (let k = 0; k < 3; k++) {
      const c = img.data[i + k] / 255
      const lin = (c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92) * gains[k]
      const s = lin > 0.0031308 ? 1.055 * Math.min(lin, 1) ** (1 / 2.4) - 0.055 : 12.92 * lin
      data[i + k] = Math.round(s * 255)
    }
    data[i + 3] = 255
  }
  return { ...img, data }
}

describe('measureHairLevel', () => {
  it('reads the hair colour exactly and maps it with the shade model’s level bands', () => {
    for (const level of [2, 5, 8] as const) {
      const hex = { 2: '#2A1F1A', 5: '#66452E', 8: '#B88D5F' }[level]
      const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb
      const { photo, render } = scene({ hair: rgb })
      const m = measureHairLevel(photo, render)
      expect(m.status).toBe('measured')
      expect(m.lab[0]).toBeCloseTo(hexToLab(hex)[0], 6)
      expect(m.level).toBe(Math.round(lightnessToLevel(hexToLab(hex)[0])))
      expect(m.calibrated).toBe(false)
      expect(m.notes.some((n) => n.startsWith('Very dark hair'))).toBe(level === 2)
      expect(m.range.max - m.range.min).toBeGreaterThanOrEqual(1)
    }
    expect(lightnessToLevel(levelToLightness(7))).toBe(7)
  })

  it('the white card undoes a warm colour cast and under-exposure', () => {
    const truthHex = '#66452E'
    const { photo, render } = scene({ hair: [102, 69, 46], card: [245, 245, 245] })
    const warmDim = underLight(photo, [0.75, 0.55, 0.35]) // dim, orange indoor light
    const card = { x: 95 / W, y: 130 / H }

    const uncorrected = measureHairLevel(warmDim, render)
    expect(Math.abs(uncorrected.lab[0] - hexToLab(truthHex)[0])).toBeGreaterThan(5)

    const corrected = measureHairLevel(warmDim, render, { card })
    expect(corrected.calibrated).toBe(true)
    expect(corrected.lab[0]).toBeCloseTo(hexToLab(truthHex)[0], 0)
    expect(Math.abs(corrected.lab[1] - hexToLab(truthHex)[1])).toBeLessThan(1)
    expect(Math.abs(corrected.lab[2] - hexToLab(truthHex)[2])).toBeLessThan(1)
    expect(corrected.level).toBe(Math.round(lightnessToLevel(hexToLab(truthHex)[0])))
    expect(corrected.range.max - corrected.range.min).toBeLessThanOrEqual(1)
  })

  it('rejects card taps that aren’t a plain white card', () => {
    const { photo, render } = scene({ hair: [102, 69, 46], card: [245, 245, 245], other: [60, 40, 30] })
    const tap = (x: number, y: number) => () => measureHairLevel(photo, render, { card: { x: x / W, y: y / H } })
    const problem = (fn: () => unknown) => {
      try {
        fn()
      } catch (e) {
        return (e as CardError).problem
      }
      return null
    }
    expect(problem(tap(60, 20))).toBe('on-hair')
    expect(problem(tap(20, 120))).toBe('too-dark')
    expect(problem(tap(1, 1))).toBe('outside')
    expect(problem(tap(80, 130))).toBe('uneven') // straddles the card's edge
    const colourful = scene({ hair: [102, 69, 46], card: [250, 120, 120] })
    expect(problem(() => measureHairLevel(colourful.photo, colourful.render, { card: { x: 95 / W, y: 130 / H } }))).toBe('too-colourful')
  })

  it('drops the mask’s edge pixels, where hair blends with skin or background', () => {
    // Thin strands, 4 px wide: without erosion, blended edge pixels are half the mask.
    const strands = (x: number, y: number) => x >= 0 && y >= 0 && y < H / 2 && x % 8 < 4
    const { photo, render } = scene({ hair: [102, 69, 46], edge: [235, 235, 235], isHair: strands })
    expect(measureHairLevel(photo, render, { erode: 0 }).lab[0]).toBeGreaterThan(hexToLab('#66452E')[0] + 0.5)
    expect(measureHairLevel(photo, render).lab[0]).toBeCloseTo(hexToLab('#66452E')[0], 6)
  })

  it('reports no hair rather than guessing', () => {
    const { photo, render } = scene({ hair: [102, 69, 46], isHair: () => false })
    const m = measureHairLevel(photo, render)
    expect(m.status).toBe('no-hair')
    expect(m.notes[0]).toMatch(/too little hair/)
  })

  it('refuses a render that doesn’t match the photo', () => {
    const { photo } = scene({ hair: [102, 69, 46] })
    expect(() => measureHairLevel(photo, { width: 10, height: 10, data: new Uint8ClampedArray(400) })).toThrow(/same size/)
  })
})
