// Box Truth prediction engine: deterministic, explainable rules. No LLM, no YouCam, no React.
//
// Every number here is a configurable assumption drawn from brand guidance and colouring
// references (see RULE_SOURCES). The rules are NOT scientifically validated; outputs are
// estimates and must be labelled as such.
import { labToHex } from './colour'
import type { DyeHistory, HairColourName, LevelMethod, PreviousDye } from './hairColourReading'
import { HAIR_LEVEL_NAMES, type HairLevel } from './hairLevel'
import { COOL_TONES, levelToLightness, TONE_LABELS, type ToneFamily } from './shadeCatalogue'

// ---------------------------------------------------------------- inputs and config

export interface SafetyAnswers {
  /** Any earlier reaction to hair dye (itching, swelling, rash…). Undefined = not answered. */
  previousReaction?: boolean
  /** A "black henna" tattoo, or black henna used on skin or hair. */
  blackHenna?: boolean
  /** Planning to use this dye on eyebrows or eyelashes. */
  browsOrLashes?: boolean
}

export interface EngineInput {
  start: {
    /** Undefined when the user hasn't confirmed a level. */
    level?: HairLevel
    method?: LevelMethod
    family?: HairColourName | null
    previouslyDyed: DyeHistory
    previousDye?: PreviousDye
    /** A dye colour seen in the photo ("Purple", "Dark brown with pink streaks"). */
    dyeColour?: string
  }
  target: {
    level: HairLevel
    tone: ToneFamily
    code?: string
    name?: string
    /** The shade's modelled colour, used when the box result is reached. */
    targetHex?: string
    /** As the brand states it. Semi- and demi-permanent colour adds tone but isn't made to lighten. */
    permanence?: string
  }
  safety: SafetyAnswers
}

export interface WarmthStep {
  /** Name of the warm pigment typically exposed at this level. */
  name: string
  /** Lab a*, b* used only to draw an approximate swatch. */
  ab: readonly [number, number]
}

export interface EngineConfig {
  /** Levels a permanent box dye is assumed to lift natural hair. Conservative default: 1. */
  liftLevels: number
  /** Levels short of the target at which home dyeing is not recommended. */
  professionalShortfall: number
  /** Underlying warmth by level, darkest to lightest (red → orange → gold → yellow). */
  warmthTable: Record<HairLevel, WarmthStep>
  /**
   * How strongly exposed warmth still shows through each tone, for the swatch only
   * (1 = fully visible). Tones influence appearance; they don't guarantee cancellation.
   */
  toneInfluence: Record<ToneFamily, number>
}

/** From tests/boxtruth.py (PIGMENT_NAME / PIGMENT_AB) and the underlying-pigment sequence. */
export const DEFAULT_WARMTH_TABLE: Record<HairLevel, WarmthStep> = {
  1: { name: 'blue-black', ab: [1, 1] },
  2: { name: 'dark red-brown', ab: [6, 5] },
  3: { name: 'red-brown', ab: [10, 10] },
  4: { name: 'red', ab: [14, 14] },
  5: { name: 'red-orange', ab: [16, 20] },
  6: { name: 'orange', ab: [15, 26] },
  7: { name: 'orange-gold', ab: [12, 30] },
  8: { name: 'gold', ab: [8, 32] },
  9: { name: 'yellow', ab: [4, 30] },
  10: { name: 'pale yellow', ab: [2, 22] },
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  liftLevels: 1,
  professionalShortfall: 2,
  warmthTable: DEFAULT_WARMTH_TABLE,
  toneInfluence: { ash: 0.6, violet: 0.7, mocha: 0.75, neutral: 0.9, golden: 1.15, copper: 1.1, red: 1.25, mahogany: 1.15 },
}

export function engineConfig(overrides: Partial<EngineConfig> = {}): EngineConfig {
  const config = { ...DEFAULT_ENGINE_CONFIG, ...overrides }
  if (!Number.isInteger(config.liftLevels) || config.liftLevels < 0 || config.liftLevels > 4) {
    throw new RangeError('liftLevels must be a whole number from 0 to 4')
  }
  if (!Number.isInteger(config.professionalShortfall) || config.professionalShortfall < 1) {
    throw new RangeError('professionalShortfall must be a whole number of at least 1')
  }
  return config
}

// ---------------------------------------------------------------- outputs

