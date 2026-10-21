// The prediction and its recommendation for the current choices, worked out once and reused:
// recommend() predicts every shade on the same shelf (up to about 200), and the result page
// re-renders on every safety tap, reveal update and voice toggle.
import { recommend, type Recommendation } from '../../../shared/domain/alternatives'
import { engineConfig, predict, type EngineInput, type Prediction } from '../../../shared/domain/predictionEngine'
import type { Shade } from '../../../shared/domain/shadeCatalogue'

let last: { key: string; prediction: Prediction; recommendation: Recommendation } | null = null

export function predictWithOptions(input: EngineInput, shade: Shade, liftLevels: number) {
  const key = JSON.stringify([input, shade.id, liftLevels])
  if (last?.key !== key) {
    const config = engineConfig({ liftLevels })
    last = {
      key,
      prediction: predict(input, config),
      recommendation: recommend({ start: input.start, safety: input.safety }, shade, config),
    }
  }
  return { prediction: last.prediction, recommendation: last.recommendation }
}
