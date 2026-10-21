import { describe, expect, it } from 'vitest'
import { hexToLab } from './colour'
import { measureHairLevel, type RgbaImage } from './hairLevelMeasure'
import { classifyHairLook, isDyedLook } from './hairLook'
import { toHairLevel } from './hairLevel'

/** Hair pixels around a median Lab, with strand-to-strand spread (deterministic). */
function hair(parts: { lab: [number, number, number]; share: number }[], n = 2000, jitter = 4) {
  const L: number[] = []
  const A: number[] = []
  const B: number[] = []
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 2 * jitter
  for (const part of parts) {
    for (let i = 0; i < Math.round(n * part.share); i++) {
      L.push(part.lab[0] + rand() * 2)
      A.push(part.lab[1] + rand())
      B.push(part.lab[2] + rand())
    }
  }
  const median = (v: number[]) => [...v].sort((x, y) => x - y)[v.length >> 1]
  const lab = [median(L), median(A), median(B)] as [number, number, number]
  return classifyHairLook(L, A, B, lab, toHairLevel((lab[0] - 12) / 7 + 1))
}
const one = (lab: [number, number, number]) => hair([{ lab, share: 1 }])

describe('classifyHairLook', () => {
  // Medians measured on the test photos (YouCam mask, original pixels).
  it('names natural hair by its level, and red hair as red', () => {
    expect(one([11, 6.3, 4.9])).toMatchObject({ kind: 'natural', name: 'Black' }) // brown3, very dark
    expect(one([12.9, 2.3, -3.8])).toMatchObject({ kind: 'natural', name: 'Black' }) // black1, cool cast
    expect(one([31.6, 7, 10])).toMatchObject({ kind: 'natural', name: 'Medium brown' })
    expect(one([68.6, 6.2, 26.2])).toMatchObject({ kind: 'natural', name: 'Very light blonde' }) // blonde3
    expect(one([38, 21.6, 27.3])).toMatchObject({ kind: 'natural', name: 'Copper red' }) // red1
    expect(one([30, 22, 18])).toMatchObject({ kind: 'natural', name: 'Auburn' })
    expect(one([66, 20, 26])).toMatchObject({ kind: 'natural', name: 'Strawberry blonde' })
  })

  it('reads purple hair as purple dye, not brown (the live case: L* 31.7, chroma 57, hue 322°)', () => {
    const look = one([31.7, 45.2, -34.9])
    expect(look).toMatchObject({ kind: 'vivid', name: 'Purple', colour: 'purple' })
    expect(look.dyedShare).toBeGreaterThan(0.95)
    expect(isDyedLook(look)).toBe(true)
  })

  it('names the common fashion colours', () => {
    expect(one([55, 70, -5]).name).toBe('Pink') // hot pink
    expect(one([80, 25, 3]).name).toBe('Pink') // pastel pink
    expect(one([41, 64, 30]).name).toBe('Red') // cherry red, hue 25°
    expect(one([24, 40, 14]).name).toBe('Burgundy')
    expect(one([40, 20, -55]).name).toBe('Blue')
    expect(one([70, -5, -25]).name).toBe('Pastel blue')
    expect(one([55, -45, -8]).name).toBe('Teal')
    expect(one([50, -50, 30]).name).toBe('Green')
    expect(one([68, 25, -22]).name).toBe('Pastel purple')
    expect(one([47, 39, 48]).name).toBe('Bright copper') // copper box dye, chroma 62
    expect(one([47, 20, -66]).name).toBe('Blue') // royal blue, 292°
    expect(one([30, 55, -42]).name).toBe('Purple') // 323°
    expect(one([60, -30, 15]).name).toBe('Green')
  })

  it('finds streaks and two-colour hair', () => {
    const streaks = hair([
      { lab: [25, 5, 8], share: 0.75 },
      { lab: [55, 70, -5], share: 0.25 },
    ])
    expect(streaks).toMatchObject({ kind: 'streaks', name: 'Dark brown with pink streaks', colour: 'pink' })
    const split = hair([
      { lab: [55, 70, -5], share: 0.5 },
      { lab: [40, 20, -55], share: 0.5 },
    ])
    expect(split.kind).toBe('vivid')
    expect(split.name).toMatch(/^(Pink and blue|Blue and pink)$/)
  })

  it('reads grey as grey', () => {
    expect(one([62, 0.5, 2])).toMatchObject({ kind: 'grey', name: 'Grey or white' })
  })

  it('doesn’t call natural hair dyed from a few coloured pixels or a light’s tint', () => {
    // 8% stray background or reflection pixels on dark brown hair.
    const stray = hair([
      { lab: [22, 4, 6], share: 0.92 },
      { lab: [70, 20, -30], share: 0.08 },
    ])
    expect(stray.kind).toBe('natural')
    // Dark hair under a blue screen or shade: cool, but far too little chroma to be dye.
    expect(one([15, 1, -9]).kind).toBe('natural')
    // Natural red at its most colourful in testing (chroma 41).
    expect(one([45, 25, 32]).kind).toBe('natural')
  })
})

describe('measureHairLevel names the colour', () => {
  it('gives purple hair its colour, the dye note, and its depth level', () => {
    const W = 80
    const H = 100
    const purple = [1, 3, 5].map((i) => parseInt('#7A2A8F'.slice(i, i + 2), 16))
    const photo = new Uint8ClampedArray(W * H * 4)
    const render = new Uint8ClampedArray(W * H * 4)
    for (let i = 0; i < W * H; i++) {
      const isHair = i < (W * H) / 2
      photo.set([...(isHair ? purple : [214, 170, 150]), 255], i * 4)
      render.set(isHair ? [20, 230, 30, 255] : [214, 170, 150, 255], i * 4)
    }
    const m = measureHairLevel({ width: W, height: H, data: photo } as RgbaImage, { width: W, height: H, data: render } as RgbaImage)
    expect(m.look).toMatchObject({ kind: 'vivid', name: 'Purple' })
    expect(m.level).toBe(toHairLevel((hexToLab('#7A2A8F')[0] - 12) / 7 + 1))
    expect(m.notes[0]).toMatch(/^Purple isn’t a natural hair colour, so this is dye/)
  })
})
