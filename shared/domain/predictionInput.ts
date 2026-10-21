// Everything the prediction engine needs, assembled from confirmed user choices.
// No prediction happens here: only lookup, validation and arithmetic.
import type { DyeHistory, HairColourName, LevelMethod, PreviousDye, StartingColour } from './hairColourReading'
import type { HairLevel } from './hairLevel'
import type { EngineInput, SafetyAnswers } from './predictionEngine'
import { BRAND_CATALOGUE, CATALOGUE, findShade, type Shade, type ToneFamily } from './shadeCatalogue'

/** YouCam Hair Color task parameters (docs/youcam-api/ai_hair_color.yaml, RunHairColorTaskParams). */
export interface HairColorRenderParams {
  pattern: { name: 'full' }
  palettes: [{ color: string; color_intensity: number }]
}

/**
 * One intensity for both renders, so the only difference between them is the colour.
 * 100 chosen from live tests on 2026-10-15: lower values barely moved dark hair.
 */
export const RENDER_INTENSITY = 100

export function hairColorRender(hex: string): HairColorRenderParams {
  return { pattern: { name: 'full' }, palettes: [{ color: hex, color_intensity: RENDER_INTENSITY }] }
}

export interface PredictionInput {
  starting: {
    level: HairLevel
    previouslyDyed: DyeHistory
    previousDye?: PreviousDye
    method: LevelMethod
    /** Colour family from the reading, or the user's correction. */
    family: HairColourName | null
    /** A dye colour seen in the photo ("Purple", "Dark brown with pink streaks"), if any. */
    dyeColour?: string
  }
  target: {
    shadeId: string
    code: string
    name: string
    level: HairLevel
    tone: ToneFamily
    targetHex: string
    limitationIds: string[]
    /** Set for real products: where the code and name came from. */
    brand?: Shade['brand']
  }
  /** Target level minus starting level. Positive means the box asks for lighter hair. */
  levelChange: number
  render: { promise: HairColorRenderParams }
  catalogue: { version: string; status: 'illustrative' | 'verified' }
}

export type PredictionInputResult =
  | { ok: true; input: PredictionInput }
  | { ok: false; reason: 'missing-starting' | 'missing-shade' | 'unknown-shade'; shadeId?: string }

function dyeColourOf(starting: StartingColour): string | undefined {
  const look = starting.measurement?.look
  return look && (look.kind === 'vivid' || look.kind === 'streaks') ? look.name : undefined
}

export function buildPredictionInput(
  starting: StartingColour | undefined,
  shadeId: string | undefined,
): PredictionInputResult {
  if (!starting) return { ok: false, reason: 'missing-starting' }
  if (!shadeId) return { ok: false, reason: 'missing-shade' }
  const shade = findShade(shadeId)
  if (!shade) return { ok: false, reason: 'unknown-shade', shadeId }

  return {
    ok: true,
    input: {
      starting: {
        level: starting.confirmedLevel,
        previouslyDyed: starting.previouslyDyed,
        previousDye: starting.previouslyDyed === 'yes' ? starting.previousDye : undefined,
        method: starting.method,
        family: starting.correctedFamily ?? starting.reading?.family ?? null,
        dyeColour: dyeColourOf(starting),
      },
      target: {
        shadeId: shade.id,
        code: shade.code,
        name: shade.name,
        level: shade.level,
        tone: shade.tone,
        targetHex: shade.targetHex,
        limitationIds: shade.limitationIds,
        brand: shade.brand,
      },
      levelChange: shade.level - starting.confirmedLevel,
      render: { promise: hairColorRender(shade.targetHex) },
      catalogue: shade.brand
        ? { version: BRAND_CATALOGUE.catalogueVersion, status: 'verified' }
        : { version: CATALOGUE.catalogueVersion, status: CATALOGUE.status },
    },
  }
}

/** Adapt session data to the engine's input. The engine itself knows nothing about the session. */
export function toEngineInput(input: PredictionInput, safety: SafetyAnswers): EngineInput {
  return {
    start: {
      level: input.starting.level,
      method: input.starting.method,
      family: input.starting.family,
      previouslyDyed: input.starting.previouslyDyed,
      previousDye: input.starting.previousDye,
      dyeColour: input.starting.dyeColour,
    },
    target: {
      level: input.target.level,
      tone: input.target.tone,
      code: input.target.code,
      name: input.target.name,
      targetHex: input.target.targetHex,
      permanence: input.target.brand?.permanence,
    },
    safety,
  }
}
