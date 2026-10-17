// Shade catalogue: model, validation and lookup. The data lives in shared/catalogue/*.json;
// nothing here or in the UI hard-codes shades. shades.dev.json holds illustrative example shades;
// shades.brands.json holds real products listed on the brands' own websites.
import { z } from 'zod'
import rawBrands from '../catalogue/shades.brands.json' with { type: 'json' }
import rawCatalogue from '../catalogue/shades.dev.json' with { type: 'json' }
import { labToHex, type Lab } from './colour'
import { isHairLevel, type HairLevel } from './hairLevel'

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

const hex = z.string().regex(/^#[0-9A-F]{6}$/, 'uppercase #RRGGBB')

export const MARKETS = { IN: 'India', US: 'USA' } as const
export type Market = keyof typeof MARKETS

/** Where a real product's code and name were read. Level and tone are read from the code; colour is still modelled. */
const BrandSchema = z.object({
  name: z.string().min(1),
  range: z.string().min(1),
  market: z.enum(['IN', 'US']),
  permanence: z.string().min(1),
  url: z.url(),
  checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const ShadeSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  code: z.string().min(1),
  name: z.string().min(1),
  level: z.number().refine(isHairLevel, 'level must be a whole number 1–10'),
  tone: z.enum(TONE_FAMILIES),
  group: z.string(),
  targetHex: hex,
  swatchHex: hex,
  limitationIds: z.array(z.string()),
  /** Only limitations verified against a real product. Empty for illustrative entries. */
  productLimitations: z.array(z.object({ text: z.string(), sourceIds: z.array(z.string()).min(1) })),
  provenance: z.string().min(1),
  brand: BrandSchema.optional(),
})

const CatalogueSchema = z
  .object({
    catalogueVersion: z.string(),
    status: z.enum(['illustrative', 'verified']),
    notice: z.string(),
    colourModel: z.object({ description: z.string(), status: z.string(), sourceIds: z.array(z.string()) }),
    sources: z.record(z.string(), z.object({ title: z.string(), url: z.url().nullable() })),
    limitations: z.record(z.string(), z.object({ text: z.string(), sourceIds: z.array(z.string()).min(1) })),
    groups: z.array(z.object({ id: z.string(), label: z.string() })).min(1),
    shades: z.array(ShadeSchema).min(1),
  })
  .superRefine((c, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message })
    const ids = new Set<string>()
    const groupIds = new Set(c.groups.map((g) => g.id))
    const sourceRefs = [
      ...c.colourModel.sourceIds,
      ...Object.values(c.limitations).flatMap((l) => l.sourceIds),
      ...c.shades.flatMap((s) => s.productLimitations.flatMap((l) => l.sourceIds)),
    ]
    for (const ref of sourceRefs) if (!c.sources[ref]) fail(`unknown source "${ref}"`)
    for (const shade of c.shades) {
      if (ids.has(shade.id)) fail(`duplicate shade id "${shade.id}"`)
      ids.add(shade.id)
      if (!groupIds.has(shade.group)) fail(`shade "${shade.id}" has unknown group "${shade.group}"`)
      for (const id of shade.limitationIds) if (!c.limitations[id]) fail(`shade "${shade.id}" has unknown limitation "${id}"`)
    }
  })

export type Catalogue = z.infer<typeof CatalogueSchema>
type ShadeData = z.infer<typeof ShadeSchema>
export interface Shade extends Omit<ShadeData, 'level'> {
  level: HairLevel
}
export interface Limitation {
  id: string
  text: string
  sources: { id: string; title: string; url: string | null }[]
}

/** Validate catalogue data. Throws with every problem listed if it's malformed. */
export function parseCatalogue(data: unknown): Catalogue {
  return CatalogueSchema.parse(data)
}

const BrandCatalogueSchema = z.object({
  catalogueVersion: z.string(),
  checkedAt: z.string(),
  notice: z.string(),
  groups: z.array(z.object({ id: z.string(), label: z.string() })),
  shades: z.array(ShadeSchema.extend({ brand: BrandSchema })),
})

/** Real products. Validated on their own, then checked again with the examples (shared ids, groups, limitations). */
export const BRAND_CATALOGUE = BrandCatalogueSchema.parse(rawBrands)

export const CATALOGUE = parseCatalogue({
  ...rawCatalogue,
  groups: [...rawCatalogue.groups, ...BRAND_CATALOGUE.groups],
  shades: [...rawCatalogue.shades, ...BRAND_CATALOGUE.shades],
})
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
