// Hair profile from YouCam Hair Type, Frizziness, Length and Density Detection.
// Values and categories follow docs/youcam-api/ai_hair_*_detection.yaml exactly.
// No confidence scores are invented: the APIs return categories (and, for density, a 0–3 score).

// ---------------------------------------------------------------- documented values

export const HAIR_TYPE_MAPPINGS = [
  '1 to 2a',
  '2a to 2b',
  '2b to 2c',
  '2c to 3a',
  '3a to 3b',
  '3b to 3c',
  '3c to 4a',
  '4a to 4b',
  '4b to 4c',
] as const
export const HAIR_TYPE_TERMS = [
  'Straight to Slight Wavy',
  'Slight to Medium Wavy',
  'Medium to Thick Wavy',
  'Thick Wavy to Loose Curls',
  'Loose to Medium Curls',
  'Medium to Tight Curls',
  'Tight Curls to Kinky Soft',
  'Kinky Soft to Coily',
  'Coily to Extremely Coily',
] as const
export const FRIZZ_TERMS = ['Not Frizzy', 'Slightly Frizzy', 'Frizzy', 'Extreme Frizzy'] as const
export const LENGTH_TERMS = [
  'above the ears',
  'ear length',
  'ear length or longer',
  'short hair',
  'short hair or longer',
  'above chest',
  'above chest or longer',
  'long hair',
] as const
export const DENSITY_TERMS = ['Extremely Low Density', 'Low Density', 'Medium Density', 'High Density'] as const

export type HairMetric = 'type' | 'frizz' | 'length' | 'density'
export const HAIR_METRICS: HairMetric[] = ['type', 'frizz', 'length', 'density']

/** Documented cost per successful task. */
export const METRIC_UNITS: Record<HairMetric, number> = { type: 2, frizz: 2, length: 2, density: 1 }

// ---------------------------------------------------------------- normalised results

export interface HairTypeValue {
  mapping: (typeof HAIR_TYPE_MAPPINGS)[number]
  term: (typeof HAIR_TYPE_TERMS)[number]
  /** Position 0–8 along the documented range list (straight → extremely coily). */
  index: number
  /** The two curl categories the range spans, e.g. "2a" and "2b". */
  from: string
  to: string
}

export interface FrizzValue {
  mapping: 0 | 1 | 2 | 3
  term: (typeof FRIZZ_TERMS)[number]
}

export interface LengthValue {
  term: (typeof LENGTH_TERMS)[number]
  /** Position 0–7, shortest to longest. */
  index: number
  /** "or longer" results are a lower bound, not an exact band. */
  lowerBoundOnly: boolean
}

export interface DensityValue {
  term: (typeof DENSITY_TERMS)[number]
  /** Documented 1–4 level matching the term. */
  level: 1 | 2 | 3 | 4
  /** The 0–3 score exactly as returned (a float sent as a string), if present. */
  score: number | null
}

export type MeasurementStatus =
  | 'measured'
  | 'unsupported' // the hair setup would give a misleading result, so it wasn't run
  | 'missing-photos'
  | 'failed'
  | 'inconclusive' // the API answered with something outside the documented values

export interface Measurement<T> {
  status: MeasurementStatus
  value?: T
  /** Plain-language reason when not measured. */
  message?: string
  /** Engine error code from YouCam, if any. */
  errorCode?: string
  /** Raw value kept when inconclusive. */
  raw?: unknown
}

export interface HairProfile {
  type: Measurement<HairTypeValue>
  frizz: Measurement<FrizzValue>
  length: Measurement<LengthValue>
  density: Measurement<DensityValue>
  measuredAt: string
  /** Notes that apply to the whole profile, e.g. short-hair caveats. */
  notes: string[]
}

// ---------------------------------------------------------------- normalisers

const inconclusive = (raw: unknown, what: string): Measurement<never> => ({
  status: 'inconclusive',
  raw,
  message: `The ${what} result wasn’t one of the documented values, so we can’t show it.`,
})

export function normaliseHairType(raw: unknown): Measurement<HairTypeValue> {
  const r = raw as { mapping?: unknown; term?: unknown } | null | undefined
  const index = HAIR_TYPE_MAPPINGS.indexOf(r?.mapping as HairTypeValue['mapping'])
  if (index < 0 || r?.term !== HAIR_TYPE_TERMS[index]) return inconclusive(raw, 'hair type')
  const [from, to] = HAIR_TYPE_MAPPINGS[index].split(' to ')
  return { status: 'measured', value: { mapping: HAIR_TYPE_MAPPINGS[index], term: HAIR_TYPE_TERMS[index], index, from, to } }
}

