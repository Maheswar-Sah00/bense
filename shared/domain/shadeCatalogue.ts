// Shade catalogue: model and lookup. The data lives in shared/catalogue/*.json;
// nothing here or in the UI hard-codes shades. shades.dev.json holds illustrative example shades;
// shades.brands.json holds real products listed on the brands' own websites, with brand, product
// and shade names left out (shown as Brand A / Brand B, Range 1, …).
import rawBrands from '../catalogue/shades.brands.json' with { type: 'json' }
import rawCatalogue from '../catalogue/shades.dev.json' with { type: 'json' }
import { labToHex, type Lab } from './colour'
import type { BrandCatalogue, Catalogue, ShadeData } from './catalogueSchema'
import type { HairLevel } from './hairLevel'

export type { Catalogue }

export const TONE_FAMILIES = ['neutral', 'ash', 'violet', 'mocha', 'golden', 'copper', 'red', 'mahogany'] as const
export type ToneFamily = (typeof TONE_FAMILIES)[number]

export const TONE_LABELS: Record<ToneFamily, string> = {
  neutral: 'Natural',
  ash: 'Ash',
  violet: 'Pearl',
  mocha: 'Mocha',
  golden: 'Golden',
  copper: 'Copper',
  red: 'Red',
  mahogany: 'Mahogany',
}

/** Tones that counter warmth (and so can look muddy over exposed warm pigment) rather than add to it. */
export const COOL_TONES: readonly ToneFamily[] = ['ash', 'violet', 'mocha']

export const MARKETS = { IN: 'India', US: 'USA' } as const
export type Market = keyof typeof MARKETS

export interface Shade extends Omit<ShadeData, 'level'> {
  level: HairLevel
}
export interface Limitation {
  id: string
  text: string
  sources: { id: string; title: string; url: string | null }[]
}

// The JSON is checked against catalogueSchema.ts by the tests (shadeCatalogue.test.ts), so the
// app doesn't ship the validator or re-check the same data on every phone at start-up.
/** Real products. */
export const BRAND_CATALOGUE = rawBrands as unknown as BrandCatalogue

export const CATALOGUE = {
  ...rawCatalogue,
  groups: [...rawCatalogue.groups, ...BRAND_CATALOGUE.groups],
  shades: [...rawCatalogue.shades, ...BRAND_CATALOGUE.shades],
} as unknown as Catalogue
export const SHADES = CATALOGUE.shades as Shade[]

export function findShade(id: string | undefined): Shade | undefined {
  return id ? SHADES.find((shade) => shade.id === id) : undefined
}

export function shadeLimitations(shade: Shade, catalogue: Catalogue = CATALOGUE): Limitation[] {
  return shade.limitationIds.map((id) => ({
    id,
    text: catalogue.limitations[id].text,
    sources: catalogue.limitations[id].sourceIds.map((sid) => ({ id: sid, ...catalogue.sources[sid] })),
  }))
}

// Tone a* and b* used to derive target colours. Started from tests/boxtruth.py
// (neutral 3/12, ash 0/4, golden 5/25, copper 20/28); chroma raised on 2026-10-15 after live
// Hair Color renders showed the original ash rendering as grey rather than ash blonde.
// Pearl, mocha, red and mahogany were added on 2026-10-16 as modelled values (uncalibrated).
export const TONE_AB: Record<ToneFamily, readonly [number, number]> = {
  neutral: [4, 16],
  ash: [1, 9],
  violet: [6, 2],
  mocha: [5, 10],
  golden: [6, 28],
  copper: [20, 30],
  red: [32, 22],
  mahogany: [24, 8],
}

/** Uncalibrated level → lightness band from the same model. */
export const levelToLightness = (level: HairLevel) => 12 + (level - 1) * 7

export function modelTargetLab(level: HairLevel, tone: ToneFamily): Lab {
  return [levelToLightness(level), ...TONE_AB[tone]]
}

export const modelTargetHex = (level: HairLevel, tone: ToneFamily) => labToHex(modelTargetLab(level, tone))
