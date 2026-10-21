import { describe, expect, it } from 'vitest'
import { alphaFromChange, alphaFromMask, blur, finishHair, MIN_HAIR_PIXELS, refineHairAlpha } from './hairFinish'
import type { RgbaImage } from './hairLevelMeasure'

const W = 40
const H = 40
// Hair is the left half; the right half is "skin" that must never change.
const isHair = (x: number) => x < W / 2

function image(paint: (x: number, y: number) => [number, number, number]): RgbaImage {
  const data = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      ;[data[i], data[i + 1], data[i + 2]] = paint(x, y)
      data[i + 3] = 255
    }
  }
  return { width: W, height: H, data, channels: 4 }
}

const SKIN: [number, number, number] = [200, 150, 120]
// Original: dark brown hair with strand stripes (light and shade).
const original = image((x, y) => (isHair(x) ? (y % 4 < 2 ? [70, 45, 30] : [40, 26, 18]) : SKIN))
// YouCam-style render: the hair recoloured to one flat ash tone.
const flatAsh = image((x) => (isHair(x) ? [150, 145, 135] : SKIN))
const mask = image((x) => (isHair(x) ? [0, 255, 0] : SKIN))

const pixel = (img: RgbaImage, x: number, y: number) => {
  const i = (y * img.width + x) * 4
  return [img.data[i], img.data[i + 1], img.data[i + 2]]
}
const brightness = (p: number[]) => p[0] + p[1] + p[2]

describe('alphaFromMask', () => {
  it('marks the green pixels as hair and nothing else', () => {
    const alpha = alphaFromMask(mask)
    expect(alpha[5 * W + 5]).toBe(1)
    expect(alpha[5 * W + 35]).toBe(0)
  })
})

describe('alphaFromChange', () => {
  it('marks only the pixels the render changed', () => {
    const alpha = alphaFromChange(original, flatAsh)
    expect(alpha[10 * W + 5]).toBe(1)
    expect(alpha[10 * W + 35]).toBe(0)
  })
})

describe('finishHair', () => {
  const finished = finishHair(original, flatAsh, alphaFromMask(mask))!

  it('leaves everything outside the hair untouched', () => {
    expect(pixel(finished.image, 38, 20)).toEqual(SKIN)
  })

  it('takes the render’s lightness for the hair', () => {
    expect(finished.targetL).toBeGreaterThan(finished.hairL + 20)
  })

  it('brings back the original’s strand contrast that the flat render lost', () => {
    const light = pixel(finished.image, 6, 0) // a light stripe in the original
    const dark = pixel(finished.image, 6, 2) // a dark stripe
    expect(brightness(light) - brightness(dark)).toBeGreaterThan(30)
  })

  it('never shows more lift than the prediction allows', () => {
    const capped = finishHair(original, flatAsh, alphaFromMask(mask), { maxLiftL: 0 })!
    expect(capped.targetL).toBeCloseTo(capped.hairL, 5)
    expect(brightness(pixel(capped.image, 6, 1))).toBeLessThan(brightness(pixel(finished.image, 6, 1)))
  })

  it('returns null when there is too little hair to finish', () => {
    const none = new Float32Array(W * H)
    expect(MIN_HAIR_PIXELS).toBeGreaterThan(0)
    expect(finishHair(original, flatAsh, none)).toBeNull()
  })

  it('refuses images of different sizes', () => {
    const small = { ...original, width: 20, height: 80 }
    expect(() => finishHair(small, flatAsh, new Float32Array(W * H))).toThrow()
  })
})

describe('blur', () => {
  it('keeps the total and spreads a point', () => {
    const plane = new Float32Array(W * H)
    plane[20 * W + 20] = 1
    const out = blur(plane, W, H, 1.5)
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 4)
    expect(out[20 * W + 21]).toBeGreaterThan(0)
  })
})

describe('refineHairAlpha', () => {
  // 300×300: hair on the left, skin on the right, and loose strands (the same brown as the hair)
  // crossing the skin just past the hair, which YouCam's outline left out.
  const S = 300
  const strand = (x: number, y: number) => x >= 150 && x < 170 && y % 6 === 0
  const photo: RgbaImage = { width: S, height: S, data: new Uint8ClampedArray(S * S * 4), channels: 4 }
  const outline = new Float32Array(S * S)
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x
      const rgb = x < 150 || strand(x, y) ? (y % 4 < 2 ? [120, 85, 50] : [95, 66, 40]) : [225, 180, 160]
      photo.data.set([...rgb, 255], i * 4)
      outline[i] = x < 150 ? 1 : 0
    }
  }
  const refined = refineHairAlpha(photo, outline)

  it('adds loose strands next to the hair that look like the hair', () => {
    expect(refined[30 * S + 155]).toBeGreaterThan(0.5)
  })

  it('leaves the skin around them alone, and keeps the hair', () => {
    expect(refined[33 * S + 155]).toBeLessThan(0.3)
    expect(refined[30 * S + 280]).toBe(0)
    expect(refined[30 * S + 40]).toBe(1)
  })
})
