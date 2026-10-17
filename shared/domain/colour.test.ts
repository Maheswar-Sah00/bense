import { describe, expect, it } from 'vitest'
import { hexToLab, labToHex } from './colour'

describe('Lab conversion (matches tests/boxtruth.py)', () => {
  it('produces the same hex as the Python harness', () => {
    // Reference values printed by boxtruth.lab_to_hex.
    expect(labToHex([50, 0, 0])).toBe('#777777')
    expect(labToHex([75, 10, 30])).toBe('#DDB182')
    expect(labToHex([61, 0, 4])).toBe('#96938C')
  })

  it('round-trips within rounding error', () => {
    for (const hex of ['#291E0E', '#C38563', '#96938C', '#FFFFFF', '#000000']) {
      expect(labToHex(hexToLab(hex))).toBe(hex)
    }
  })
})