export function normaliseFrizz(raw: unknown): Measurement<FrizzValue> {
  const r = raw as { mapping?: unknown; term?: unknown } | null | undefined
  const mapping = Number(r?.mapping)
  if (![0, 1, 2, 3].includes(mapping) || r?.term !== FRIZZ_TERMS[mapping]) return inconclusive(raw, 'frizz')
  return { status: 'measured', value: { mapping: mapping as FrizzValue['mapping'], term: FRIZZ_TERMS[mapping] } }
}

export function normaliseLength(raw: unknown): Measurement<LengthValue> {
  const r = raw as { term?: unknown } | null | undefined
  const index = LENGTH_TERMS.indexOf(r?.term as LengthValue['term'])
  if (index < 0) return inconclusive(raw, 'length')
  const term = LENGTH_TERMS[index]
  return { status: 'measured', value: { term, index, lowerBoundOnly: term.endsWith('or longer') } }
}

export function normaliseDensity(raw: unknown): Measurement<DensityValue> {
  const r = raw as { mapping?: unknown; term?: unknown } | null | undefined
  const index = DENSITY_TERMS.indexOf(r?.term as DensityValue['term'])
  if (index < 0) return inconclusive(raw, 'density')
  const parsed = typeof r?.mapping === 'string' || typeof r?.mapping === 'number' ? Number(r.mapping) : NaN
  const score = Number.isFinite(parsed) && parsed >= 0 && parsed <= 3 ? parsed : null
  return { status: 'measured', value: { term: DENSITY_TERMS[index], level: (index + 1) as DensityValue['level'], score } }
}

// ---------------------------------------------------------------- what to measure

export type HairSetup = 'loose' | 'short' | 'tied' | 'protective' | 'covered'
export const HAIR_SETUPS: HairSetup[] = ['loose', 'short', 'tied', 'protective', 'covered']

export type AnalysisView = 'front' | 'left45' | 'right45' | 'top'

/** Views each measurement needs (YouCam: type/frizz = 3 angles, length = front, density = head lowered). */
export const METRIC_VIEWS: Record<HairMetric, AnalysisView[]> = {
  type: ['front', 'left45', 'right45'],
  frizz: ['front', 'left45', 'right45'],
  length: ['front'],
  density: ['top'],
}

/** Measurements that would mislead for a hair setup, with the reason shown to the user. */
const UNSUPPORTED: Record<HairSetup, Partial<Record<HairMetric, string>>> = {
  loose: {},
  short: {},
  tied: {
    type: 'Hair type needs your hair down. Tied hair hides its natural pattern.',
    frizz: 'Frizz needs your hair down. Tied hair hides the lengths.',
    length: 'Length can’t be measured while your hair is tied up.',
  },
  protective: {
    type: 'Braids, locs and twists change how hair looks, so its natural type can’t be read.',
    frizz: 'Frizz can’t be read on braids, locs or twists.',
    density: 'Parts between braids or locs would make density look lower than it is.',
  },
  covered: {
    type: 'We can’t measure natural hair under a wig, scarf or covering.',
    frizz: 'We can’t measure natural hair under a wig, scarf or covering.',
    length: 'We can’t measure natural hair under a wig, scarf or covering.',
    density: 'We can’t measure natural hair under a wig, scarf or covering.',
  },
}

export interface MeasurementPlanItem {
  metric: HairMetric
  run: boolean
  reason?: { status: 'unsupported' | 'missing-photos'; message: string }
}

/** `only` limits the run to some metrics, e.g. retrying the ones that failed. */
export function measurementPlan(
  setup: HairSetup,
  available: Partial<Record<AnalysisView, unknown>>,
  only?: readonly HairMetric[],
): MeasurementPlanItem[] {
  return HAIR_METRICS.map((metric) => {
    if (only && !only.includes(metric)) {
      return { metric, run: false, reason: { status: 'unsupported', message: 'Not requested in this run.' } }
    }
    const unsupported = UNSUPPORTED[setup][metric]
    if (unsupported) return { metric, run: false, reason: { status: 'unsupported', message: unsupported } }
    const missing = METRIC_VIEWS[metric].filter((view) => !available[view])
    if (missing.length) {
      return {
        metric,
        run: false,
        reason: { status: 'missing-photos', message: `Needs the ${missing.map(viewName).join(', ')} photo${missing.length > 1 ? 's' : ''}.` },
      }
    }
    return { metric, run: true }
  })
}

export function setupNotes(setup: HairSetup): string[] {
  if (setup === 'short') {
    return ['Short hair can be harder to classify. Type and frizz results may be less reliable.']
  }
  if (setup === 'protective') return ['Length describes your current style, not your natural hair.']
  return []
}

function viewName(view: AnalysisView): string {
  return { front: 'front', left45: 'left-side', right45: 'right-side', top: 'top' }[view]
}

export function plannedUnits(plan: MeasurementPlanItem[]): number {
  return plan.filter((p) => p.run).reduce((sum, p) => sum + METRIC_UNITS[p.metric], 0)
}
