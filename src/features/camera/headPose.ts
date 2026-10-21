// Head angle from the live camera, measured on the device with MediaPipe Face Landmarker.
// Frames never leave the phone; only the angle is used, to guide the user before the photo is taken.

export interface HeadPose {
  /** Degrees. Positive: the user has turned their head to their own right (their left side faces the camera). */
  turn: number
  /** Degrees. Positive: the head is tilted down. */
  tilt: number
  /** Face width as a share of the visible preview's width (0–1): what the user sees in the oval. */
  width?: number
}

const DEG = 180 / Math.PI

/**
 * Reads yaw and pitch from MediaPipe's facial transformation matrix (4×4, column-major), on an
 * unmirrored camera frame. Signs checked on YouCam's docs photos (2026-10-16): a profile turned to
 * its own right reads turn ≈ +59°, its mirror image the opposite; front photos read tilt 9–12° and
 * head-lowered density photos 34–39°. Near-profile faces read about 60°, so the scale compresses there.
 */
export function poseFromMatrix(m: ArrayLike<number>): HeadPose {
  // Rotation part: R[row][col] = m[col * 4 + row].
  const yaw = Math.atan2(m[8], m[10]) * DEG
  const pitch = Math.atan2(-m[9], Math.hypot(m[8], m[10])) * DEG
  return { turn: -yaw, tilt: pitch }
}

export interface PoseTracker {
  detect(video: HTMLVideoElement, timestamp: number): HeadPose | null
  close(): void
}

/** Loads the model lazily (about 4 MB, then cached). Rejects if the device can't run it. */
export async function createPoseTracker(): Promise<PoseTracker> {
  // Browser tests have no real face in their fake camera, so they supply the angles instead.
  const fake = (globalThis as { __benseFakePoseTracker?: () => PoseTracker }).__benseFakePoseTracker
  if (fake) return fake()
  const landmarker = await loadLandmarker()
  return {
    detect(video, timestamp) {
      if (video.readyState < 2 || !video.videoWidth) return null
      // VIDEO mode needs rising timestamps across every screen that shares the landmarker.
      lastTimestamp = Math.max(timestamp, lastTimestamp + 1)
      const result = landmarker.detectForVideo(video, lastTimestamp)
      const matrix = result.facialTransformationMatrixes?.[0]
      const points = result.faceLandmarks?.[0]
      if (!matrix || !points) return null
      let min = 1
      let max = 0
      for (const p of points) {
        min = Math.min(min, p.x)
        max = Math.max(max, p.x)
      }
      return { ...poseFromMatrix(matrix.data), width: (max - min) / visibleWidthShare(video) }
    },
    // The shared landmarker stays loaded for the next photo.
    close: () => {},
  }
}

type Landmarker = import('@mediapipe/tasks-vision').FaceLandmarker

// One landmarker for the whole visit: setting it up (and its GPU context) takes 0.5–2 s, and every
// photo of the hair profile and each retake would otherwise pay that again.
let shared: Promise<Landmarker> | null = null
let lastTimestamp = 0

function loadLandmarker(): Promise<Landmarker> {
  shared ??= (async () => {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
    const files = await FilesetResolver.forVisionTasks('/mediapipe/wasm')
    const options = (delegate: 'GPU' | 'CPU') => ({
      baseOptions: { modelAssetPath: '/mediapipe/face_landmarker.task', delegate },
      runningMode: 'VIDEO' as const,
      numFaces: 1,
      outputFacialTransformationMatrixes: true,
    })
    return FaceLandmarker.createFromOptions(files, options('GPU')).catch(() =>
      FaceLandmarker.createFromOptions(files, options('CPU')),
    )
  })().catch((error: unknown) => {
    shared = null // a later screen can try again
    throw error
  })
  return shared
}

/** Starts downloading and setting up the face model early, e.g. while the camera intro is showing. */
export function preloadPoseTracker() {
  if ((globalThis as { __benseFakePoseTracker?: unknown }).__benseFakePoseTracker) return
  void loadLandmarker().catch(() => {})
}

/**
 * Share of the video's width the user actually sees: the preview fills its box with
 * `object-fit: cover`, so a landscape camera in a portrait oval shows only the middle.
 */
function visibleWidthShare(video: HTMLVideoElement): number {
  const box = video.clientWidth / video.clientHeight
  const frame = video.videoWidth / video.videoHeight
  return box > 0 && frame > 0 ? Math.min(1, box / frame) : 1
}
