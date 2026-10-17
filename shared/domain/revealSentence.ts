// The one-line headline of the reveal, generated only from prediction data.
import type { Prediction } from './predictionEngine'
import { TONE_LABELS, type ToneFamily } from './shadeCatalogue'

/** Short colour word for the predicted result, e.g. "red-orange brown" or "ash blonde". */
export function predictedColourWords(prediction: Prediction, targetTone: ToneFamily): string {
  const result = prediction.result
  if (!result) return ''
  const family = result.predictedFamily.family.toLowerCase()
  switch (result.appearance) {
    case 'warm-or-muddy':
    case 'warmer-than-box':
      return `${result.underlyingWarmth?.name ?? 'warm'} ${family}`
    case 'possible-green':
      return `${TONE_LABELS[targetTone].toLowerCase()} ${family} (green risk)`
    case 'little-change':
      return `${family}, largely unchanged`
    case 'as-box':
      return targetTone === 'neutral' ? `natural ${family}` : `${TONE_LABELS[targetTone].toLowerCase()} ${family}`
  }
}

export function revealSentence(prediction: Prediction, target: { level: number; tone: ToneFamily }): string {
  const result = prediction.result
  if (!result) return 'We need your starting level before we can estimate a result.'
  const tone = target.tone === 'neutral' ? 'natural' : TONE_LABELS[target.tone].toLowerCase()
  const level = result.range.max > result.range.min ? `${result.range.min}–${result.range.max}` : String(result.level)
  const gap = result.reachesTarget
    ? 'on target'
    : `${result.levelsShort} level${result.levelsShort === 1 ? '' : 's'} short`
  return `Predicted level ${level} ${predictedColourWords(prediction, target.tone)} versus promised level ${target.level} ${tone}: ${gap}.`
}
