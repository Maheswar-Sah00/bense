import { useEffect, useRef, useState } from 'react'
import { scenarioPrediction, verifiedRenderPair, type DemoRenderPair } from '../../../shared/demo/fixtures'
import { findScenario } from '../../../shared/demo/scenarios'
import type { Prediction } from '../../../shared/domain/predictionEngine'
import { revealSentence } from '../../../shared/domain/revealSentence'
import type { ToneFamily } from '../../../shared/domain/shadeCatalogue'
import type { RevealResponse } from '../../../shared/types'
import { Button } from '../../components/ui/Button'
import { ErrorState } from '../../components/ui/States'
import { TaskProgress } from '../../components/ui/TaskProgress'
import { ApiRequestError, apiFetch } from '../../lib/api'
import type { CapturedPhoto } from '../../state/captureSession'
import { useFlow } from '../../state/FlowContext'
import { revealKey } from '../../state/flow'
import { BeforeAfter } from './BeforeAfter'
import { useFinishedPair, type FinishSource } from './finishRender'

type Request =
  | { kind: 'idle' }
  | { kind: 'loading'; started: number }
  | { kind: 'error'; message: string; retryable: boolean }
  | { kind: 'demo'; pair: DemoRenderPair; sentence: string; lift: number }

async function toObjectUrl(dataUrl: string): Promise<string> {
  return URL.createObjectURL(await (await fetch(dataUrl)).blob())
}

/** Demo Scenario A's recorded renders, only if today's engine still predicts those colours. */
function demoExample(): { pair: DemoRenderPair; sentence: string; lift: number } | null {
  const scenario = findScenario('brass-surprise')!
  const { shade, prediction } = scenarioPrediction(scenario)
  const pair = verifiedRenderPair(scenario, shade, prediction)
  return pair && { pair, sentence: revealSentence(prediction, shade), lift: prediction.result!.level - scenario.start.level }
}

export function Pair({
  promise,
  result,
  alt,
  finish,
  beforeUrl = typeof finish?.before === 'string' ? finish.before : undefined,
}: {
  promise: string
  result: string
  alt: string
  finish?: FinishSource
  /** The original photo for the before/after slider; defaults to finish.before when that's a URL. */
  beforeUrl?: string
}) {
  const shown = useFinishedPair(promise, result, finish)
  return (
    <>
      {beforeUrl && !shown.finishing && (
        <BeforeAfter
          before={beforeUrl}
          alt={alt}
          afters={[
            { id: 'result', label: 'Likely result', src: shown.result },
            { id: 'promise', label: 'Box promise', src: shown.promise },
          ]}
        />
      )}
      <div className={`reveal-grid${shown.finishing ? ' is-finishing' : ''}`} aria-busy={shown.finishing}>
        <figure className="reveal-figure">
          <img src={shown.promise} alt={`${alt}: what the box promises`} />
          <figcaption>What the box promises</figcaption>
        </figure>
        <figure className="reveal-figure reveal-probable">
          <img src={shown.result} alt={`${alt}: what you'll probably get`} />
          <figcaption>What you’ll probably get</figcaption>
        </figure>
      </div>
      {finish && !shown.finishing && (
        <p className="fine-print">
          {shown.finished
            ? 'Finished on your phone with your photo’s own light and shade.'
            : 'Shown as YouCam rendered it: the finishing on your phone couldn’t run for this photo.'}
        </p>
      )}
    </>
  )
}

