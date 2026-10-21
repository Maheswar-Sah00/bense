// Validation for the shade catalogue JSON (shared/catalogue/*.json). Used by the tests and
// tooling, not shipped to the browser: the app reads the already-checked data directly.
import { z } from 'zod'
import { isHairLevel } from './hairLevel'
import { TONE_FAMILIES } from './shadeCatalogue'

const hex = z.string().regex(/^#[0-9A-F]{6}$/, 'uppercase #RRGGBB')

/** Where a real product's code and name were read. Level and tone are read from the code; colour is still modelled. */
const BrandSchema = z.object({
  name: z.string().min(1),
  range: z.string().min(1),
  market: z.enum(['IN', 'US']),
  permanence: z.string().min(1),
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
export type ShadeData = z.infer<typeof ShadeSchema>

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

export type BrandCatalogue = z.infer<typeof BrandCatalogueSchema>

/** Validate the real-product file on its own (each shade must name its brand). */
export function parseBrandCatalogue(data: unknown): BrandCatalogue {
  return BrandCatalogueSchema.parse(data)
}
