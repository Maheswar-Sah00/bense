// Runs the hair finishing off the main thread (about half a second per image on a laptop).
import { alphaFromChange, alphaFromMask, finishHair, refineHairAlpha } from '../../../shared/domain/hairFinish'
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
    // The hair is where the mask render turned green or either render changed the photo,
    // grown to the loose strands YouCam missed.
    const outline = [alphaFromChange(before, promise), alphaFromChange(before, result)]
    if (mask) outline.push(alphaFromMask(mask))
    const union = outline[0].map((v, i) => Math.max(v, outline[1][i], outline[2]?.[i] ?? 0))
    const alpha = refineHairAlpha(before, union)
    const response: FinishResponse = {
      promise: finishHair(before, promise, alpha)?.image ?? null,
      result: finishHair(before, result, alpha, { maxLiftL: resultMaxLiftL })?.image ?? null,
    }
    self.postMessage(response)
  } catch (error) {
    self.postMessage({ promise: null, result: null, error: String(error) } satisfies FinishResponse)
  }
}