export function Reveal({
  photo,
  prediction,
  target,
  startLevel,
}: {
  photo: CapturedPhoto
  prediction: Prediction
  target: { level: number; tone: ToneFamily; targetHex: string }
  /** Confirmed starting level: the result picture never shows more lift than predicted. */
  startLevel?: number
}) {
  const { colour, setReveal } = useFlow()
  const finish: FinishSource = {
    before: photo.blob,
    mask: colour.measure?.photoId === photo.id ? colour.measure.maskBlob : undefined,
    resultLiftLevels: startLevel === undefined ? undefined : prediction.result!.level - startLevel,
  }
  const [request, setRequest] = useState<Request>({ kind: 'idle' })
  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => () => abortRef.current?.abort(), [])

  const expected = { promise: target.targetHex, result: prediction.result!.displayHex }
  const key = revealKey(photo.id, expected.promise, expected.result)
  const renders = colour.reveal?.key === key ? colour.reveal : undefined
  const sentence = revealSentence(prediction, target)

  async function render() {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setRequest({ kind: 'loading', started: Date.now() })
    try {
      const query = new URLSearchParams({ promise: expected.promise.slice(1), result: expected.result.slice(1) })
      const res = await apiFetch<RevealResponse>(`/colour/reveal?${query}`, {
        method: 'POST',
        headers: { 'Content-Type': photo.blob.type || 'image/jpeg' },
        body: photo.blob,
        signal: controller.signal,
      })
      // Only show renders that used exactly the colours this prediction asked for.
      if (res.promise.colour !== expected.promise || res.result.colour !== expected.result) {
        throw new ApiRequestError('The renders didn’t match this prediction, so we won’t show them. Try again.', 0, 'invalid_response', true)
      }
      const promiseUrl = await toObjectUrl(res.promise.image)
      const resultUrl = res.result.image === res.promise.image ? promiseUrl : await toObjectUrl(res.result.image)
      setReveal({
        key,
        promise: { url: promiseUrl, colour: res.promise.colour },
        result: { url: resultUrl, colour: res.result.colour },
        elapsedMs: res.elapsedMs,
      })
      setRequest({ kind: 'idle' })
    } catch (error) {
      if (controller.signal.aborted) return
      const e = error instanceof ApiRequestError ? error : null
      setRequest({ kind: 'error', message: e?.message ?? 'Rendering failed.', retryable: e?.retryable ?? true })
    }
  }

  function showDemo() {
    const demo = demoExample()
    setRequest(demo ? { kind: 'demo', ...demo } : { kind: 'error', message: 'The demo example isn’t available.', retryable: true })
  }

  return (
    <section className="reveal" aria-label="Promise versus reality">
      <p className="reveal-headline">{sentence}</p>

      {renders ? (
        <>
          <Pair
            promise={renders.promise.url}
            result={renders.result.url}
            alt="Your photo"
            finish={finish}
            beforeUrl={photo.url}
          />
          <p className="fine-print">
            Rendered by YouCam Hair Color in {(renders.elapsedMs / 1000).toFixed(1)} s
          </p>
        </>
      ) : request.kind === 'loading' ? (
        <div className="panel-card">
          <TaskProgress
            title="Rendering both looks on your photo"
            startedAt={request.started}
            typicalSeconds={15}
            steps={[
              { id: 'predict', label: 'Prediction', detail: 'Box Truth rules, worked out on this device', state: 'done' },
              { id: 'promise', label: 'Box promise render', detail: `YouCam Hair Color, live · ${expected.promise}`, state: 'running' },
              { id: 'result', label: 'Predicted result render', detail: `YouCam Hair Color, live · ${expected.result}`, state: 'running' },
            ]}
          />
        </div>
      ) : request.kind === 'demo' ? (
        <>
          <div className="demo-banner" role="note">
            <strong>Demo example, not your photo.</strong> Scenario A from demo mode: natural level 4, 2-level lift.{' '}
            {request.pair.provenance}
          </div>
          <p className="reveal-headline reveal-headline-demo">{request.sentence}</p>
          <Pair
            promise={request.pair.promise.image}
            result={request.pair.result.image}
            alt="Demo sample photo"
            finish={{ before: request.pair.before, resultLiftLevels: request.lift }}
          />
          <Button variant="secondary" onClick={() => setRequest({ kind: 'idle' })}>
            Back to my result
          </Button>
        </>
      ) : (
        <div className="panel-card">
          {request.kind === 'error' ? (
            <ErrorState message={request.message} />
          ) : (
            <p className="lead">
              See both on your own photo. We’ll send your selfie through our server to YouCam Hair Color twice: once
              with the box colour and once with the predicted colour.
            </p>
          )}
          <div className="button-row">
            {(request.kind !== 'error' || request.retryable) && (
              <Button icon="sparkle" onClick={render}>
                {request.kind === 'error' ? 'Try again' : 'Show it on my photo'}
              </Button>
            )}
            {request.kind === 'error' && (
              <Button variant="secondary" onClick={showDemo}>
                View demo example
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
