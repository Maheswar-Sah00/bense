export type CameraIssue = 'insecure' | 'unsupported' | 'denied' | 'no-camera' | 'in-use' | 'interrupted' | 'unknown'

export const CAMERA_ISSUES: Record<CameraIssue, { title: string; message: string; canRetry: boolean }> = {
  insecure: {
    title: 'Camera needs a secure connection',
    message: 'Open the app over https to use the camera. You can upload a photo instead.',
    canRetry: false,
  },
  unsupported: {
    title: 'Camera not available',
    message: 'This browser can’t use the camera. You can upload a photo instead.',
    canRetry: false,
  },
  denied: {
    title: 'Camera access is off',
    message: 'Allow camera access for this site in your browser settings, then try again. Or upload a photo.',
    canRetry: true,
  },
  'no-camera': {
    title: 'No camera found',
    message: 'We couldn’t find a camera on this device. You can upload a photo instead.',
    canRetry: true,
  },
  'in-use': {
    title: 'Camera is busy',
    message: 'Another app may be using the camera. Close it and try again, or upload a photo.',
    canRetry: true,
  },
  interrupted: {
    title: 'Camera stopped',
    message: 'The camera was disconnected or switched off. Try again, or upload a photo.',
    canRetry: true,
  },
  unknown: {
    title: 'Camera didn’t start',
    message: 'Something went wrong starting the camera. Try again, or upload a photo.',
    canRetry: true,
  },
}

export function cameraSupportIssue(): CameraIssue | null {
  if (!window.isSecureContext) return 'insecure'
  if (!navigator.mediaDevices?.getUserMedia) return 'unsupported'
  return null
}

/** Map getUserMedia's DOMException names to user-facing issues. */
export function classifyCameraError(error: unknown): CameraIssue {
  const name = error instanceof Error || error instanceof DOMException ? error.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'denied'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'no-camera'
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'in-use'
    default:
      return 'unknown'
  }
}
