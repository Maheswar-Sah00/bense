import { z } from 'zod'
import { normaliseColourTones, type HairColourReading } from '../../shared/domain/hairColourReading'
import type { ApiErrorCode } from '../../shared/types'
import { readImageInfo, type ImageType } from '../images'
import { YouCamError, type YouCamClient } from '../youcam/client'
import { TaskTimeoutError, type PollOptions } from '../youcam/poll'

// YouCam Facial Color Tones (task "skin-tone-analysis"). Contract: docs/youcam-api/ai_skin_tone_analysis.yaml

export const COLOUR_TONES_ENDPOINT = 'skin-tone-analysis'
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // documented: < 10 MB
const MIN_SIDE = 320 // documented: error_below_min_image_size
const MAX_LONG_SIDE = 4096 // documented: long side <= 4096
// 'medium' allows up to 15° of pitch/yaw/roll (default 'high' allows 10°). Hair colour is
// less angle-sensitive than face attributes, and phone selfies with a card are rarely square-on.
const STRICTNESS = 'medium'

export const DEFAULT_POLL: PollOptions = { intervalMs: 3000, timeoutMs: 90_000 }

export class ServiceError extends Error {
  readonly code: ApiErrorCode
  readonly httpStatus: number
  readonly retryable: boolean

  constructor(code: ApiErrorCode, httpStatus: number, message: string, retryable = false) {
    super(message)
    this.code = code
    this.httpStatus = httpStatus
    this.retryable = retryable
  }
}

/** User-facing guidance for documented engine error codes. */
const ENGINE_ERRORS: Record<string, string> = {
  error_face_position_too_small: 'Your face is too small in the photo. Move closer so your face fills most of the frame width.',
  error_face_position_invalid: 'Keep your whole face in the frame, centred and facing the camera.',
  error_face_position_out_of_boundary: 'Part of your face is outside the photo. Keep your whole face in the frame.',
  error_face_not_forward_facing: 'Face the camera directly.',
  error_face_angle_upward: 'Your face is tilted up. Tilt your head down slightly.',
  error_face_angle_downward: 'Your face is tilted down. Tilt your head up slightly.',
  error_face_angle_leftward: 'Your head is turned. Turn it slightly back to the right.',
  error_face_angle_rightward: 'Your head is turned. Turn it slightly back to the left.',
  error_face_angle_left_tilt: 'Your head is tilted. Tilt it gently to the right.',
  error_face_angle_right_tilt: 'Your head is tilted. Tilt it gently to the left.',
  error_no_face: 'We couldn’t find a face. Use a clear, front-facing selfie.',
  error_multiple_people: 'Only one person should be in the photo.',
  error_large_face_angle: 'Your face is at too much of an angle. Face the camera.',
  error_face_parsing: 'We couldn’t read your face and hair clearly. Try a sharper photo in even light.',
  error_below_min_image_size: 'The photo is too small. Use one at least 320 px on each side.',
  error_exceed_max_image_size: 'The photo is too large.',
  exceed_max_filesize: 'The photo file is too large.',
  error_decode_image: 'The photo couldn’t be read. Take a new one.',
  error_nsfw_content_detected: 'This photo can’t be analysed. Use a regular selfie.',
}

const ColourResults = z.looseObject({
  color: z.looseObject({ hair_color: z.unknown().optional(), hair_color_name: z.unknown().optional() }).nullish(),
  face_quality: z.record(z.string(), z.unknown()).nullish(),
})

export function validateImage(body: Uint8Array, contentType: string | undefined): ImageType {
  if (body.byteLength === 0) throw new ServiceError('invalid_image', 400, 'No photo was sent.')
  if (body.byteLength > MAX_IMAGE_BYTES) throw new ServiceError('invalid_image', 413, 'The photo is over 10 MB.')
  const info = readImageInfo(body)
  if (!info) throw new ServiceError('invalid_image', 415, 'The photo must be a JPEG or PNG.')
  if (contentType && contentType.split(';')[0].trim() !== info.type) {
    throw new ServiceError('invalid_image', 415, 'The photo’s type doesn’t match its content.')
  }
  if (Math.min(info.width, info.height) < MIN_SIDE) {
    throw new ServiceError('invalid_image', 422, 'The photo is too small. Use one at least 320 px on each side.')
  }
  if (Math.max(info.width, info.height) > MAX_LONG_SIDE) {
    throw new ServiceError('invalid_image', 422, 'The photo is too large. Keep the long side under 4096 px.')
  }
  return info.type
}

function fromYouCamError(error: YouCamError): ServiceError {
  if (error.status === undefined) {
    return new ServiceError('upstream_unavailable', 502, 'The analysis service couldn’t be reached. Try again.', true)
  }
  if (error.errorCode === 'InvalidResponse') {
    return new ServiceError('invalid_response', 502, 'The analysis service sent an unexpected reply.', true)
  }
  if (error.status === 401) {
    return new ServiceError('auth_failed', 503, 'The analysis service rejected our credentials.')
  }
  if (error.errorCode === 'CreditInsufficiency') {
    return new ServiceError('out_of_units', 503, 'The analysis service has run out of credits for now.')
  }
  if (error.status === 429) {
    return new ServiceError('rate_limited', 429, 'The analysis service is busy. Wait a minute and try again.', true)
  }
  if (error.status === 400 && /task/i.test(error.message)) {
    return new ServiceError('timeout', 504, 'The analysis expired before it finished. Try again.', true)
  }
  if (error.status >= 500) {
    return new ServiceError('upstream_unavailable', 502, 'The analysis service had a problem. Try again.', true)
  }
  return new ServiceError('analysis_failed', 502, 'The analysis request was rejected.')
}

export interface ColourTonesOutcome {
  reading: HairColourReading
  elapsedMs: number
}

/** Upload one confirmed selfie, run Facial Color Tones, and return the normalised reading. */
export async function analyseColourTones(
  client: YouCamClient,
  image: Uint8Array,
  contentType: ImageType,
  poll: PollOptions = DEFAULT_POLL,
): Promise<ColourTonesOutcome> {
  const started = Date.now()
  try {
    const ext = contentType === 'image/png' ? 'png' : 'jpg'
    const fileId = await client.uploadImage(image, `selfie.${ext}`, contentType)
    const task = await client.runTask(
      COLOUR_TONES_ENDPOINT,
      { src_file_id: fileId, face_angle_strictness_level: STRICTNESS },
      poll,
    )

    if (task.status === 'error') {
      const code = task.engineError ?? 'unknown_internal_error'
      const guidance = ENGINE_ERRORS[code]
      throw guidance
        ? new ServiceError('photo_rejected', 422, guidance)
        : new ServiceError('analysis_failed', 502, 'The analysis couldn’t finish. Try again, or choose your level yourself.', true)
    }

    const results = ColourResults.safeParse(task.results)
    if (!results.success) {
      throw new ServiceError('invalid_response', 502, 'The analysis returned results we couldn’t read.', true)
    }
    return { reading: normaliseColourTones(results.data), elapsedMs: Date.now() - started }
  } catch (error) {
    if (error instanceof ServiceError) throw error
    if (error instanceof TaskTimeoutError) {
      throw new ServiceError('timeout', 504, 'The analysis took too long. Try again in a moment.', true)
    }
    if (error instanceof YouCamError) throw fromYouCamError(error)
    throw error
  }
}
