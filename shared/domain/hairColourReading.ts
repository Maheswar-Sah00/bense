// Normalised hair-colour reading from YouCam Facial Color Tones, plus the user's confirmed
// starting colour. Facial Color Tones returns a colour *family* (one of six names, with one
// of seven fixed swatch hexes), never a measured 1–10 level, so levels here are ranges.
import type { HairLevel } from './hairLevel'
import type { HairLookKind } from './hairLook'

export const HAIR_COLOUR_NAMES = ['Black', 'Brown', 'Auburn', 'Red', 'Blonde', 'Grey/White'] as const
export type HairColourName = (typeof HAIR_COLOUR_NAMES)[number]

export interface LevelEstimate {
  min: HairLevel
  max: HairLevel
  suggested: HairLevel
}

export type ReadingUncertainty =
  | 'category-only' // a family was returned: the level is a range, the user picks
  | 'grey' // grey/white: no natural level can be inferred
  | 'no-hair-detected' // no hair colour returned (hair hidden or not visible)
  | 'unknown-category' // a name outside the documented enum

export interface HairColourReading {
  source: 'youcam-facial-color-tones'
  /** `hair_color_name` exactly as returned, if any. */
  apiHairColorName: string | null
  /** `hair_color` exactly as returned, if any. A category swatch, not a measurement. */
  apiHairColorHex: string | null
  /** Uppercase #RRGGBB form of `hair_color`, or null if missing or malformed. */
  normalizedHex: string | null
  /** The documented family, when the returned name is one of them. */
  family: HairColourName | null
  levelEstimate: LevelEstimate | null
  uncertainty: ReadingUncertainty
  notes: string[]
  /** `face_quality` fields as returned (e.g. lighting: "good"). */
  faceQuality: Record<string, string | boolean>
}

/**
 * Broad level ranges for each family on the 1–10 box scale. These are deliberately wide:
 * "Brown" alone spans dark to light brown. The user confirms the actual level.
 */
const FAMILY_LEVELS: Record<Exclude<HairColourName, 'Grey/White'>, LevelEstimate> = {
  Black: { min: 1, max: 3, suggested: 2 },
  Brown: { min: 3, max: 6, suggested: 4 },
  Auburn: { min: 4, max: 6, suggested: 5 },
  Red: { min: 5, max: 8, suggested: 6 },
  Blonde: { min: 7, max: 10, suggested: 8 },
}

export function levelEstimateFor(family: HairColourName | null): LevelEstimate | null {
  if (!family || family === 'Grey/White') return null
  return FAMILY_LEVELS[family]
}

export function isHairColourName(value: unknown): value is HairColourName {
  return HAIR_COLOUR_NAMES.includes(value as HairColourName)
}

export function normaliseHex(value: unknown): string | null {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim().toUpperCase() : null
}

/** Build the normalised reading from the documented `results` object of a successful task. */
export function normaliseColourTones(results: {
  color?: { hair_color?: unknown; hair_color_name?: unknown } | null
  face_quality?: Record<string, unknown> | null
}): HairColourReading {
  const rawName = typeof results.color?.hair_color_name === 'string' ? results.color.hair_color_name : null
  const rawHex = typeof results.color?.hair_color === 'string' ? results.color.hair_color : null
  const family = isHairColourName(rawName) ? rawName : null

  const faceQuality: Record<string, string | boolean> = {}
  for (const [key, value] of Object.entries(results.face_quality ?? {})) {
    if (typeof value === 'string' || typeof value === 'boolean') faceQuality[key] = value
  }

  const notes = ['YouCam returns a colour family, not an exact level. Confirm the level that matches your hair.']
  let uncertainty: ReadingUncertainty = 'category-only'
  if (!rawName && !rawHex) {
    uncertainty = 'no-hair-detected'
    notes.splice(0, 1, 'No hair colour was returned. Your hair may be hidden or out of frame.')
  } else if (rawName && !family) {
    uncertainty = 'unknown-category'
    notes.push(`"${rawName}" isn’t one of the documented colour families.`)
  } else if (family === 'Grey/White') {
    uncertainty = 'grey'
    notes.push('Grey or white hair has no single natural level. Choose the level of your darkest hair.')
  }
  if (typeof faceQuality.lighting === 'string' && faceQuality.lighting !== 'good') {
    notes.push(`Lighting was rated "${faceQuality.lighting}", which can make the reading less reliable.`)
  }
  notes.push('If your hair is dyed, this reads the dye, not your natural colour.')

  return {
    source: 'youcam-facial-color-tones',
    apiHairColorName: rawName,
    apiHairColorHex: rawHex,
    normalizedHex: normaliseHex(rawHex),
    family,
    levelEstimate: levelEstimateFor(family),
    uncertainty,
    notes,
    faceQuality,
  }
}

/** measured: from the hair's lightness in the photo; suggested: from the Facial Color Tones family. */
export type LevelMethod = 'measured' | 'suggested' | 'adjusted' | 'corrected' | 'manual'
export const LEVEL_METHODS: LevelMethod[] = ['measured', 'suggested', 'adjusted', 'corrected', 'manual']
export type DyeHistory = 'yes' | 'no' | 'unsure'
/** What earlier colouring was, when the hair has been dyed before. */
export type PreviousDye = 'black-dark' | 'lightened' | 'other-colour' | 'henna' | 'unsure'
export const PREVIOUS_DYES: PreviousDye[] = ['black-dark', 'lightened', 'other-colour', 'henna', 'unsure']

/** What the prediction engine receives about the starting colour. */
export interface StartingColour {
  confirmedLevel: HairLevel
  /** How the level was set. 'manual' is never described as AI analysis. */
  method: LevelMethod
  previouslyDyed: DyeHistory
  /** Set when previouslyDyed is 'yes'. */
  previousDye?: PreviousDye
  reading?: HairColourReading
  /** Family the user chose when the reading was wrong. */
  correctedFamily?: HairColourName
  /** Summary of the lightness measurement, when one was made (numbers only, no image). */
  measurement?: {
    lightness: number
    level: HairLevel
    calibrated: boolean
    /** The colour read from the photo, e.g. "Purple" (kind 'vivid') or "Dark brown with blue streaks". */
    look?: { kind: HairLookKind; name: string }
  }
}
