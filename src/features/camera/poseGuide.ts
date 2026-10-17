// What to tell the user while they line up a hair-analysis photo, from their head angle.
// YouCam's rules (docs/youcam-api/ai_hair_*_detection.yaml): front within 10° of straight; sides
// "about 45 degrees", turned more than 15°, head level "with no tilting up, down, or sideways";
// face "around 50% to 80% of the image width"; density: face the camera, then lower the head
// about 45° with the face still detectable (error_no_face otherwise). Its docs' full 90° profiles
// were rejected, and MediaPipe reads a 90° profile as about 60°, so the side zone stays well below that.
import type { AnalysisView } from '../../state/captureSession'
import type { HeadPose } from './headPose'

export type GuideStatus = 'searching' | 'adjust' | 'hold'

export interface Guidance {
  status: GuideStatus
  /** Stable id of the instruction, so speech and vibration fire only when it changes. */
  key: string
  /** Short on-screen text. */
  text: string
  /** What the voice says. */
  speech: string
}

interface Range {
  min: number
  max: number
}

/**
 * Accepted angles, in the units of `poseFromMatrix`, and the face width as a share of the frame.
 * A level head reads tilt 9–12° on YouCam's own front photos, so "level" is centred there.
 */
export const POSE_TARGETS: Record<AnalysisView, { turn: Range; tilt: Range; width?: Range }> = {
  front: { turn: { min: -7, max: 7 }, tilt: { min: -1, max: 20 }, width: { min: 0.45, max: 0.85 } },
  left45: { turn: { min: 25, max: 45 }, tilt: { min: -2, max: 20 }, width: { min: 0.33, max: 0.85 } },
  right45: { turn: { min: -45, max: -25 }, tilt: { min: -2, max: 20 }, width: { min: 0.33, max: 0.85 } },
  top: { turn: { min: -12, max: 12 }, tilt: { min: 22, max: 42 } },
}

/** Spoken once when the camera starts, so the user knows what to do without reading. */
export const POSE_INTROS: Record<AnalysisView, string> = {
  front: 'Look straight at the camera. I’ll take the photo when you’re lined up.',
  left45: 'Turn your face about 45 degrees to your right. I’ll tell you when it’s right.',
  right45: 'Turn your face about 45 degrees to your left. I’ll tell you when it’s right.',
  top: 'Hold the phone in front of your face, then lower your head a little, so your hairline shows and your face stays just visible.',
}

const g = (status: GuideStatus, key: string, text: string, speech: string): Guidance => ({ status, key, text, speech })

export function poseGuidance(view: AnalysisView, pose: HeadPose | null): Guidance {
  const target = POSE_TARGETS[view]
  if (!pose) {
    return view === 'top'
      ? g('searching', 'no-face', 'Keep your face just visible', 'I can’t see your face. Keep the phone in front of your face and lower your head a little less.')
      : g('searching', 'no-face', 'Show your face in the oval', 'I can’t see your face. Move it into the oval.')
  }
  const { turn, tilt } = pose

  if (view === 'left45' || view === 'right45') {
    const side = view === 'left45' ? 'right' : 'left'
    const other = side === 'right' ? 'left' : 'right'
    const signed = view === 'left45' ? turn : -turn // positive = turned the asked way
    const least = Math.min(Math.abs(target.turn.min), Math.abs(target.turn.max))
    const most = Math.max(Math.abs(target.turn.min), Math.abs(target.turn.max))
    if (signed < -10) {
      return g('adjust', 'wrong-way', `Other way: turn to your ${side}`, `You’re turning to your ${other}. Turn the other way, to your ${side}.`)
    }
    if (signed < least) {
      return g('adjust', 'turn-more', `Turn more to your ${side}`, `Your face isn’t at 45 degrees yet. Keep turning to your ${side}.`)
    }
    if (signed > most) {
      return g('adjust', 'turn-back', 'Too far, turn back a little', 'That’s too far. Turn back a little towards the camera.')
    }
  }

  if (view === 'front' && (turn < target.turn.min || turn > target.turn.max)) {
    // turn > 0 means turned to their right, so they need to come back to their left.
    const back = turn > 0 ? 'left' : 'right'
    return g('adjust', `face-${back}`, `Turn slightly to your ${back}`, `Turn slightly to your ${back}, so you face the camera.`)
  }

  if (view === 'top') {
    if (tilt < target.tilt.min) return g('adjust', 'tilt-more', 'Tilt your head down more', 'Tilt your head down a bit more.')
    if (tilt > target.tilt.max) {
      return g('adjust', 'tilt-less', 'Not so far, keep your face visible', 'That’s too far. Lift your head a little, so your face stays visible.')
    }
    if (turn < target.turn.min || turn > target.turn.max) {
      return g('adjust', 'straight', 'Keep your head straight', 'Keep your head straight. Don’t turn it to the side.')
    }
  } else {
    if (tilt > target.tilt.max) return g('adjust', 'chin-up', 'Lift your chin a little', 'Keep your head level. Lift your chin a little.')
    if (tilt < target.tilt.min) return g('adjust', 'chin-down', 'Lower your chin a little', 'Keep your head level. Lower your chin a little.')
  }

  if (target.width && pose.width !== undefined) {
    if (pose.width < target.width.min) return g('adjust', 'closer', 'Move the phone closer', 'Your face is too small. Move the phone a little closer.')
    if (pose.width > target.width.max) return g('adjust', 'farther', 'Move the phone back a little', 'You’re too close. Move the phone back a little.')
  }

  return g('hold', 'hold', 'Perfect. Hold still', 'Perfect. Hold still.')
}

/** The angle the gauge shows for a view: turn for the front and sides, tilt for the top. */
export const gaugeAxis = (view: AnalysisView): 'turn' | 'tilt' => (view === 'top' ? 'tilt' : 'turn')

/** Every line the guide can say for a view, so the voice can be fetched before the camera opens. */
export function posePhrases(view: AnalysisView): string[] {
  const lines = new Set([poseGuidance(view, null).speech])
  for (let turn = -80; turn <= 80; turn += 4) {
    for (let tilt = -20; tilt <= 70; tilt += 4) {
      for (const width of [0.1, 0.6, 1]) lines.add(poseGuidance(view, { turn, tilt, width }).speech)
    }
  }
  return [...lines]
}
