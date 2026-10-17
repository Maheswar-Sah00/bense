// Parity with the Python harness on a REAL recorded pair: YouCam's docs sample photo and its live
// Hair Color #00FF00 render (see the fixture's JSON for provenance). No API calls.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { measureHairLevel, type RgbaImage } from '../shared/domain/hairLevelMeasure'

const dir = new URL('./youcam/__fixtures__/level-mask/', import.meta.url)
const meta = JSON.parse(readFileSync(new URL('docs-sample.json', dir), 'utf8'))
const load = (name: string): RgbaImage => ({
  width: meta.width,
  height: meta.height,
  channels: 3,
  data: new Uint8Array(gunzipSync(readFileSync(new URL(name, dir)))),
})
const photo = load('docs-sample-256.rgb.gz')
const render = load('docs-sample-mask-256.rgb.gz')

describe('hair level measurement on a recorded live YouCam mask', () => {
  it('matches tests/boxtruth.py exactly with the harness settings', () => {
    const m = measureHairLevel(photo, render, { erode: 0, skipGreenOriginal: false })
    expect(m.hairPixels).toBe(meta.python.hairPixels)
    m.lab.forEach((v, i) => expect(v).toBeCloseTo(meta.python.medianLab[i], 2))
  })

  it('app settings (edge erosion) stay within 0.5 L* and read the blonde sample as level 8', () => {
    const m = measureHairLevel(photo, render)
    expect(Math.abs(m.lab[0] - meta.python.medianLab[0])).toBeLessThan(0.5)
    expect(m.level).toBe(8)
    expect(m.range).toEqual({ min: 7, max: 9 })
    expect(m.hairShare).toBeGreaterThan(0.3)
  })
})
