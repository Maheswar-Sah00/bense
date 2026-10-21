// Browser side of the hair finishing: decodes the photo and both YouCam renders to the same size,
// finishes them in a worker (shared/domain/hairFinish.ts), and returns object URLs.
// If anything doesn't line up, the raw YouCam renders are shown instead.
import { useEffect, useState } from 'react'
import { levelToLightness } from '../../../shared/domain/shadeCatalogue'
import type { RgbaImage } from '../../../shared/domain/hairLevelMeasure'
import type { FinishRequest, FinishResponse } from './finishWorker'

/** Long side for finishing; photos are already at most 1024 px. */
const WORK_SIDE = 1024

export interface FinishSource {
  /** The original photo the renders were made from. */
  before: Blob | string
  /** YouCam's #00FF00 render of the same photo, if the level was measured. */
  mask?: Blob
  /** Levels the prediction says the hair rises; caps the "probable result" picture. */
  resultLiftLevels?: number
}

const L_PER_LEVEL = levelToLightness(2) - levelToLightness(1)

/** L* the result may rise above the hair, from the predicted level change. */
export const liftToLightness = (levels: number) => Math.max(0, levels) * L_PER_LEVEL

async function bitmap(src: Blob | string): Promise<ImageBitmap> {
  const blob = typeof src === 'string' ? await (await fetch(src)).blob() : src
  return createImageBitmap(blob)
}

function pixels(image: ImageBitmap, width: number, height: number): RgbaImage {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('This browser can’t read image pixels.')
  ctx.drawImage(image, 0, 0, width, height)
  return { width, height, data: ctx.getImageData(0, 0, width, height).data, channels: 4 }
}

async function encode(image: RgbaImage): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser can’t draw images.')
  ctx.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
  if (!blob) throw new Error('Couldn’t encode the finished image.')
  return URL.createObjectURL(blob)
}

/** Runs the finishing in a worker; aborting stops it at once. The pixel buffers are handed over, not copied. */
function runWorker(request: FinishRequest, signal?: AbortSignal): Promise<FinishResponse> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./finishWorker.ts', import.meta.url), { type: 'module' })
    const done = () => {
      worker.terminate()
      signal?.removeEventListener('abort', abort)
    }
    const abort = () => {
      done()
      reject(new DOMException('Finishing was cancelled.', 'AbortError'))
    }
    if (signal?.aborted) return abort()
    signal?.addEventListener('abort', abort)
    worker.onmessage = (event: MessageEvent<FinishResponse>) => {
      done()
      resolve(event.data)
    }
    worker.onerror = (event) => {
      done()
      reject(new Error(event.message))
    }
    const images = [request.before, request.promise, request.result, request.mask].filter((img) => !!img)
    worker.postMessage(request, images.map((img) => img.data.buffer as ArrayBuffer))
  })
}

const sameShape = (a: ImageBitmap, b: ImageBitmap) => Math.abs(a.width / a.height - b.width / b.height) <= 0.02

/** Finished object URLs (null where the raw render should be kept). Caller revokes them. */
export async function finishPair(
  source: FinishSource,
  promise: string,
  result: string,
  signal?: AbortSignal,
): Promise<{ promise: string | null; result: string | null }> {
  const maps = await Promise.all([bitmap(source.before), bitmap(promise), bitmap(result), source.mask ? bitmap(source.mask) : null])
  const [b, p, r, m] = maps
  try {
    if (!sameShape(b, p) || !sameShape(b, r) || (m && !sameShape(b, m))) return { promise: null, result: null }
    const scale = Math.min(1, WORK_SIDE / Math.max(b.width, b.height))
    const width = Math.round(b.width * scale)
    const height = Math.round(b.height * scale)
    const response = await runWorker({
      before: pixels(b, width, height),
      promise: pixels(p, width, height),
      result: pixels(r, width, height),
      mask: m ? pixels(m, width, height) : undefined,
      resultMaxLiftL: source.resultLiftLevels === undefined ? undefined : liftToLightness(source.resultLiftLevels),
    }, signal)
    return {
      promise: response.promise ? await encode(response.promise) : null,
      result: response.result ? await encode(response.result) : null,
    }
  } finally {
    for (const map of maps) map?.close()
  }
}

/** The pair to show: raw renders at once, swapped for the finished ones when ready. */
export function useFinishedPair(promise: string, result: string, source?: FinishSource) {
  const [state, setState] = useState<{ key: string; promise: string | null; result: string | null; done: boolean }>()
  const key = `${promise}|${result}|${typeof source?.before === 'string' ? source.before : 'blob'}|${source?.resultLiftLevels}`

  useEffect(() => {
    if (!source) return
    let cancelled = false
    const made: string[] = []
    const controller = new AbortController()
    finishPair(source, promise, result, controller.signal)
      .then((out) => {
        for (const url of [out.promise, out.result]) if (url) made.push(url)
        if (cancelled) made.forEach((url) => URL.revokeObjectURL(url))
        else setState({ key, ...out, done: true })
      })
      .catch(() => {
        if (!cancelled) setState({ key, promise: null, result: null, done: true })
      })
    return () => {
      cancelled = true
      controller.abort()
      made.forEach((url) => URL.revokeObjectURL(url))
    }
    // The key captures every input that changes the output.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const current = state?.key === key ? state : undefined
  return {
    promise: current?.promise ?? promise,
    result: current?.result ?? result,
    finishing: !!source && !current?.done,
    /** Both pictures were finished on the device (not just YouCam's raw renders). */
    finished: !!current?.promise && !!current?.result,
  }
}
