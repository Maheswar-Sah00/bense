import { useCallback, useEffect, useRef } from 'react'
import { cameraSupportIssue, classifyCameraError, type CameraIssue } from './cameraErrors'

export type Facing = 'user' | 'environment'

/**
 * Owns one camera stream. The stream is stopped on stop(), on unmount (leaving the
 * screen), and when a permission prompt resolves after the screen has already gone.
 */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mountedRef = useRef(false)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stop()
    }
  }, [stop])

  /** Ask for the camera and attach it to the video element. Resolves to an issue, or null when live. */
  const start = useCallback(
    async (facing: Facing, onInterrupted: () => void): Promise<CameraIssue | null> => {
      const unsupported = cameraSupportIssue()
      if (unsupported) return unsupported
      stop()

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } },
        })
      } catch (error) {
        return classifyCameraError(error)
      }

      const video = videoRef.current
      if (!mountedRef.current || !video) {
        stream.getTracks().forEach((track) => track.stop())
        return mountedRef.current ? 'unknown' : null
      }

      streamRef.current = stream
      stream.getVideoTracks()[0]?.addEventListener('ended', onInterrupted)
      video.srcObject = stream
      try {
        await video.play()
      } catch {
        // play() can reject if interrupted by a quick stop(); the stream state is handled above.
      }
      return null
    },
    [stop],
  )

  return { videoRef, start, stop }
}
