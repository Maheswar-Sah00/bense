// Where a result shown in the app came from. Live YouCam output, the rules engine and demo
// fixtures must never be confused, so every demo screen labels its results with one of these.

export type YouCamService =
  | 'facial-color-tones'
  | 'hair-color'
  | 'hair-type-detection'
  | 'hair-frizziness-detection'
  | 'hair-length-detection'
  | 'hair-density-detection'

export type ResultOrigin =
  /** Returned by YouCam for the user's own photo, in this session. */
  | { kind: 'live'; service: YouCamService }
  /** Calculated on the device by the Box Truth rules from the inputs shown. */
  | { kind: 'deterministic'; liftLevels: number }
  /** A prepared example. Never the user's photo, never presented as a live result. */
  | { kind: 'demo-fixture'; provenance: string }
  /** Not available: the task failed, wasn't run, or there's no genuine asset for it. */
  | { kind: 'unavailable'; reason: string }

export interface WithOrigin<T> {
  origin: ResultOrigin
  value: T
}

export const ORIGIN_LABELS: Record<ResultOrigin['kind'], string> = {
  live: 'Live YouCam',
  deterministic: 'Calculated by rules',
  'demo-fixture': 'Demo example',
  unavailable: 'Not available',
}
