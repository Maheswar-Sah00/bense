import { describe, expect, it } from 'vitest'
import raw from '../catalogue/shades.dev.json' with { type: 'json' }
import rawBrands from '../catalogue/shades.brands.json' with { type: 'json' }
import { parseBrandCatalogue, parseCatalogue } from './catalogueSchema'
import { CATALOGUE, findShade, modelTargetHex, SHADES, shadeLimitations, TONE_FAMILIES } from './shadeCatalogue'

const EXAMPLES = SHADES.filter((s) => !s.brand)
const REAL = SHADES.filter((s) => s.brand)

describe('shipped catalogue data', () => {
  it('passes validation: real products on their own, then merged with the examples', () => {
    const brands = parseBrandCatalogue(rawBrands)
    expect(() => parseCatalogue({ ...raw, groups: [...raw.groups, ...brands.groups], shades: [...raw.shades, ...brands.shades] })).not.toThrow()
    expect(CATALOGUE.shades.length).toBe(raw.shades.length + brands.shades.length)
  })
})

describe('shade catalogue data', () => {
  it('marks example shades illustrative, and every entry has provenance', () => {
    expect(CATALOGUE.status).toBe('illustrative')
    for (const shade of EXAMPLES) {
      expect(shade.id.startsWith('dev-')).toBe(true)
      expect(shade.provenance).toMatch(/illustrative/i)
      expect(shade.productLimitations).toEqual([]) // nothing product-verified yet
    }
  })

  it('covers every requested range', () => {
    const groups = new Set(EXAMPLES.map((s) => s.group))
    expect([...groups].sort()).toEqual([
      'ash-golden',
      'black-dark-brown',
      'blonde',
      'copper-warm',
      'medium-light-brown',
      'pearl-platinum',
      'red-plum',
    ])
    // Every tone family the engine knows is on the shelf, and every level from 1 to 10.
    expect(new Set(EXAMPLES.map((s) => s.tone)).size).toBe(TONE_FAMILIES.length)
    expect(new Set(EXAMPLES.map((s) => s.level)).size).toBe(10)
    expect(SHADES.some((s) => s.tone === 'ash')).toBe(true)
    expect(SHADES.some((s) => s.tone === 'golden')).toBe(true)
    expect(SHADES.some((s) => s.tone === 'copper')).toBe(true)
    expect(Math.min(...SHADES.map((s) => s.level))).toBe(1)
    expect(Math.max(...SHADES.map((s) => s.level))).toBeGreaterThanOrEqual(9)
  })

  it('stores target colours that match the documented colour model', () => {
    for (const shade of SHADES) expect(shade.targetHex, shade.id).toBe(modelTargetHex(shade.level, shade.tone))
  })

  it('warns about green on every ash shade and lift limits on lighter shades', () => {
    for (const shade of SHADES) {
      if (shade.tone === 'ash') expect(shade.limitationIds).toContain('ash-green')
      if (shade.level >= 6) expect(shade.limitationIds).toContain('lift-limit')
    }
  })

  it('real products are anonymised, with a check date and how level and tone were read', () => {
    expect(REAL.length).toBeGreaterThan(150)
    expect(new Set(REAL.map((s) => s.brand!.name))).toEqual(new Set(['Brand A', 'Brand B']))
    for (const shade of REAL) {
      expect(shade.brand!.range, shade.id).toMatch(/^Range \d+$/)
      expect(JSON.stringify(shade), shade.id).not.toMatch(/garnier|or[eé]al|https?:/i)
      expect(shade.brand!.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(shade.provenance).toMatch(/^Real product listed on the brand’s website\. Level from .+; tone from .+/)
      expect(shade.productLimitations).toEqual([])
      expect(shade.id.startsWith('dev-')).toBe(false)
    }
  })

  it('resolves limitations with their sources', () => {
    const ash = findShade('dev-7-1-ash-medium-blonde')!
    const green = shadeLimitations(ash).find((l) => l.id === 'ash-green')!
    expect(green.sources[0].url).toMatch(/^https:/)
  })
})

describe('lookup', () => {
  it('finds by stable id and rejects missing or unknown ids', () => {
    expect(findShade('dev-7-1-ash-medium-blonde')).toMatchObject({ code: '7.1', level: 7, tone: 'ash' })
    expect(findShade('7.1')).toBeUndefined() // old-style id from before the catalogue
    expect(findShade(undefined)).toBeUndefined()
  })
})

describe('validation', () => {
  const clone = () => JSON.parse(JSON.stringify(raw))

  it('rejects broken references and bad values', () => {
    const dup = clone()
    dup.shades.push(dup.shades[0])
    expect(() => parseCatalogue(dup)).toThrow(/duplicate shade id/)

    const badLimit = clone()
    badLimit.shades[0].limitationIds.push('nope')
    expect(() => parseCatalogue(badLimit)).toThrow(/unknown limitation/)

    const badLevel = clone()
    badLevel.shades[0].level = 11
    expect(() => parseCatalogue(badLevel)).toThrow(/level/)

    const badHex = clone()
    badHex.shades[0].targetHex = 'brown'
    expect(() => parseCatalogue(badHex)).toThrow()

    const unverified = clone()
    unverified.shades[0].productLimitations.push({ text: 'claim', sourceIds: [] })
    expect(() => parseCatalogue(unverified)).toThrow()
  })
})
