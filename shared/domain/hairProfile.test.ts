import { describe, expect, it } from 'vitest'
import {
  measurementPlan,
  normaliseDensity,
  normaliseFrizz,
  normaliseHairType,
  normaliseLength,
  plannedUnits,
} from './hairProfile'

describe('normalisers (documented values only)', () => {
  it('reads hair type ranges', () => {
    expect(normaliseHairType({ mapping: '2a to 2b', term: 'Slight to Medium Wavy' })).toEqual({
      status: 'measured',
      value: { mapping: '2a to 2b', term: 'Slight to Medium Wavy', index: 1, from: '2a', to: '2b' },
    })
    // Mismatched pair or unknown value: kept raw, marked inconclusive.
    expect(normaliseHairType({ mapping: '2a to 2b', term: 'Coily to Extremely Coily' }).status).toBe('inconclusive')
    expect(normaliseHairType({ mapping: '5 to 6', term: 'x' })).toMatchObject({ status: 'inconclusive', raw: { mapping: '5 to 6' } })
    expect(normaliseHairType(undefined).status).toBe('inconclusive')
  })

  it('reads frizz 0–3 with its term', () => {
    expect(normaliseFrizz({ mapping: 1, term: 'Slightly Frizzy' }).value).toEqual({ mapping: 1, term: 'Slightly Frizzy' })
    expect(normaliseFrizz({ mapping: 4, term: 'Frizzy' }).status).toBe('inconclusive')
  })

  it('reads length bands and flags lower bounds', () => {
    expect(normaliseLength({ term: 'above chest or longer' }).value).toEqual({
      term: 'above chest or longer',
      index: 6,
      lowerBoundOnly: true,
    })
    expect(normaliseLength({ term: 'long hair' }).value!.lowerBoundOnly).toBe(false)
    expect(normaliseLength({ term: 'waist' }).status).toBe('inconclusive')
  })

  it('reads density term, level and the 0–3 score sent as a string', () => {
    expect(normaliseDensity({ mapping: '2.16', term: 'Medium Density' }).value).toEqual({
      term: 'Medium Density',
      level: 3,
      score: 2.16,
    })
    expect(normaliseDensity({ mapping: 'n/a', term: 'High Density' }).value!.score).toBeNull()
    expect(normaliseDensity({ term: 'Thick' }).status).toBe('inconclusive')
  })
})

describe('measurementPlan', () => {
  const all = { front: 1, left45: 1, right45: 1, top: 1 }

  it('runs everything for loose hair with all photos (7 units)', () => {
    const plan = measurementPlan('loose', all)
    expect(plan.every((p) => p.run)).toBe(true)
    expect(plannedUnits(plan)).toBe(7)
  })

  it('skips what tied hair would distort but keeps density', () => {
    const plan = measurementPlan('tied', all)
    expect(plan.filter((p) => p.run).map((p) => p.metric)).toEqual(['density'])
    expect(plan.find((p) => p.metric === 'length')!.reason!.status).toBe('unsupported')
  })

  it('handles braids/locs and coverings honestly', () => {
    expect(measurementPlan('protective', all).filter((p) => p.run).map((p) => p.metric)).toEqual(['length'])
    expect(measurementPlan('covered', all).some((p) => p.run)).toBe(false)
  })

  it('reports missing photos per measurement', () => {
    const plan = measurementPlan('loose', { front: 1, top: 1 })
    expect(plan.find((p) => p.metric === 'type')!.reason).toEqual({
      status: 'missing-photos',
      message: 'Needs the left-side, right-side photos.',
    })
    expect(plan.filter((p) => p.run).map((p) => p.metric)).toEqual(['length', 'density'])
  })
})
