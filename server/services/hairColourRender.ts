import { createHash } from 'node:crypto'
import { z } from 'zod'
import { RENDER_INTENSITY } from '../../shared/domain/predictionInput'
import { readImageInfo, type ImageType } from '../images'
import { YouCamError, type YouCamClient } from '../youcam/client'
import { TaskTimeoutError, type PollOptions } from '../youcam/poll'
import { MAX_IMAGE_BYTES, ServiceError } from './colourTones'

// YouCam Hair Color (task "hair-color"). Contract: docs/youcam-api/ai_hair_color.yaml
//   body: src_file_id + pattern {name:'full'} + palettes [{color, color_intensity, shine_intensity}]
//   result: data.results.url, "Valid for 2 hours"; 1 unit per full-mode render.

export const HAIR_COLOR_ENDPOINT = 'hair-color'

/** Same settings for both renders so the only difference is the colour. */
export const RENDER_SETTINGS = {
  colorIntensity: RENDER_INTENSITY,
} as const

export const DEFAULT_RENDER_POLL: PollOptions = { intervalMs: 2000, timeoutMs: 90_000 }

const MAX_RESULT_BYTES = 15 * 1024 * 1024

export const HexColour = z
  .string()
  .regex(/^#?[0-9a-fA-F]{6}$/, 'a 6-digit hex colour')
  .transform((v) => `#${v.replace('#', '').toUpperCase()}`)

const RenderResults = z.looseObject({ url: z.url() })

export interface RenderedImage {
  /** data: URL of the rendered JPEG/PNG. Nothing is stored server-side. */
  image: string
  colour: string
  colorIntensity: number
}

export interface RevealOutcome {
  promise: RenderedImage
  result: RenderedImage
  elapsedMs: number
}

/** Documented limits for Hair Color input (error codes give width < 1920, height < 1080, both >= 320). */
export function validateRenderImage(body: Uint8Array, contentType: string | undefined): ImageType {
  if (body.byteLength === 0) throw new ServiceError('invalid_image', 400, 'No photo was sent.')
  if (body.byteLength > MAX_IMAGE_BYTES) throw new ServiceError('invalid_image', 413, 'The photo is over 10 MB.')
  const info = readImageInfo(body)
  if (!info) throw new ServiceError('invalid_image', 415, 'The photo must be a JPEG or PNG.')
  if (contentType && contentType.split(';')[0].trim() !== info.type) {
    throw new ServiceError('invalid_image', 415, 'The photo’s type doesn’t match its content.')
  }
  if (info.width < 320 || info.height < 320) {
    throw new ServiceError('invalid_image', 422, 'The photo is too small. Use one at least 320 px on each side.')
  }
  if (info.width >= 1920 || info.height >= 1080) {
    throw new ServiceError('invalid_image', 422, 'The photo is too large for hair colour rendering.')
  }
  return info.type
}

function toServiceError(error: unknown): ServiceError {
  if (error instanceof ServiceError) return error
  if (error instanceof TaskTimeoutError) {
    return new ServiceError('timeout', 504, 'Rendering took too long. Try again in a moment.', true)
  }
  if (error instanceof YouCamError) {
    if (error.status === undefined) {
      return new ServiceError('upstream_unavailable', 502, 'The rendering service couldn’t be reached. Try again.', true)
    }
    if (error.status === 401) return new ServiceError('auth_failed', 503, 'The rendering service rejected our credentials.')
    if (error.errorCode === 'CreditInsufficiency') {
      return new ServiceError('out_of_units', 503, 'The rendering service has run out of credits for now.')
    }
    if (error.status === 429) {
      return new ServiceError('rate_limited', 429, 'The rendering service is busy. Wait a minute and try again.', true)
    }
    if (error.errorCode === 'InvalidResponse') {
      return new ServiceError('invalid_response', 502, 'The rendering service sent an unexpected reply.', true)
    }
    return new ServiceError('upstream_unavailable', 502, 'The rendering service had a problem. Try again.', true)
  }
  throw error
}

/** Download a result while its 2-hour URL is still valid, and check it really is an image. */
async function download(url: string, fetchImpl: typeof fetch): Promise<{ bytes: Buffer; type: ImageType }> {
  let res: Response
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(30_000) })
  } catch {
    throw new ServiceError('upstream_unavailable', 502, 'The rendered image couldn’t be downloaded. Try again.', true)
  }
  if (res.status === 403 || res.status === 404 || res.status === 410) {
    throw new ServiceError('render_expired', 502, 'The rendered image link expired before we could fetch it. Try again.', true)
  }
  if (!res.ok) throw new ServiceError('upstream_unavailable', 502, 'The rendered image couldn’t be downloaded.', true)
  const bytes = Buffer.from(await res.arrayBuffer())
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_RESULT_BYTES) {
    throw new ServiceError('invalid_response', 502, 'The rendered image was empty or too large.', true)
  }
  // S3 may label results application/octet-stream, so trust the bytes, not the header.
  const info = readImageInfo(bytes)
  if (!info) throw new ServiceError('invalid_response', 502, 'The rendering service didn’t return an image.', true)
  return { bytes, type: info.type }
}

