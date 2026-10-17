import { describe, expect, it } from 'vitest'
import { isHairLevel, toHairLevel } from './hairLevel'

describe('hair level', () => {
  it('accepts whole levels 1 to 10 only', () => {
    expect(isHairLevel(1)).toBe(true)
    expect(isHairLevel(10)).toBe(true)
    expect(isHairLevel(0)).toBe(false)
    expect(isHairLevel(5.5)).toBe(false)
    expect(isHairLevel('5')).toBe(false)
  })

  it('rounds and clamps measured values', () => {
    expect(toHairLevel(7.6)).toBe(8)
    expect(toHairLevel(-3)).toBe(1)
    expect(toHairLevel(14)).toBe(10)
  })
})
