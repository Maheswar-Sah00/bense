import { Icon } from '../../components/ui/Icon'
import type { AnalysisView } from '../../state/captureSession'
import { gaugeAxis, POSE_TARGETS } from './poseGuide'
import { HOLD_MS, type PoseGuideState } from './usePoseGuide'

const AIM: Record<AnalysisView, string> = {
  front: 'turn · aim for the green zone',
  left45: 'turn · aim for the green zone',
  right45: 'turn · aim for the green zone',
  top: 'tilt down · aim for the green zone',
}

/** Live instruction, angle gauge and hold countdown, drawn over the camera preview. */
export function PoseGuidePanel({
  view,
  state,
  voice,
  onVoiceChange,
}: {
  view: AnalysisView
  state: PoseGuideState
  voice: boolean
  onVoiceChange: (on: boolean) => void
}) {
  const { tracker, guidance, pose, holdSince } = state
  const axis = gaugeAxis(view)
  // The preview is mirrored, so turning to your right moves the marker right.
  const scale = axis === 'turn' ? { min: -70, max: 70 } : { min: -10, max: 70 }
  const pct = (v: number) => ((Math.min(scale.max, Math.max(scale.min, v)) - scale.min) / (scale.max - scale.min)) * 100
  const band = POSE_TARGETS[view][axis]
  const value = pose?.[axis]
  const status = tracker === 'ready' ? (guidance?.status ?? 'searching') : 'searching'
  const text =
    tracker === 'loading'
      ? 'Starting the angle guide…'
      : tracker === 'unavailable'
        ? 'Angle guide unavailable. Line up with the outline and tap the shutter.'
        : (guidance?.text ?? 'Show your face in the oval')

  return (
    <>
      <div className={`pose-guide pose-${status}`} data-pose={guidance?.key ?? tracker}>
        <p className="pose-text" role="status" aria-live="polite">
          {text}
        </p>
        {tracker === 'ready' && (
          <div className="pose-meter" aria-hidden="true">
            <div className="pose-track">
              <span className="pose-band" style={{ left: `${pct(band.min)}%`, width: `${pct(band.max) - pct(band.min)}%` }} />
              {value !== undefined && <span className="pose-marker" style={{ left: `${pct(value)}%` }} />}
            </div>
            <span className="pose-angle">
              {value === undefined ? 'No face yet' : `${Math.round(axis === 'turn' ? Math.abs(value) : value)}°`} · {AIM[view]}
            </span>
          </div>
        )}
        {holdSince && <span key={holdSince} className="pose-hold" style={{ animationDuration: `${HOLD_MS}ms` }} />}
      </div>
      <button
        type="button"
        className="pose-voice"
        aria-pressed={voice}
        aria-label="Voice guide"
        onClick={() => onVoiceChange(!voice)}
      >
        <Icon name={voice ? 'voice' : 'voice-off'} size={20} />
      </button>
    </>
  )
}
