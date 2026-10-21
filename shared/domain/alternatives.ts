// Closer shades and the professional recommendation, worked out by running the same prediction
// engine over the catalogue. No extra rules: a shade is suggested only if the engine predicts it
// reaches its own box level for this person, with no extra warnings.
import { engineConfig, predict, type EngineConfig, type EngineInput, type Prediction } from './predictionEngine'
import { SHADES, type Shade, type ToneFamily } from './shadeCatalogue'

export interface Alternative {
  shade: Shade
  prediction: Prediction
  /** Why this shade is expected to work, in plain words. */
  reason: string
}

export interface Recommendation {
  /** blocked: safety answers stop at-home dye, so no shades are suggested at all. */
  kind: 'blocked' | 'on-target' | 'closer-shades' | 'no-box-shade'
  /** Show the professional-consultation recommendation (from the engine's status). */
  professional: boolean
  original: Prediction
  shades: Alternative[]
}

// Cool to warm, so "closest tone" to ash is neutral before golden.
// Rough order of how alike tones look, cool to red, so suggestions stay close to the look wanted.
// Pearl sits after natural: it's a fashion tone, not a substitute for ash.
const TONE_ORDER: ToneFamily[] = ['ash', 'mocha', 'neutral', 'violet', 'golden', 'copper', 'red', 'mahogany']
const toneDistance = (a: ToneFamily, b: ToneFamily) => Math.abs(TONE_ORDER.indexOf(a) - TONE_ORDER.indexOf(b))

/** Reaches its box level, looks as the box intends, and raises no caution (e.g. green risk). */
const clean = (p: Prediction) =>
  p.status === 'estimate' && !!p.result?.reachesTarget && p.result.appearance === 'as-box' && !p.warnings.some((w) => w.severity !== 'info')

function reasonFor(shade: Shade, start: number, lift: number): string {
  if (shade.level < start) return `Darker than your level ${start}. Dye adds colour, so level ${shade.level} is likely.`
  if (shade.level === start) return `The same level as your hair, so it mainly changes tone.`
  return `Within the ${lift}-level lift we assume from your level ${start}.`
}

export function recommend(
  input: Omit<EngineInput, 'target'>,
  target: Shade,
  config: EngineConfig = engineConfig(),
  catalogue: Shade[] = SHADES,
  limit = 3,
): Recommendation {
  const asTarget = (shade: Shade): EngineInput => ({
    ...input,
    target: {
      level: shade.level,
      tone: shade.tone,
      code: shade.code,
      name: shade.name,
      targetHex: shade.targetHex,
      permanence: shade.brand?.permanence,
    },
  })
  // Suggest from the same shelf: the same brand and market for a real product, the examples otherwise.
  const sameShelf = (shade: Shade) => shade.brand?.name === target.brand?.name && shade.brand?.market === target.brand?.market
  const original = predict(asTarget(target), config)
  const base = { original, professional: original.status === 'professional-recommended' }

  // Safety outranks everything: never offer another box after a stop answer.
  if (original.status === 'blocked') return { ...base, kind: 'blocked', shades: [] }
  if (!original.result) return { ...base, kind: 'no-box-shade', shades: [] }
  if (clean(original)) return { ...base, kind: 'on-target', shades: [] }

  const start = input.start.level ?? 0
  // Someone going darker isn't offered a box that lightens their hair instead.
  const sameDirection = (shade: Shade) => target.level >= start || shade.level <= start
  const shades = catalogue
    .filter((shade) => shade.id !== target.id && sameShelf(shade) && sameDirection(shade))
    .map((shade) => ({ shade, prediction: predict(asTarget(shade), config) }))
    .filter(({ prediction }) => clean(prediction))
    // Closest level to the one wanted first, then the closest tone.
    .sort(
      (a, b) =>
        Math.abs(a.shade.level - target.level) - Math.abs(b.shade.level - target.level) ||
        toneDistance(a.shade.tone, target.tone) - toneDistance(b.shade.tone, target.tone),
    )
    .slice(0, limit)
    .map(({ shade, prediction }) => ({
      shade,
      prediction,
      reason: reasonFor(shade, input.start.level ?? 0, config.liftLevels),
    }))

  return { ...base, kind: shades.length ? 'closer-shades' : 'no-box-shade', shades }
}
