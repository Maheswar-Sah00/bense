// Pure hair-colour flow state: what the user has chosen so far, and where to resume.
import type { HairColourReading, StartingColour } from '../../shared/domain/hairColourReading'
import type { CardPoint, LevelMeasurement } from '../../shared/domain/hairLevelMeasure'
import type { SafetyAnswers } from '../../shared/domain/predictionEngine'
import type { AnalysisCapture, CapturedPhoto } from './captureSession'

export interface ColourFlow {
  photo?: CapturedPhoto
  /** Last YouCam reading, tied to the photo it came from so a photo is never paid for twice. */
  reading?: { photoId: string; reading: HairColourReading }
  /** Confirmed by the user; this is what the prediction engine uses. */
  starting?: StartingColour
  /** Catalogue shade id. */
  shadeId?: string
  /** A previously chosen id that is no longer in the catalogue, kept so the UI can say so. */
  unavailableShadeId?: string
  /** Rendered reveal for one photo + colour pair. Memory only (object URLs). */
  reveal?: RevealRenders
  /** Hair lightness measured from this photo. Memory only: the mask render is an object URL. */
  measure?: LevelMeasureState
}

export interface LevelMeasureState {
  photoId: string
  /** YouCam Hair Color #00FF00 render of the photo, kept to re-measure when the card is tapped. */
  maskUrl: string
  maskBlob: Blob
  result: LevelMeasurement
  card?: CardPoint
  elapsedMs: number
}

export interface RevealRenders {
  /** photo id | promise colour | result colour: a different key means the renders are stale. */
  key: string
  promise: { url: string; colour: string }
  result: { url: string; colour: string }
  elapsedMs: number
}

export const revealKey = (photoId: string, promise: string, result: string) => `${photoId}|${promise}|${result}`

export interface FlowSettings {
  /** Levels a box dye is assumed to lift natural hair. The engine's conservative default is 1. */
  liftLevels: 1 | 2 | 3
}

export interface FlowState {
  colour: ColourFlow
  analysis: AnalysisCapture
  safety: SafetyAnswers
  settings: FlowSettings
}

export const COLOUR_STEPS = [
  { path: '/colour/photo', label: 'Photo' },
  { path: '/colour/starting-colour', label: 'Starting colour' },
  { path: '/colour/shade', label: 'Shade' },
  { path: '/colour/result', label: 'Result' },
] as const

export function colourStepsDone(colour: ColourFlow): number {
  if (!colour.photo) return 0
  if (!colour.starting) return 1
  if (!colour.shadeId) return 2
  return 3
}

/** First unfinished colour step, or the result once everything is chosen. */
export function colourResumePath(colour: ColourFlow): string {
  return COLOUR_STEPS[colourStepsDone(colour)].path
}
