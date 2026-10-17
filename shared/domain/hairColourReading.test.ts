import { describe, expect, it } from 'vitest'
import { levelEstimateFor, normaliseColourTones, normaliseHex } from './hairColourReading'

describe('normaliseColourTones', () => {
  it('keeps the raw API values and gives a level range, not a single measured level', () => {
    const reading = normaliseColourTones({
      color: { hair_color: '#42280e', hair_color_name: 'Brown' },
      face_quality: { has_face: true, lighting: 'good' },
    })
    expect(reading).toMatchObject({
      apiHairColorName: 'Brown',
      apiHairColorHex: '#42280e',
      normalizedHex: '#42280E',
      family: 'Brown',
      levelEstimate: { min: 3, max: 6, suggested: 4 },
      uncertainty: 'category-only',
    })
  })

  it('reports missing hair colour instead of guessing', () => {
    const reading = normaliseColourTones({ color: { eye_color: '#000000' } as never })
    expect(reading.uncertainty).toBe('no-hair-detected')
    expect(reading.levelEstimate).toBeNull()
    expect(reading.normalizedHex).toBeNull()
  })

  it('does not infer a level for grey hair', () => {
    const reading = normaliseColourTones({ color: { hair_color: '#808080', hair_color_name: 'Grey/White' } })
    expect(reading.uncertainty).toBe('grey')
    expect(reading.levelEstimate).toBeNull()
  })

  it('keeps undocumented names but marks them', () => {
    const reading = normaliseColourTones({ color: { hair_color: '#123456', hair_color_name: 'Teal' } })
    expect(reading).toMatchObject({ apiHairColorName: 'Teal', family: null, uncertainty: 'unknown-category' })
  })

  it('flags poor lighting from face_quality', () => {
    const reading = normaliseColourTones({
      color: { hair_color: '#000000', hair_color_name: 'Black' },
      face_quality: { lighting: 'bad' },
    })
    expect(reading.notes.join(' ')).toContain('Lighting was rated "bad"')
  })
})

describe('helpers', () => {
  it('normalises only valid hex', () => {
    expect(normaliseHex(' #faf0be ')).toBe('#FAF0BE')
    expect(normaliseHex('#fff')).toBeNull()
    expect(normaliseHex(42)).toBeNull()
  })

  it('maps every family except grey to a sane range', () => {
    for (const family of ['Black', 'Brown', 'Auburn', 'Red', 'Blonde'] as const) {
      const est = levelEstimateFor(family)!
      expect(est.min).toBeLessThanOrEqual(est.suggested)
      expect(est.suggested).toBeLessThanOrEqual(est.max)
    }
    expect(levelEstimateFor('Grey/White')).toBeNull()
  })
})
