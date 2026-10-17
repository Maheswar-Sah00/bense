import { describe, expect, it } from 'vitest'
import { CARE_DISCLAIMER, CARE_RULES, careTips, quantityNote } from './careGuidance'
import {
  normaliseDensity,
  normaliseFrizz,
  normaliseHairType,
  normaliseLength,
  type HairProfile,
} from './hairProfile'

function profile(parts: Partial<HairProfile>): HairProfile {
  const none = { status: 'missing-photos' as const, message: 'x' }
  return { type: none, frizz: none, length: none, density: none, measuredAt: '2026-10-15T00:00:00Z', notes: [], ...parts }
}

const ids = (tips: ReturnType<typeof careTips>) => tips.map((t) => t.id)

describe('careTips', () => {
  it('complete profile: curly, frizzy, long, low density, dyed', () => {
    const tips = careTips({
      colourTreated: true,
      profile: profile({
        type: normaliseHairType({ mapping: '3b to 3c', term: 'Medium to Tight Curls' }),
        frizz: normaliseFrizz({ mapping: 2, term: 'Frizzy' }),
        length: normaliseLength({ term: 'long hair' }),
        density: normaliseDensity({ mapping: '0.9', term: 'Low Density' }),
      }),
    })
    expect(ids(tips)).toEqual([
      'colour-safe-wash',
      'frizz-high',
      'curls-leave-in',
      'low-density-volume',
      'long-ends',
      'density-professional',
    ])
    expect(tips.find((t) => t.id === 'density-professional')!.kind).toBe('professional')
  })

  it('partial or failed profile: only uses what was measured', () => {
    const tips = careTips({
      profile: profile({
        type: { status: 'failed', message: 'angle' },
        frizz: normaliseFrizz({ mapping: 1, term: 'Slightly Frizzy' }),
      }),
    })
    expect(ids(tips)).toEqual(['frizz-light'])
    expect(careTips({ profile: profile({}) })).toEqual([])
    expect(careTips({})).toEqual([])
  })

  it('stays cosmetic and cautious', () => {
    const text = [...CARE_RULES.map((r) => r.text), CARE_DISCLAIMER].join(' ')
    expect(text).not.toMatch(/\b(porous|damaged hair|alopecia|you have|diagnos(e|is) (you|your))\b/i)
    expect(CARE_DISCLAIMER).toMatch(/can’t measure porosity, strand thickness, scalp health or damage/)
    for (const rule of CARE_RULES) expect(rule.text).toMatch(/may|often|can|tend|good habit|focus/i)
  })
})

describe('quantityNote', () => {
  it('points to the box instructions for long or dense hair, never a box count', () => {
    const long = quantityNote(profile({ length: normaliseLength({ term: 'above chest or longer' }) }))
    expect(long).toMatch(/Check the box instructions/)
    expect(long).not.toMatch(/\d+ box/)
    expect(quantityNote(profile({ density: normaliseDensity({ term: 'High Density', mapping: '2.9' }) }))).toMatch(/dense hair/)
    expect(quantityNote(profile({ length: normaliseLength({ term: 'ear length' }) }))).toBeNull()
    expect(quantityNote(undefined)).toBeNull()
  })
})
