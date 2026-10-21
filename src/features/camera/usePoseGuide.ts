import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPoseTracker, type HeadPose, type PoseTracker } from './headPose'
import { isSpeaking, preloadSpeech, say, stopSpeaking } from '../voice/voice'
import { POSE_INTROS, poseGuidance, posePhrases, type Guidance, type PoseView } from './poseGuide'

export interface PoseGuideState {
  tracker: 'loading' | 'ready' | 'unavailable'
  guidance: Guidance | null
  pose: HeadPose | null
  /** When the current "hold still" began, for the countdown bar. */
  holdSince: number | null
}

/** How long the user holds the right angle before the photo is taken. */
export const HOLD_MS = 1500
const FRAME_MS = 80 // ~12 detections a second is plenty for a head turn
const SETTLE_MS = 350 // an instruction must last this long before it's spoken, so the voice doesn't chatter
const REMIND_MS = 5000 // repeat an unmet instruction this often
const INTRO_MAX_MS = 9000 // stop waiting for the opening instruction even if the voice never reports the end

const VOICE_KEY = 'bense.voiceGuide'

export function readVoicePref(): boolean {
  try {
    return localStorage.getItem(VOICE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function saveVoicePref(on: boolean) {
  try {
    localStorage.setItem(VOICE_KEY, on ? 'on' : 'off')
  } catch {
    // Private mode: the choice lasts for this screen only.
  }
}

/** Vibrates where supported (Android); iPhones ignore it. */
export function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // Some browsers throw instead of ignoring.
  }
}

/**
 * Tracks the head angle on the live preview and guides the user by text, voice and vibration.
 * Calls onReady once the angle has been held for HOLD_MS, so the photo is taken at the right angle.
 */
export function usePoseGuide({
  videoRef,
  view,
  active,
  voice,
  onReady,
}: {
  videoRef: RefObject<HTMLVideoElement | null>
  view: PoseView | undefined
  active: boolean
  voice: boolean
  onReady: () => void
}): PoseGuideState {
  const [state, setState] = useState<PoseGuideState>({ tracker: 'loading', guidance: null, pose: null, holdSince: null })
  const voiceRef = useRef(voice)
  const readyRef = useRef(onReady)
  useEffect(() => {
    voiceRef.current = voice
    readyRef.current = onReady
  })

  useEffect(() => {
    if (!active || !view) return
    if (voiceRef.current) preloadSpeech([POSE_INTROS[view], ...posePhrases(view), 'Got it.'])
    let cancelled = false
    let frame = 0
    let tracker: PoseTracker | null = null
    let lastRun = 0
    let smooth: HeadPose | null = null
    let missed = 0
    let failures = 0
    let candidate = ''
    let candidateSince = 0
    let spoken = ''
    let spokenAt = 0
    let holdSince = 0
    let done = false
    const startedAt = performance.now()

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      const video = videoRef.current
      if (!tracker || !video || now - lastRun < FRAME_MS) return
      lastRun = now

      let pose: HeadPose | null
      try {
        pose = tracker.detect(video, now)
        failures = 0
      } catch {
        pose = null
        // A model that loaded but can't run here fails on every frame: say the guide is
        // unavailable instead of asking for a face forever.
        if (++failures >= 10) {
          cancelAnimationFrame(frame)
          setState((prev) => ({ ...prev, tracker: 'unavailable', guidance: null }))
          return
        }
      }
      if (pose) {
        missed = 0
        smooth = smooth
          ? {
              turn: smooth.turn + 0.4 * (pose.turn - smooth.turn),
              tilt: smooth.tilt + 0.4 * (pose.tilt - smooth.tilt),
              width: pose.width,
            }
          : pose
      } else if (++missed > 4) {
        smooth = null // a few missed frames are noise; more means the face has gone
      }

      const guidance = poseGuidance(view, smooth)
      if (guidance.key !== candidate) {
        candidate = guidance.key
        candidateSince = now
      }
      const settled = now - candidateSince >= SETTLE_MS
      const remind = guidance.status !== 'hold' && now - spokenAt >= REMIND_MS
      // Let the opening instruction finish before the first correction.
      const introPlaying = !spoken && isSpeaking() && now - startedAt < INTRO_MAX_MS
      if (settled && !introPlaying && (guidance.key !== spoken || remind)) {
        if (voiceRef.current) say(guidance.speech)
        if (guidance.key !== spoken) buzz(guidance.status === 'hold' ? [40, 60, 40] : 35)
        spoken = guidance.key
        spokenAt = now
      }

      if (guidance.status === 'hold') {
        holdSince ||= now
        if (!done && now - holdSince >= HOLD_MS) {
          done = true
          buzz(120)
          if (voiceRef.current) say('Got it.')
          readyRef.current()
        }
      } else {
        holdSince = 0
      }

      setState((prev) =>
        prev.guidance?.key === guidance.key &&
        prev.holdSince === (holdSince || null) &&
        Math.round(prev.pose?.turn ?? 999) === Math.round(smooth?.turn ?? 999) &&
        Math.round(prev.pose?.tilt ?? 999) === Math.round(smooth?.tilt ?? 999)
          ? prev
          : { tracker: 'ready', guidance, pose: smooth, holdSince: holdSince || null },
      )
    }

    createPoseTracker()
      .then((t) => {
        if (cancelled) return t.close()
        tracker = t
        setState((s) => ({ ...s, tracker: 'ready' }))
        frame = requestAnimationFrame(tick)
      })
      .catch((error: unknown) => {
        console.warn('Angle guide unavailable:', error)
        if (!cancelled) setState((s) => ({ ...s, tracker: 'unavailable' }))
      })

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      tracker?.close()
      // Keep "Got it" audible after an automatic capture; otherwise stop talking when the camera goes.
      if (!done) stopSpeaking()
      setState({ tracker: 'loading', guidance: null, pose: null, holdSince: null })
    }
  }, [active, view, videoRef])

  return state
}