export const RULE_SOURCES = {
  'garnier-lift': 'https://www.garnierusa.com/en/hair-color-needs/new-to-hair-color',
  'theshade-dyed': 'https://the-shade.helpscoutdocs.com/article/52-how-light-can-i-colour-my-hair',
  'underlying-pigment': 'https://open-exam-prep.com/study-guides/tx-barber/haircoloring/color-formulation-correction',
  'ash-green': 'https://www.curlcentric.com/why-is-my-hair-turning-green-when-i-dye-it/',
  'revlon-dark': 'https://cdn.revlonprofessional.com/blog/correct-black-box-dyed-hair',
  'box-dye-henna': 'https://www.curlcentric.com/why-do-hairdressers-hate-box-dye/',
  'fda-hair-dyes': 'https://www.fda.gov/cosmetics/cosmetic-products/hair-dyes',
  'nhs-reactions': 'https://www.nhs.uk/conditions/hair-dye-reactions/',
  'boxtruth-model': 'tests/boxtruth.py',
  'wella-semi-demi': 'https://www.wella.com/professional/en-GB/blog/hair-colour/differences-between-semi-and-demi-permanent-hair-color',
} as const
export type RuleSourceId = keyof typeof RULE_SOURCES

export interface AppliedRule {
  id: string
  title: string
  detail: string
  sourceIds: RuleSourceId[]
}

export interface EngineWarning {
  id: string
  severity: 'stop' | 'caution' | 'info'
  text: string
  sourceIds: RuleSourceId[]
}

export interface NextAction {
  id: 'confirm-level' | 'answer-safety' | 'skin-test' | 'strand-test' | 'closer-shade' | 'pharmacist'
  text: string
}

export type AppearanceTone = 'as-box' | 'warmer-than-box' | 'warm-or-muddy' | 'possible-green' | 'little-change'

export interface PredictedResult {
  /** Single best estimate. */
  level: HairLevel
  /** Plausible range; min === max when the rules give one answer. */
  range: { min: HairLevel; max: HairLevel }
  /** Target level minus estimated level (0 when the target is reached). */
  levelsShort: number
  reachesTarget: boolean
  /** Warm pigment likely visible at the estimated level, if lightening was attempted. */
  underlyingWarmth: { level: HairLevel; name: string } | null
  appearance: AppearanceTone
  predictedFamily: { family: 'Black' | 'Brown' | 'Blonde'; description: string }
  /** Approximate swatch for display only. */
  displayHex: string
}

export type PredictionStatus = 'estimate' | 'professional-recommended' | 'blocked' | 'insufficient-input'

export interface Prediction {
  status: PredictionStatus
  result: PredictedResult | null
  rules: AppliedRule[]
  warnings: EngineWarning[]
  actions: NextAction[]
  uncertainty: { level: 'low' | 'medium' | 'high'; reasons: string[] }
  assumptions: { liftLevels: number; professionalShortfall: number }
  disclaimer: string
}

export const DISCLAIMER =
  'This is an estimate from general colouring rules, not a guarantee. The rules are not scientifically validated, and real results vary by product, hair condition and application.'

// ---------------------------------------------------------------- helpers

const clampLevel = (n: number) => Math.min(10, Math.max(1, Math.round(n))) as HairLevel

