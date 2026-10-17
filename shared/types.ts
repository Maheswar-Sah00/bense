// Types shared by the browser app and the API server.
import type { HairColourReading } from './domain/hairColourReading'
import type { HairProfile } from './domain/hairProfile'

export interface HealthResponse {
  status: 'ok'
  /** True when the server has a YouCam API key. The key itself is never sent. */
  youcamConfigured: boolean
  time: string
}

/** Stable error codes the frontend can branch on. */
export type ApiErrorCode =
  | 'invalid_image'
  | 'invalid_text'
  | 'not_configured'
  | 'auth_failed'
  | 'out_of_units'
  | 'rate_limited'
  | 'timeout'
  | 'render_expired'
  | 'photo_rejected'
  | 'analysis_failed'
  | 'invalid_response'
  | 'upstream_unavailable'
  | 'not_found'
  | 'internal'

export interface ApiError {
  error: string
  code?: ApiErrorCode
  /** True when trying the same request again later may work. */
  retryable?: boolean
  details?: unknown
}

export interface ColourTonesResponse {
  reading: HairColourReading
  elapsedMs: number
}

export interface RevealImage {
  /** data: URL of the rendered image (not stored anywhere on the server). */
  image: string
  colour: string
  colorIntensity: number
}

export interface RevealResponse {
  promise: RevealImage
  result: RevealImage
  elapsedMs: number
}

/** A #00FF00 Hair Color render marking the hair, used to measure the level on the device. */
export interface HairMaskResponse {
  mask: RevealImage
  elapsedMs: number
}

export interface HairAnalysisResponse {
  profile: HairProfile
  elapsedMs: number
  /** Units the planned measurements cost if they all succeed (failed tasks cost nothing). */
  unitsPlanned: number
}

/** Task lifecycle reported by the YouCam async task API. */
export type YouCamTaskStatus = 'running' | 'success' | 'error'
