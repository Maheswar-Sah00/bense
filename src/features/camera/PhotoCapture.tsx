import { useEffect, useReducer, useRef, useState, type ChangeEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Icon, type IconName } from '../../components/ui/Icon'
import { LoadingState } from '../../components/ui/States'
import type { AnalysisView, CapturedPhoto, CaptureSource, CaptureView } from '../../state/captureSession'
import { CAMERA_ISSUES } from './cameraErrors'
import { captureReducer, type Draft } from './captureMachine'
import { CaptureOverlay, type OverlayKind } from './CaptureOverlay'
import { captureVideoFrame, ImageError, prepareUpload, type PreparedImage } from './imageUtils'
import { POSE_INTROS } from './poseGuide'
import { PoseGuidePanel } from './PoseGuidePanel'
import { useCamera, type Facing } from './useCamera'
import { readVoicePref, saveVoicePref, speak, usePoseGuide } from './usePoseGuide'

export interface CaptureGuide {
  overlay: OverlayKind
  tips: { icon: IconName; title: string; text?: string }[]
  /** Why the photo is needed, shown before the camera or upload is used. */
  why: string
  reviewChecks: string[]
}

interface PhotoCaptureProps {
  view: CaptureView
  guide: CaptureGuide
  /** The confirmed photo for this view, if any. */
  photo?: CapturedPhoto
  onConfirm: (photo: CapturedPhoto) => void
  facing?: Facing
  /** Hair-analysis views: guide the head angle live (text, voice, vibration) and take the photo when it's right. */
  poseView?: AnalysisView
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/**
 * The one capture component used by every feature: live camera with framing guide,
 * upload fallback, review, retake and confirm.
 */
export function PhotoCapture({ view, guide, photo, onConfirm, facing = 'user', poseView }: PhotoCaptureProps) {
  const [state, dispatch] = useReducer(captureReducer, photo ? { phase: 'confirmed' } : { phase: 'intro' })
  const { videoRef, start: startStream, stop: stopCamera } = useCamera()
  const fileRef = useRef<HTMLInputElement>(null)
  // The unconfirmed draft's object URL is ours to revoke; once confirmed, the session owns it.
  const draftRef = useRef<Draft | null>(null)

  const discardDraft = () => {
    if (draftRef.current) URL.revokeObjectURL(draftRef.current.url)
    draftRef.current = null
  }

  useEffect(
    () => () => {
      if (draftRef.current) URL.revokeObjectURL(draftRef.current.url)
    },
    [],
  )

  // Release the camera if the app goes to the background.
  const cameraOn = state.phase === 'starting' || state.phase === 'live'
  useEffect(() => {
    if (!cameraOn) return
    const onHidden = () => {
      if (!document.hidden) return
      stopCamera()
      dispatch({ type: 'reset', notice: 'The camera was paused while the app was in the background.' })
    }
    document.addEventListener('visibilitychange', onHidden)
    return () => document.removeEventListener('visibilitychange', onHidden)
  }, [cameraOn, stopCamera])

  const [voice, setVoice] = useState(readVoicePref)
  const pose = usePoseGuide({
    videoRef,
    view: poseView,
    active: state.phase === 'live',
    voice,
    onReady: () => void capture(),
  })

  function changeVoice(on: boolean) {
    setVoice(on)
    saveVoicePref(on)
    if (!on) window.speechSynthesis?.cancel()
    else if (poseView) speak('Voice guide on.')
  }

  async function startCamera() {
    // Spoken inside the tap, which also lets iPhones speak later instructions.
    if (poseView && voice) speak(POSE_INTROS[poseView])
    dispatch({ type: 'camera-starting' })
    const issue = await startStream(facing, () => dispatch({ type: 'camera-failed', issue: 'interrupted' }))
    dispatch(issue ? { type: 'camera-failed', issue } : { type: 'camera-live' })
  }

  function toDraft(image: PreparedImage, source: CaptureSource) {
    const draft: Draft = { ...image, source, url: URL.createObjectURL(image.blob) }
    draftRef.current = draft
    dispatch({ type: 'processed', draft })
  }

  async function capture() {
    const video = videoRef.current
    if (!video) return
    dispatch({ type: 'processing', source: 'camera' })
    try {
      const image = await captureVideoFrame(video)
      stopCamera()
      toDraft(image, 'camera')
    } catch (error) {
      stopCamera()
      dispatch({ type: 'failed', message: error instanceof ImageError ? error.message : 'Capture failed. Try again.' })
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow choosing the same file again
    if (!file) return
    stopCamera()
    dispatch({ type: 'processing', source: 'upload' })
    try {
      toDraft(await prepareUpload(file), 'upload')
    } catch (error) {
      dispatch({ type: 'failed', message: error instanceof ImageError ? error.message : 'We couldn’t use that photo.' })
    }
  }

  function retake(draft: Draft) {
    discardDraft()
    if (draft.source === 'camera') void startCamera()
    else dispatch({ type: 'reset' })
  }

  function confirm(draft: Draft) {
    draftRef.current = null
    const { blob, url, width, height, source } = draft
    onConfirm({ id: newId(), view, blob, url, width, height, source, capturedAt: Date.now() })
    dispatch({ type: 'confirmed' })
  }

  function cancelCamera() {
    stopCamera()
    dispatch({ type: 'reset' })
  }

  const openFiles = () => fileRef.current?.click()
  const fileInput = <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} data-testid="capture-file" />

  if (state.phase === 'starting' || state.phase === 'live') {
    return (
      <div className="capture" data-phase={state.phase}>
        <div
          className={
            poseView && state.phase === 'live' && pose.tracker === 'ready'
              ? `capture-frame is-live pose-frame-${pose.guidance?.status ?? 'searching'}`
              : 'capture-frame is-live'
          }
        >
          <video
            ref={videoRef}
            className={facing === 'user' ? 'mirrored' : undefined}
            autoPlay
            muted
            playsInline
            aria-label="Camera preview"
          />
          {state.phase === 'live' ? (
            <>
              <CaptureOverlay kind={guide.overlay} />
              {poseView && <PoseGuidePanel view={poseView} state={pose} voice={voice} onVoiceChange={changeVoice} />}
            </>
          ) : (
            <div className="capture-wait">
              <LoadingState label="Waiting for the camera… allow access if your browser asks." />
            </div>
          )}
        </div>
        <div className="shutter-row">
          <Button size="sm" variant="tertiary" onClick={cancelCamera}>
            Cancel
          </Button>
          <button
            type="button"
            className="shutter"
            aria-label="Take photo"
            onClick={capture}
            disabled={state.phase !== 'live'}
          />
          <Button size="sm" variant="tertiary" onClick={openFiles}>
            Upload
          </Button>
        </div>
        {fileInput}
      </div>
    )
  }

  if (state.phase === 'processing') {
    return (
      <div className="capture" data-phase="processing">
        <div className="capture-frame">
          <LoadingState label="Preparing photo…" />
        </div>
      </div>
    )
  }

  if (state.phase === 'review') {
    const { draft } = state
    return (
      <div className="capture" data-phase="review">
        <div className="capture-frame has-photo">
          <img src={draft.url} alt="Photo to review" />
        </div>
        <div>
          <h2 className="capture-subhead">Check your photo</h2>
          <ul className="checklist">
            {guide.reviewChecks.map((check) => (
              <li key={check}>
                <Icon name="check" size={18} />
                {check}
              </li>
            ))}
          </ul>
        </div>
        <div className="button-row">
          <Button variant="secondary" onClick={() => retake(draft)}>
            Retake
          </Button>
          <Button onClick={() => confirm(draft)}>Use this photo</Button>
        </div>
      </div>
    )
  }

  if (state.phase === 'confirmed' && photo) {
    return (
      <div className="capture" data-phase="confirmed">
        <div className="capture-frame has-photo">
          <img src={photo.url} alt="Your confirmed photo" />
          <span className="capture-badge">
            <Icon name="check" size={16} /> Photo confirmed
          </span>
        </div>
        <Button variant="secondary" icon="camera" onClick={() => dispatch({ type: 'reset' })}>
          Retake
        </Button>
      </div>
    )
  }

  const issue = state.phase === 'camera-error' ? CAMERA_ISSUES[state.issue] : undefined
  const notice = state.phase === 'intro' ? state.notice : undefined

  return (
    <div className="capture" data-phase={state.phase}>
      {issue ? (
        <div className="capture-frame capture-problem" role="alert">
          <span className="empty-icon">
            <Icon name="camera" />
          </span>
          <h2>{issue.title}</h2>
          <p>{issue.message}</p>
        </div>
      ) : (
        <div className="capture-frame is-diagram">
          <CaptureOverlay kind={guide.overlay} />
        </div>
      )}

      {notice && (
        <p className="capture-notice" role="alert">
          {notice}
        </p>
      )}

      <div className="button-row">
        {(!issue || issue.canRetry) && (
          <Button icon="camera" onClick={startCamera}>
            {issue ? 'Try again' : 'Use camera'}
          </Button>
        )}
        <Button variant="secondary" icon="upload" onClick={openFiles}>
          Upload a photo
        </Button>
      </div>

      <ul className="tip-grid">
        {guide.tips.map((tip) => (
          <li key={tip.title}>
            <Icon name={tip.icon} size={18} />
            <span>
              <strong>{tip.title}</strong>
              {tip.text && <small>{tip.text}</small>}
            </span>
          </li>
        ))}
      </ul>

      <p className="privacy-line">
        <Icon name="shield" size={16} />
        <span>{guide.why}</span>
      </p>
      {fileInput}
    </div>
  )
}
