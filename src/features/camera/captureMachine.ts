// State machine for one photo capture: intro → camera → review → confirmed.
import type { CaptureSource } from '../../state/captureSession'
import type { CameraIssue } from './cameraErrors'
import type { PreparedImage } from './imageUtils'

export interface Draft extends PreparedImage {
  url: string
  source: CaptureSource
}

export type CaptureState =
  | { phase: 'intro'; notice?: string }
  | { phase: 'starting' }
  | { phase: 'live' }
  | { phase: 'camera-error'; issue: CameraIssue }
  | { phase: 'processing'; source: CaptureSource }
  | { phase: 'review'; draft: Draft }
  | { phase: 'confirmed' }

export type CaptureAction =
  | { type: 'camera-starting' }
  | { type: 'camera-live' }
  | { type: 'camera-failed'; issue: CameraIssue }
  | { type: 'processing'; source: CaptureSource }
  | { type: 'processed'; draft: Draft }
  | { type: 'failed'; message: string }
  | { type: 'confirmed' }
  | { type: 'reset'; notice?: string }

export function captureReducer(state: CaptureState, action: CaptureAction): CaptureState {
  switch (action.type) {
    case 'camera-starting':
      return { phase: 'starting' }
    case 'camera-live':
      // Ignore a late "live" if the user already cancelled or uploaded.
      return state.phase === 'starting' ? { phase: 'live' } : state
    case 'camera-failed':
      return state.phase === 'starting' || state.phase === 'live' ? { phase: 'camera-error', issue: action.issue } : state
    case 'processing':
      return { phase: 'processing', source: action.source }
    case 'processed':
      return state.phase === 'processing' ? { phase: 'review', draft: action.draft } : state
    case 'failed':
      return { phase: 'intro', notice: action.message }
    case 'confirmed':
      return state.phase === 'review' ? { phase: 'confirmed' } : state
    case 'reset':
      return { phase: 'intro', notice: action.notice }
  }
}
