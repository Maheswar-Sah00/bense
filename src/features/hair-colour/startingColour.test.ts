import { describe, expect, it } from 'vitest'
import { normaliseColourTones } from '../../../shared/domain/hairColourReading'
import type { LevelMeasurement } from '../../../shared/domain/hairLevelMeasure'
import { activeEstimate, resolveMethod, stepLevel } from './startingColour'

const auburn = normaliseColourTones({ color: { hair_color: '#B56637', hair_color_name: 'Auburn' } })

describe('starting colour confirmation', () => {
  it('labels a level with no reading as manual, never as analysis', () => {
    expect(resolveMethod(6, undefined)).toBe('manual')
  })

  it('distinguishes accepting the suggestion from adjusting it', () => {
    expect(resolveMethod(5, auburn)).toBe('suggested')
    expect(resolveMethod(6, auburn)).toBe('adjusted')
  })

  it('uses the corrected family when the reading was wrong', () => {
    expect(activeEstimate(auburn, 'Blonde')).toEqual({ min: 7, max: 10, suggested: 8 })
    expect(resolveMethod(8, auburn, 'Blonde')).toBe('corrected')
    expect(resolveMethod(9, auburn, 'Blonde')).toBe('adjusted')
  })

  it('prefers a lightness measurement over the colour family, and labels it as measured', () => {
    const measured = { status: 'measured', level: 8, range: { min: 7, max: 9 } } as unknown as LevelMeasurement
    expect(activeEstimate(auburn, undefined, measured)).toEqual({ min: 7, max: 9, suggested: 8 })
    expect(resolveMethod(8, auburn, undefined, measured)).toBe('measured')
    expect(resolveMethod(7, auburn, undefined, measured)).toBe('adjusted')
    expect(resolveMethod(8, undefined, undefined, measured)).toBe('measured')
    const noHair = { status: 'no-hair' } as unknown as LevelMeasurement
    expect(resolveMethod(5, auburn, undefined, noHair)).toBe('suggested')
  })

  it('steps one level within 1–10', () => {
    expect(stepLevel(5, 1)).toBe(6)
    expect(stepLevel(1, -1)).toBe(1)
    expect(stepLevel(10, 1)).toBe(10)
  })
})