function familyOf(level: HairLevel): 'Black' | 'Brown' | 'Blonde' {
  if (level <= 2) return 'Black'
  if (level <= 5) return 'Brown'
  return 'Blonde'
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function describe(level: HairLevel, appearance: AppearanceTone, tone: ToneFamily, warmth: string | null): string {
  const base = HAIR_LEVEL_NAMES[level].toLowerCase()
  switch (appearance) {
    case 'as-box':
      return tone === 'neutral' ? `Natural ${base}` : `${TONE_LABELS[tone]} ${base}`
    case 'warmer-than-box':
      return `Warm ${base}${warmth ? ` with ${warmth} tones` : ''}`
    case 'warm-or-muddy':
      return `Warm or muddy ${base}${warmth ? ` (${warmth} showing through the ${tone === 'ash' ? 'ash' : `${TONE_LABELS[tone].toLowerCase()} tone`})` : ''}`
    case 'possible-green':
      return `${TONE_LABELS[tone]} ${base}, with a risk of a green tinge`
    case 'little-change':
      return `About the same as now: ${base}`
  }
}

// ---------------------------------------------------------------- engine

export function predict(input: EngineInput, config: EngineConfig = DEFAULT_ENGINE_CONFIG): Prediction {
  const rules: AppliedRule[] = []
  const warnings: EngineWarning[] = []
  const actions: NextAction[] = []
  const uncertainty: string[] = []
  const { start, target, safety } = input
  let professional = false
  let blocked = false

  // ---- Safety first. These stop ordinary at-home recommendations regardless of colour.
  if (safety.browsOrLashes) {
    blocked = true
    warnings.push({
      id: 'brows-lashes',
      severity: 'stop',
      text: 'Don’t use hair dye on eyebrows or eyelashes. The FDA says no colour additives are approved for dyeing them, and hair dye labels warn it may cause blindness.',
      sourceIds: ['fda-hair-dyes'],
    })
  }
  if (safety.previousReaction) {
    blocked = true
    warnings.push({
      id: 'previous-reaction',
      severity: 'stop',
      text: 'You’ve reacted to hair dye before, so don’t use this permanent dye at home. NHS advice is to avoid PPD dyes after a reaction and consider a non-permanent dye. Ask a pharmacist or doctor first.',
      sourceIds: ['nhs-reactions'],
    })
    actions.push({ id: 'pharmacist', text: 'Talk to a pharmacist or doctor before using any hair dye.' })
  }
  if (safety.blackHenna) {
    blocked = true
    warnings.push({
      id: 'black-henna',
      severity: 'stop',
      text: '“Black henna” can contain high levels of PPD, which raises the risk of a reaction to hair dye. NHS advice is to avoid PPD hair dyes. Get advice before using this one.',
      sourceIds: ['nhs-reactions', 'fda-hair-dyes'],
    })
    if (!actions.some((a) => a.id === 'pharmacist')) {
      actions.push({ id: 'pharmacist', text: 'Talk to a pharmacist or doctor before using any hair dye.' })
    }
  }
  const unanswered = (['previousReaction', 'blackHenna', 'browsOrLashes'] as const).filter((k) => safety[k] === undefined)
  if (unanswered.length) {
    warnings.push({
      id: 'safety-unanswered',
      severity: 'info',
      text: 'Answer the safety questions so we can flag risks before you dye.',
      sourceIds: [],
    })
    actions.push({ id: 'answer-safety', text: 'Answer the three safety questions.' })
  }

  // ---- Starting level is required for any colour estimate.
  if (!start.level) {
    if (!blocked) {
      actions.unshift({ id: 'confirm-level', text: 'Confirm your starting hair level.' })
    }
    return finish(blocked ? 'blocked' : 'insufficient-input', null, {
      reasons: ['Your starting hair level hasn’t been confirmed, so no result can be estimated.'],
      level: 'high',
    })
  }

  const startLevel = start.level
  const lightening = target.level > startLevel
  // Semi- and demi-permanent box colour deposits tone; it isn't made to lift natural hair.
  const depositOnly = /^(semi|demi)-permanent$/.test(target.permanence ?? '')
  const lift = depositOnly ? 0 : config.liftLevels
  const dyedFor = start.previouslyDyed === 'yes' ? (start.previousDye ?? 'unsure') : null

  if (start.method === 'adjusted' || start.method === 'corrected') {
    rules.push({
      id: 'user-level',
      title: 'Your confirmed level',
      detail: `Using level ${startLevel}, the level you confirmed after adjusting the suggestion.`,
      sourceIds: [],
    })
  } else if (start.method === 'measured') {
    rules.push({
      id: 'user-level',
      title: 'Measured level',
      detail: `Using level ${startLevel}, measured from the lightness of the hair in your photo and confirmed by you. Treat it as about ±1 level.`,
      sourceIds: [],
    })
  } else if (start.method === 'manual') {
    rules.push({
      id: 'user-level',
      title: 'Your chosen level',
      detail: `Using level ${startLevel}, which you chose yourself.`,
      sourceIds: [],
    })
  }
  if (start.family === 'Grey/White') {
    uncertainty.push('Grey or white hair takes dye differently and has no single natural level.')
  }
  if (start.dyeColour) {
    const colour = start.dyeColour.toLowerCase()
    warnings.push({
      id: 'vivid-base',
      severity: 'caution',
      text: `Your photo shows ${colour} hair. Box dye goes on top of that colour rather than replacing it, so it can show through or turn the result muddy. Do a strand test first.`,
      sourceIds: ['theshade-dyed'],
    })
    uncertainty.push(`The ${colour} already in your hair will mix with the box colour, so the result is harder to predict.`)
  }

  // ---- Estimate the level reached.
  let level: HairLevel
  let range: { min: HairLevel; max: HairLevel }

  if (!lightening) {
    level = target.level
    range = { min: level, max: level }
    rules.push({
      id: 'deposit',
      title: target.level === startLevel ? 'Same level' : 'Going darker',
      detail:
        target.level === startLevel
          ? 'The box is the same level as your hair, so it mainly changes tone.'
          : `The box is darker than your hair. Dye adds colour, so reaching level ${target.level} is likely.`,
      sourceIds: [],
    })
    if (startLevel - target.level >= 2 && target.level <= 3) {
      warnings.push({
        id: 'dark-hard-to-undo',
        severity: 'caution',
        text: 'Going this much darker is easy to do and hard to undo: dyed hair is much slower to lighten later.',
        sourceIds: ['revlon-dark'],
      })
    }
  } else if (dyedFor) {
    // Permanent dye does not lighten earlier permanent colour.
    level = startLevel
    range = { min: startLevel, max: startLevel }
    rules.push({
      id: 'dye-cant-lift-dye',
      title: 'Dye can’t lift dye',
      detail:
        'Your hair has been coloured before. Another permanent box dye isn’t expected to lighten earlier colour; only a colour remover or bleach can, so we estimate your level stays the same.',
      sourceIds: ['garnier-lift', 'theshade-dyed'],
    })
    professional = true
    if (dyedFor === 'black-dark') {
      warnings.push({
        id: 'black-dyed',
        severity: 'caution',
        text: 'Black or very dark dye is the hardest to lighten. Dyed hair can take about twice as long per level, so a box dye won’t get you far.',
        sourceIds: ['revlon-dark'],
      })
    }
    if (dyedFor === 'henna') {
      warnings.push({
        id: 'henna-history',
        severity: 'caution',
        text: 'Henna and some box dyes can react with other colour products. Do a strand test before applying anything over it.',
        sourceIds: ['box-dye-henna'],
      })
    }
    if (dyedFor === 'unsure') uncertainty.push('You’re not sure what your earlier colour was.')
  } else if (start.previouslyDyed === 'unsure' && !depositOnly) {
    // Could be natural (some lift) or dyed (none): give the honest range.
    const natural = clampLevel(Math.min(target.level, startLevel + lift))
    level = startLevel
    range = { min: startLevel, max: natural }
    rules.push({
      id: 'dye-history-unknown',
      title: 'Dye history unknown',
      detail: `If your hair is natural it may reach about level ${natural}; if it was dyed before, it may not lighten at all. We show the lower estimate.`,
      sourceIds: ['garnier-lift', 'theshade-dyed'],
    })
    uncertainty.push('You’re not sure whether your hair has been dyed, which changes how much it can lighten.')
  } else if (depositOnly) {
    level = startLevel
    range = { min: startLevel, max: startLevel }
    rules.push({
      id: 'deposit-only',
      title: `${target.permanence === 'semi-permanent' ? 'Semi' : 'Demi'}-permanent colour doesn’t lighten`,
      detail: `This box is ${target.permanence}, as the brand lists it. That kind of colour adds tone but isn’t made to lighten hair, so we estimate your level stays about the same.`,
      sourceIds: ['wella-semi-demi'],
    })
  } else {
    level = clampLevel(Math.min(target.level, startLevel + config.liftLevels))
    range = { min: level, max: level }
    rules.push({
      id: 'natural-lift',
      title: `Assumed lift: ${plural(config.liftLevels, 'level')}`,
      detail: `We assume a permanent box dye lightens natural hair by about ${plural(config.liftLevels, 'level')}. Brands quote 1–3 levels and it varies by product, so this is a setting, not a fact about your box.`,
      sourceIds: ['garnier-lift'],
    })
  }

  const levelsShort = Math.max(0, target.level - level)
  const reachesTarget = levelsShort === 0

  // ---- Underlying warmth, exposed when hair is actually lightened (or may be, when the dye
  // history is unknown). Dyed hair that can't lift exposes nothing new.
  const exposesWarmth = lightening && range.max > startLevel
  const lightenedBase = dyedFor === 'lightened'
  const warmthLevel: HairLevel | null = exposesWarmth || lightenedBase ? level : null
  const underlyingWarmth = warmthLevel ? { level: warmthLevel, name: config.warmthTable[warmthLevel].name } : null
  if (underlyingWarmth && exposesWarmth) {
    rules.push({
      id: 'underlying-warmth',
      title: 'Warm pigment shows when hair is lightened',
      detail: `Lightening to about level ${underlyingWarmth.level} typically exposes ${underlyingWarmth.name} tones (the general sequence is red → orange → gold → yellow).`,
      sourceIds: ['underlying-pigment', 'boxtruth-model'],
    })
  }

  // ---- Tone influence on appearance (influence, not guaranteed cancellation).
  let appearance: AppearanceTone = 'as-box'
  if (lightenedBase && target.tone === 'ash') {
    appearance = 'possible-green'
    warnings.push({
      id: 'ash-green',
      severity: 'caution',
      text: 'Ash over lightened, yellow or porous hair can turn green. Do a strand test first.',
      sourceIds: ['ash-green'],
    })
  } else if (lightening && (dyedFor || depositOnly)) {
    appearance = 'little-change'
  } else if (!reachesTarget && lightening) {
    const cool = COOL_TONES.includes(target.tone)
    appearance = cool ? 'warm-or-muddy' : 'warmer-than-box'
    rules.push({
      id: 'tone-influence',
      title: `${TONE_LABELS[target.tone]} tone over warm pigment`,
      detail: cool
        ? `${TONE_LABELS[target.tone]} can soften warmth but isn’t expected to cancel ${underlyingWarmth?.name ?? 'it'} fully, so the result may look warm or muddy rather than cool.`
        : `A ${TONE_LABELS[target.tone].toLowerCase()} tone adds to the warmth already exposed, so the result will likely look warmer than the box.`,
      sourceIds: ['underlying-pigment'],
    })
  }

  if (!reachesTarget) {
    rules.push({
      id: 'shortfall',
      title: `${plural(levelsShort, 'level')} short`,
      detail: `The box is level ${target.level}; we estimate about level ${level}${range.max > range.min ? ` (up to ${range.max})` : ''}.`,
      sourceIds: [],
    })
    if (levelsShort >= config.professionalShortfall) {
      professional = true
      warnings.push({
        id: 'beyond-lift',
        severity: 'caution',
        text: `This shade needs about ${plural(target.level - startLevel, 'level')} of lightening, well beyond what we assume a box dye can do.`,
        sourceIds: ['garnier-lift'],
      })
    }
    const reachable = clampLevel(Math.min(10, dyedFor ? startLevel : startLevel + lift))
    // After a safety stop, no box is suggested at all.
    if (!blocked) {
      actions.push({
        id: 'closer-shade',
        text: `Choose a box closer to your hair, around level ${reachable}, for a result nearer the picture.`,
      })
    }
  }
  if (!blocked && (lightening || lightenedBase || start.previouslyDyed !== 'no')) {
    actions.push({ id: 'strand-test', text: 'Do a strand test on a hidden section to see the real result.' })
  }
  if (!blocked) {
    warnings.push({
      id: 'skin-test',
      severity: 'info',
      text: 'Do the skin allergy test in the box instructions every time before you dye, even with a product you’ve used before, and follow its timing (often 48 hours).',
      sourceIds: ['fda-hair-dyes', 'nhs-reactions'],
    })
    actions.push({ id: 'skin-test', text: 'Do the skin allergy test from the box instructions before every use.' })
  }

  // ---- Approximate swatch.
  let displayHex: string
  if (reachesTarget && target.targetHex) {
    displayHex = target.targetHex
  } else if (appearance === 'little-change') {
    displayHex = labToHex([levelToLightness(level), 3, 12])
  } else {
    const [a, b] = config.warmthTable[level].ab
    const k = config.toneInfluence[target.tone]
    displayHex = labToHex([levelToLightness(level), a * k, b * k])
  }

  const result: PredictedResult = {
    level,
    range,
    levelsShort,
    reachesTarget,
    underlyingWarmth,
    appearance,
    predictedFamily: { family: familyOf(level), description: describe(level, appearance, target.tone, underlyingWarmth?.name ?? null) },
    displayHex,
  }

  const status: PredictionStatus = blocked ? 'blocked' : professional ? 'professional-recommended' : 'estimate'
  return finish(status, result, {
    reasons: uncertainty,
    level: uncertainty.length ? 'medium' : 'low',
  })

  function finish(
    status: PredictionStatus,
    result: PredictedResult | null,
    u: { level: 'low' | 'medium' | 'high'; reasons: string[] },
  ): Prediction {
    return {
      status,
      result,
      rules,
      warnings,
      actions,
      uncertainty: u,
      assumptions: { liftLevels: config.liftLevels, professionalShortfall: config.professionalShortfall },
      disclaimer: DISCLAIMER,
    }
  }
}
