import {
  levelEstimateFor,
  type HairColourName,
  type HairColourReading,
  type LevelEstimate,
  type LevelMethod,
} from '../../../shared/domain/hairColourReading'
import type { HairLevel } from '../../../shared/domain/hairLevel'
import type { LevelMeasurement } from '../../../shared/domain/hairLevelMeasure'

/** How the level was set, in words that never pass manual input off as AI analysis. */
export const METHOD_LABELS: Record<LevelMethod, string> = {
  measured: 'Measured from the hair in your photo',
  suggested: 'Suggested from YouCam reading',
  corrected: 'From the colour you corrected',
  adjusted: 'Adjusted by you',
  manual: 'Chosen manually',
}

/**
 * The estimate in play. A lightness measurement from the photo beats a colour family; without
 * one, the corrected family if the user fixed the reading, else the reading's.
 */
export function activeEstimate(
  reading: HairColourReading | undefined,
  corrected?: HairColourName,
  measured?: LevelMeasurement,
): LevelEstimate | null {
  if (measured?.status === 'measured') return { ...measured.range, suggested: measured.level }
  if (corrected) return levelEstimateFor(corrected)
  return reading?.levelEstimate ?? null
}

export function resolveMethod(
  level: HairLevel,
  reading: HairColourReading | undefined,
  corrected?: HairColourName,
  measured?: LevelMeasurement,
): LevelMethod {
  if (measured?.status === 'measured') return level === measured.level ? 'measured' : 'adjusted'
  if (!reading) return 'manual'
  const estimate = activeEstimate(reading, corrected)
  if (estimate && level === estimate.suggested) return corrected ? 'corrected' : 'suggested'
  return 'adjusted'
}

export function stepLevel(level: HairLevel, delta: -1 | 1): HairLevel {
  return Math.min(10, Math.max(1, level + delta)) as HairLevel
}
