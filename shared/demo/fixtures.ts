// Demo fixtures: genuine YouCam outputs recorded for sample photos, plus helpers that only
// show them when they still match what the production engine predicts today.
import { engineConfig, predict, type EngineInput, type Prediction } from '../domain/predictionEngine'
import {
  HAIR_METRICS,
  normaliseDensity,
  normaliseLength,
  type HairMetric,
  type HairProfile,
  type HairSetup,
} from '../domain/hairProfile'
import { findShade, type Shade } from '../domain/shadeCatalogue'
import hairRecorded from './hair-profile.recorded.json'
import renderPairs from './render-pairs.json'
import type { DemoScenario } from './scenarios'
import type { ResultOrigin } from './types'

export interface DemoRenderPair {
  provenance: string
  renderedAt: string
  colorIntensity: number
  before: string
  promise: { image: string; colour: string }
  result: { image: string; colour: string }
}

export interface DemoHairProfile {
  provenance: string
  recordedAt: string
  setup: HairSetup
  profile: HairProfile
  /** Extra context per measurement, e.g. why YouCam rejected a sample photo. */
  notes: Partial<Record<HairMetric, string>>
}

export const RENDER_PAIRS = renderPairs as Record<NonNullable<DemoScenario['renderPairId']>, DemoRenderPair>
export const DEMO_HAIR_PROFILE = hairRecorded as DemoHairProfile

/** The scenario's prediction, worked out now by the production engine from its inputs. */
export function scenarioPrediction(
  scenario: DemoScenario,
  startLevel: EngineInput['start']['level'] = scenario.start.level,
): { shade: Shade; input: EngineInput; prediction: Prediction } {
  const shade = findShade(scenario.shadeId)
  if (!shade) throw new Error(`Demo scenario ${scenario.id} uses unknown shade ${scenario.shadeId}`)
  const input: EngineInput = {
    start: {
      level: startLevel,
      method: 'manual',
      family: null,
      previouslyDyed: scenario.start.previouslyDyed,
      previousDye: scenario.start.previousDye,
    },
    target: { level: shade.level, tone: shade.tone, code: shade.code, name: shade.name, targetHex: shade.targetHex },
    safety: { previousReaction: false, blackHenna: false, browsOrLashes: false },
  }
  return { shade, input, prediction: predict(input, engineConfig({ liftLevels: scenario.liftLevels })) }
}

/**
 * A recorded render pair is only shown if it was rendered with exactly the colours this
 * prediction asks for. If the engine or catalogue changes, the pair is hidden, not misused.
 */
export function verifiedRenderPair(scenario: DemoScenario, shade: Shade, prediction: Prediction): DemoRenderPair | null {
  const pair = scenario.renderPairId ? RENDER_PAIRS[scenario.renderPairId] : undefined
  if (!pair || !prediction.result) return null
  return pair.promise.colour === shade.targetHex && pair.result.colour === prediction.result.displayHex ? pair : null
}

/** Origin of each demo measurement: a recorded value, or unavailable with the real reason. */
export function demoMeasurementOrigin(metric: HairMetric, profile: DemoHairProfile = DEMO_HAIR_PROFILE): ResultOrigin {
  const m = profile.profile[metric]
  return m.status === 'measured'
    ? { kind: 'demo-fixture', provenance: profile.provenance }
    : { kind: 'unavailable', reason: m.message ?? 'Not measured.' }
}

/** Recorded values must still be documented YouCam values (same normalisers as live results). */
export function checkRecordedProfile(profile: HairProfile): string[] {
  const problems: string[] = []
  for (const metric of HAIR_METRICS) {
    const m = profile[metric]
    if (m.status !== 'measured') continue
    if (metric === 'length') {
      const again = normaliseLength({ term: profile.length.value?.term })
      if (JSON.stringify(again.value) !== JSON.stringify(profile.length.value)) problems.push('length')
    }
    if (metric === 'density') {
      const v = profile.density.value
      const again = normaliseDensity({ term: v?.term, mapping: v?.score })
      if (JSON.stringify(again.value) !== JSON.stringify(v)) problems.push('density')
    }
    if ((metric === 'type' || metric === 'frizz') && !m.value) problems.push(metric)
  }
  return problems
}
