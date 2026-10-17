// Runs the hair finishing off the main thread (about half a second per image on a laptop).
import { alphaFromChange, alphaFromMask, finishHair } from '../../../shared/domain/hairFinish'
import type { RgbaImage } from '../../../shared/domain/hairLevelMeasure'

export interface FinishRequest {
  before: RgbaImage
  promise: RgbaImage
  result: RgbaImage
  mask?: RgbaImage
  resultMaxLiftL?: number
}

export interface FinishResponse {
  promise: RgbaImage | null
  result: RgbaImage | null
  error?: string
}

self.onmessage = (event: MessageEvent<FinishRequest>) => {
  const { before, promise, result, mask, resultMaxLiftL } = event.data
  try {
    let alpha: Float32Array
    if (mask) {
      alpha = alphaFromMask(mask)
    } else {
      // No mask render for this photo: the hair is where either render changed it.
      alpha = alphaFromChange(before, promise)
      const other = alphaFromChange(before, result)
      for (let i = 0; i < alpha.length; i++) alpha[i] = Math.max(alpha[i], other[i])
    }
    const response: FinishResponse = {
      promise: finishHair(before, promise, alpha)?.image ?? null,
      result: finishHair(before, result, alpha, { maxLiftL: resultMaxLiftL })?.image ?? null,
    }
    self.postMessage(response)
  } catch (error) {
    self.postMessage({ promise: null, result: null, error: String(error) } satisfies FinishResponse)
  }
}