interface RenderOptions {
  poll?: PollOptions
  fetchImpl?: typeof fetch
  colorIntensity?: number
}

async function renderOne(
  client: YouCamClient,
  fileId: string,
  colour: string,
  { poll = DEFAULT_RENDER_POLL, fetchImpl = fetch, colorIntensity = RENDER_SETTINGS.colorIntensity }: RenderOptions,
): Promise<RenderedImage> {
  const task = await client.runTask(
    HAIR_COLOR_ENDPOINT,
    {
      src_file_id: fileId,
      pattern: { name: 'full' },
      palettes: [{ color: colour, color_intensity: colorIntensity }],
    },
    poll,
  )
  if (task.status === 'error') {
    const code = task.engineError ?? 'unknown_internal_error'
    throw code === 'error_below_min_image_size' || code === 'error_exceed_max_image_size' || code === 'error_decode_image'
      ? new ServiceError('photo_rejected', 422, 'This photo can’t be used for rendering. Take a new one.')
      : new ServiceError('analysis_failed', 502, 'The hair colour render failed. Try again.', true)
  }
  const results = RenderResults.safeParse(task.results)
  if (!results.success) throw new ServiceError('invalid_response', 502, 'The render finished without an image.', true)
  const { bytes, type } = await download(results.data.url, fetchImpl)
  return {
    image: `data:${type};base64,${bytes.toString('base64')}`,
    colour,
    colorIntensity,
  }
}

/** Upload the confirmed photo once, then render both colours in parallel. */
export async function renderReveal(
  client: YouCamClient,
  image: Uint8Array,
  contentType: ImageType,
  colours: { promise: string; result: string },
  options: RenderOptions = {},
): Promise<RevealOutcome> {
  const started = Date.now()
  try {
    const ext = contentType === 'image/png' ? 'png' : 'jpg'
    const fileId = await client.uploadImage(image, `selfie.${ext}`, contentType)
    const [promise, result] = await Promise.all([
      renderOne(client, fileId, colours.promise, options),
      // Same colour twice (target reached) needs only one render.
      colours.result === colours.promise ? null : renderOne(client, fileId, colours.result, options),
    ])
    return { promise, result: result ?? promise, elapsedMs: Date.now() - started }
  } catch (error) {
    throw toServiceError(error)
  }
}

/**
 * Joins identical requests that are already running (double taps, two tabs), so the same
 * photo and colours are never paid for twice at once. Nothing is kept after completion.
 */
export class InFlight<T> {
  private readonly running = new Map<string, Promise<T>>()

  static key(image: Uint8Array, ...parts: string[]): string {
    return createHash('sha256').update(image).update(parts.join('|')).digest('hex')
  }

  get size() {
    return this.running.size
  }

  run(key: string, task: () => Promise<T>): { promise: Promise<T>; joined: boolean } {
    const existing = this.running.get(key)
    if (existing) return { promise: existing, joined: true }
    const promise = task().finally(() => this.running.delete(key))
    this.running.set(key, promise)
    return { promise, joined: false }
  }
}
