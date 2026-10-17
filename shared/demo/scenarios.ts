// Demo scenarios for judges. Each one is only a set of INPUTS (starting hair, box shade, lift
// assumption). The prediction shown is always calculated live by the production engine from
// these inputs; nothing here feeds results into it. `demonstrates` says what the scenario is
// meant to show, and the tests check the engine still shows it.
import type { DyeHistory, PreviousDye } from '../domain/hairColourReading'
import type { HairLevel } from '../domain/hairLevel'
import type { PredictionStatus } from '../domain/predictionEngine'

export interface DemoScenario {
  id: 'brass-surprise' | 'dye-on-dye' | 'green-risk'
  letter: 'A' | 'B' | 'C'
  title: string
  /** One line for the demo menu. */
  summary: string
  start: { level: HairLevel; previouslyDyed: DyeHistory; previousDye?: PreviousDye; description: string }
  shadeId: string
  /** Lift assumption for this scenario only; the user's own setting is untouched. */
  liftLevels: number
  /** Id of a verified YouCam render pair in fixtures.ts, if a genuine one exists. */
  renderPairId?: 'dark-base-9-1'
  /** What the engine is expected to show. Used by tests only, never by the UI or the engine. */
  demonstrates: {
    status: PredictionStatus
    ruleIds: string[]
    warningIds?: string[]
    predictedLevel: HairLevel
    levelsShort: number
  }
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'brass-surprise',
    letter: 'A',
    title: 'The brass surprise',
    summary: 'Natural brown hair, level 4, and a very light ash blonde box.',
    start: { level: 4, previouslyDyed: 'no', description: 'Natural brown hair, never dyed' },
    shadeId: 'dev-9-1-very-light-ash-blonde',
    liftLevels: 2,
    renderPairId: 'dark-base-9-1',
    demonstrates: {
      status: 'professional-recommended',
      ruleIds: ['natural-lift', 'underlying-warmth', 'tone-influence', 'shortfall'],
      warningIds: ['beyond-lift'],
      predictedLevel: 6,
      levelsShort: 3,
    },
  },
  {
    id: 'dye-on-dye',
    letter: 'B',
    title: 'Dye can’t lift dye',
    summary: 'Hair box-dyed black before, and a light brown box.',
    start: { level: 1, previouslyDyed: 'yes', previousDye: 'black-dark', description: 'Box-dyed black before' },
    shadeId: 'dev-5-0-light-brown',
    liftLevels: 2,
    demonstrates: {
      status: 'professional-recommended',
      ruleIds: ['dye-cant-lift-dye', 'shortfall'],
      warningIds: ['black-dyed'],
      predictedLevel: 1,
      levelsShort: 4,
    },
  },
  {
    id: 'green-risk',
    letter: 'C',
    title: 'The green-tone risk',
    summary: 'Hair lightened before to a yellow level 8, and an ash box at the same level.',
    start: { level: 8, previouslyDyed: 'yes', previousDye: 'lightened', description: 'Lightened before, now yellow blonde' },
    shadeId: 'dev-8-1-ash-light-blonde',
    liftLevels: 2,
    demonstrates: {
      status: 'estimate',
      ruleIds: ['deposit'],
      warningIds: ['ash-green'],
      predictedLevel: 8,
      levelsShort: 0,
    },
  },
]

export function findScenario(id: string | undefined): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((s) => s.id === id)
}
