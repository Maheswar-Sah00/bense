import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  HAIR_COLOUR_NAMES,
  type DyeHistory,
  type HairColourName,
  type HairColourReading,
  type PreviousDye,
} from '../../../shared/domain/hairColourReading'
import { HAIR_LEVEL_NAMES, HAIR_LEVEL_SWATCHES, HAIR_LEVELS, type HairLevel } from '../../../shared/domain/hairLevel'
import { isDyedLook } from '../../../shared/domain/hairLook'
import type { LevelMeasurement } from '../../../shared/domain/hairLevelMeasure'
import type { ColourTonesResponse, HairMaskResponse } from '../../../shared/types'
import { FlowHeader } from '../../components/FlowHeader'
import { Button, ButtonLink, IconButton } from '../../components/ui/Button'
import { Chip, ChipRow } from '../../components/ui/Chip'
import { Icon } from '../../components/ui/Icon'
import { SectionHeader } from '../../components/ui/ListRow'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { TaskProgress, type TaskState } from '../../components/ui/TaskProgress'
import { ApiRequestError, postImage } from '../../lib/api'
import { useFlow } from '../../state/FlowContext'
import type { LevelMeasureState } from '../../state/flow'
import { LevelMeasureCard } from './LevelMeasureCard'
import { measureFromBlobs } from './levelMeasure'
import { activeEstimate, METHOD_LABELS, resolveMethod, stepLevel } from './startingColour'

/** The reading has two live parts: the colour family (Facial Color Tones) and the hair mask (Hair Color). */
type Part = 'tones' | 'mask'
type Failure = { message: string; retryable: boolean }
type Request =
  | { kind: 'idle' }
  | { kind: 'loading'; started: number; tones: TaskState; mask: TaskState; measure: TaskState }
  | { kind: 'error'; message: string; retryable: boolean }

const PREVIOUS_DYE_OPTIONS: { value: PreviousDye; label: string }[] = [
  { value: 'black-dark', label: 'Black or very dark' },
  { value: 'lightened', label: 'Lightened (bleach, highlights)' },
  { value: 'other-colour', label: 'Another colour' },
  { value: 'henna', label: 'Henna' },
  { value: 'unsure', label: 'Not sure' },
]

const DYE_OPTIONS: { value: DyeHistory; label: string }[] = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
  { value: 'unsure', label: 'Not sure' },
]

export default function StartingColourStep() {
  const { colour, setReading, setMeasure, confirmStartingColour } = useFlow()
  const navigate = useNavigate()
  const photo = colour.photo
  const reading: HairColourReading | undefined =
    colour.reading && colour.reading.photoId === photo?.id ? colour.reading.reading : undefined
  const measure = colour.measure && colour.measure.photoId === photo?.id ? colour.measure : undefined
  const measured = measure?.result.status === 'measured' ? measure.result : undefined
  const look = measured?.look
  /** The whole head is a dye colour (purple, blue…): the level is its depth, not a natural shade. */
  const vivid = look?.kind === 'vivid'
  const previous = colour.starting

  const [request, setRequest] = useState<Request>({ kind: 'idle' })
  const [manual, setManual] = useState(previous?.method === 'manual' && !reading)
  const [corrected, setCorrected] = useState<HairColourName | undefined>(
    reading ? previous?.correctedFamily : undefined,
  )
  const [correcting, setCorrecting] = useState(false)
  const [level, setLevel] = useState<HairLevel | undefined>(
    previous?.confirmedLevel ?? measured?.level ?? reading?.levelEstimate?.suggested,
  )
  /** A part that failed while the other succeeded, shown with its own retry. */
  const [failed, setFailed] = useState<Partial<Record<Part, Failure>>>({})
  const [dyed, setDyed] = useState<DyeHistory | undefined>(previous?.previouslyDyed)
  const [previousDye, setPreviousDye] = useState<PreviousDye | undefined>(previous?.previousDye)
  // Once the user has answered the dye question, a reading never changes their answer.
  const dyeAnswered = useRef(previous?.previouslyDyed !== undefined)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  // A measurement made before colours were read has no `look`: re-read it from the stored render
  // (on this device, no YouCam units).
  useEffect(() => {
    if (!photo || !measure || measure.result.status !== 'measured' || measure.result.look) return
    let live = true
    measureFromBlobs(photo.blob, measure.maskBlob, measure.card).then(
      (result) => {
        if (!live) return
        setMeasure({ ...measure, result })
        markDyed(result)
      },
      () => {},
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per stored measurement
  }, [measure])

  if (!photo) {
    return (
      <div className="flow">
        <FlowHeader backTo="/colour/photo" step={2} total={4} title="Your starting colour" />
        <EmptyState
          icon="camera"
          title="No selfie yet"
          message="Take a selfie first so your starting colour can be read from it."
          action={<ButtonLink to="/colour/photo">Take a selfie</ButtonLink>}
        />
      </div>
    )
  }

  const estimate = activeEstimate(reading, corrected, measured)
  const showLevel = !!reading || !!measure || manual
  const familyEstimate = reading?.levelEstimate
  const disagree =
    !!measured &&
    !!familyEstimate &&
    !corrected &&
    (measured.level < familyEstimate.min || measured.level > familyEstimate.max)

  /** Dye colour in the photo means the hair has been dyed: answer that for the user (they can change it). */
  function markDyed(result: LevelMeasurement) {
    if (dyeAnswered.current || result.status !== 'measured' || !isDyedLook(result.look)) return
    setDyed('yes')
    setPreviousDye('other-colour')
  }

  const failure = (error: unknown, fallback: string): Failure => {
    const e = error instanceof ApiRequestError ? error : null
    return { message: e?.message ?? fallback, retryable: e?.retryable ?? true }
  }

  /** Runs the requested parts in parallel; each one's progress is shown as it really finishes. */
  async function readColour(parts: Part[] = ['tones', 'mask']) {
    if (!photo) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const mark = (patch: Partial<Record<Part | 'measure', TaskState>>) =>
      setRequest((r) => (r.kind === 'loading' ? { ...r, ...patch } : r))
    setRequest({
      kind: 'loading',
      started: Date.now(),
      tones: parts.includes('tones') ? 'running' : 'skipped',
      mask: parts.includes('mask') ? 'running' : 'skipped',
      measure: parts.includes('mask') ? 'waiting' : 'skipped',
    })

    const tones = parts.includes('tones')
      ? postImage<ColourTonesResponse>('/colour/tones', photo.blob, controller.signal).then(
          ({ reading: result }) => {
            mark({ tones: 'done' })
            return result
          },
          (error) => {
            mark({ tones: 'failed' })
            throw error
          },
        )
      : null
    const lightness = parts.includes('mask')
      ? postImage<HairMaskResponse>('/colour/hair-mask', photo.blob, controller.signal).then(
          async (res) => {
            mark({ mask: 'done', measure: 'running' })
            const maskBlob = await (await fetch(res.mask.image)).blob()
            try {
              const result = await measureFromBlobs(photo.blob, maskBlob)
              mark({ measure: 'done' })
              return { maskBlob, result, elapsedMs: res.elapsedMs }
            } catch (error) {
              mark({ measure: 'failed' })
              throw new ApiRequestError(
                error instanceof Error ? error.message : 'Measuring failed.',
                0,
                'internal',
                false,
              )
            }
          },
          (error) => {
            mark({ mask: 'failed', measure: 'skipped' })
            throw error
          },
        )
      : null

    const [tonesResult, lightnessResult] = await Promise.allSettled([tones, lightness])
    if (controller.signal.aborted) return

    const nextFailed: Partial<Record<Part, Failure>> = { ...failed }
    let nextMeasured = measured
    let nextReading = reading
    if (tones) {
      if (tonesResult.status === 'fulfilled' && tonesResult.value) {
        nextReading = tonesResult.value
        setReading(photo.id, tonesResult.value)
        setCorrected(undefined)
        delete nextFailed.tones
      } else if (tonesResult.status === 'rejected') {
        nextFailed.tones = failure(tonesResult.reason, 'Something went wrong reading your colour.')
      }
    }
    if (lightness) {
      if (lightnessResult.status === 'fulfilled' && lightnessResult.value) {
        const { maskBlob, result, elapsedMs } = lightnessResult.value
        setMeasure({ photoId: photo.id, maskUrl: URL.createObjectURL(maskBlob), maskBlob, result, elapsedMs })
        markDyed(result)
        nextMeasured = result.status === 'measured' ? result : undefined
        delete nextFailed.mask
      } else if (lightnessResult.status === 'rejected') {
        nextFailed.mask = failure(lightnessResult.reason, 'We couldn’t measure your hair’s lightness.')
      }
    }

    setFailed(nextFailed)
    const gotMeasure = !!lightness && lightnessResult.status === 'fulfilled'
    if (!nextReading && !gotMeasure && !measure) {
      // Nothing usable came back: show the colour reading's error first, else the mask's.
      const main = nextFailed.tones ?? nextFailed.mask!
      setRequest({
        kind: 'error',
        message: main.message,
        retryable: Object.values(nextFailed).some((f) => f?.retryable),
      })
      return
    }
    setManual(false)
    setLevel(nextMeasured?.level ?? nextReading?.levelEstimate?.suggested ?? level)
    setRequest({ kind: 'idle' })
  }

  /** Calibrating (or removing it) is an explicit choice, so the level follows the new measurement. */
  function remeasured(next: LevelMeasureState) {
    setMeasure(next)
    markDyed(next.result)
    if (next.result.status === 'measured') setLevel(next.result.level)
  }

  /** Retries only what failed and can be retried. */
  function retryFailed() {
    const parts = (Object.keys(failed) as Part[]).filter((p) => failed[p]?.retryable)
    void readColour(parts.length ? parts : ['tones', 'mask'])
  }

  function cancelRead() {
    abortRef.current?.abort()
    setRequest({ kind: 'idle' })
  }

  function chooseManually() {
    abortRef.current?.abort()
    setRequest({ kind: 'idle' })
    setManual(true)
  }

  function correctTo(family: HairColourName) {
    setCorrected(family)
    setCorrecting(false)
    // A measured level stays the suggestion; the correction only fixes the colour family.
    const next = activeEstimate(reading, family, measured)
    if (next) setLevel(next.suggested)
  }

  const needsPreviousDye = dyed === 'yes' && !previousDye

  function confirm() {
    if (!level || !dyed || needsPreviousDye) return
    confirmStartingColour({
      confirmedLevel: level,
      method: resolveMethod(level, reading, corrected, measured),
      previouslyDyed: dyed,
      previousDye: dyed === 'yes' ? previousDye : undefined,
      reading,
      correctedFamily: corrected,
      measurement: measured && {
        lightness: measured.lab[0],
        level: measured.level,
        calibrated: measured.calibrated,
        look: look && { kind: look.kind, name: look.name },
      },
    })
    navigate('/colour/shade')
  }

  return (
    <div className="flow">
      <FlowHeader
        backTo="/colour/photo"
        step={2}
        total={4}
        title="Your starting colour"
      />

      <div className="photo-strip">
        <img src={photo.url} alt="Your colour selfie" />
        <div>
          <span className="row-title">Your selfie</span>
          <Link to="/colour/photo" className="text-link">
            Retake
          </Link>
        </div>
      </div>

      {/* ---- Reading ---- */}
      <section>
        <SectionHeader title="Colour reading" />

        {request.kind === 'loading' ? (
          <div className="panel-card">
            <TaskProgress
              title="Reading your starting colour"
              startedAt={request.started}
              typicalSeconds={12}
              steps={[
                {
                  id: 'tones',
                  label: 'Colour family',
                  detail: 'YouCam Facial Color Tones, live',
                  state: request.tones,
                },
                { id: 'mask', label: 'Finding your hair', detail: 'YouCam Hair Color, live', state: request.mask },
                { id: 'measure', label: 'Measuring its lightness', detail: 'On this device', state: request.measure },
                { id: 'confirm', label: 'You confirm your level', detail: 'Next, on this screen', state: 'waiting' },
              ]}
            />
            <Button size="sm" variant="tertiary" onClick={cancelRead}>
              Cancel
            </Button>
          </div>
        ) : reading || measure ? (
          <>
            {measure && <LevelMeasureCard photo={photo} measure={measure} onChange={remeasured} />}
            {(failed.tones || failed.mask) && (
              <div className="note" role="status">
                <Icon name="info" size={20} />
                <p>
                  {failed.mask && <>We couldn’t measure your hair’s lightness: {failed.mask.message} </>}
                  {failed.tones && <>The colour family reading didn’t work: {failed.tones.message} </>}
                  {Object.values(failed).some((f) => f?.retryable) && (
                    <button type="button" className="text-link" onClick={retryFailed}>
                      Try again
                    </button>
                  )}
                </p>
              </div>
            )}
            {reading && (
              <div className="reading-card">
                <div className="reading-head">
                  <span
                    className="reading-swatch"
                    style={{ background: reading.normalizedHex ?? undefined }}
                    aria-hidden="true"
                  />
                  <div>
                    <span className="reading-label">YouCam Facial Color Tones</span>
                    <span className="reading-name">
                      {reading.apiHairColorName ?? 'No hair colour found'}
                      {reading.normalizedHex && <span className="reading-hex">{reading.normalizedHex}</span>}
                    </span>
                  </div>
                </div>

                {corrected && (
                  <p className="reading-correction">
                    <Icon name="check" size={18} />
                    <span>
                      You corrected this to <strong>{corrected}</strong>.
                    </span>
                  </p>
                )}

                {correcting ? (
                  <ChipRow label="Correct colour family">
                    {HAIR_COLOUR_NAMES.map((family) => (
                      <Chip key={family} selected={corrected === family} onClick={() => correctTo(family)}>
                        {family}
                      </Chip>
                    ))}
                  </ChipRow>
                ) : (
                  <div className="reading-actions">
                    <button type="button" className="text-link" onClick={() => setCorrecting(true)}>
                      {corrected ? 'Change correction' : 'Colour looks wrong? Correct it'}
                    </button>
                  </div>
                )}
                {vivid ? (
                  <p className="fine-print">
                    YouCam’s colour families are natural shades only, so it can’t name {look.name.toLowerCase()} hair.
                    We go by the measurement.
                  </p>
                ) : disagree && (
                  <p className="fine-print">
                    The name suggests level {familyEstimate!.min}–{familyEstimate!.max}; the measurement says{' '}
                    {measured!.level}. We use the measurement.
                  </p>
                )}
              </div>
            )}
          </>
        ) : manual ? (
          <div className="note">
            <Icon name="info" size={20} />
            <p>
              <strong>Manual.</strong> Not a reading.{' '}
              <button type="button" className="text-link" onClick={() => void readColour()}>
                Read my colour instead
              </button>
            </p>
          </div>
        ) : (
          <div className="panel-card">
            {request.kind === 'error' ? (
              <ErrorState message={request.message} />
            ) : (
              <p className="lead">YouCam finds your hair. Your phone measures how light it is.</p>
            )}
            <div className="button-row">
              {(request.kind !== 'error' || request.retryable) && (
                <Button icon="sparkle" onClick={() => (request.kind === 'error' ? retryFailed() : void readColour())}>
                  {request.kind === 'error' ? 'Try again' : 'Read my hair colour'}
                </Button>
              )}
              <Button variant="secondary" onClick={chooseManually}>
                Choose level myself
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ---- Level ---- */}
      {showLevel && (
        <section>
          <SectionHeader title="Your starting level" />
          {measured ? (
            <p className="lead">
              Measured: level {measured.level}, likely {measured.range.min}–{measured.range.max}.
              {vivid && ` That’s how deep your ${look.name.toLowerCase()} is.`}
            </p>
          ) : estimate ? (
            <p className="lead">
              {corrected ? `${corrected}` : reading?.apiHairColorName}: usually level {estimate.min}–{estimate.max},
              suggested {estimate.suggested}.
            </p>
          ) : (
            <p className="lead">
              Pick the swatch closest to your hair.
            </p>
          )}

          {level && (
            <div className="stepper" role="group" aria-label="Adjust level">
              <IconButton
                icon="minus"
                label="One level darker"
                onClick={() => setLevel(stepLevel(level, -1))}
                disabled={level === 1}
              />
              <div className="stepper-value">
                <span className="stepper-swatch" style={{ background: HAIR_LEVEL_SWATCHES[level] }} />
                <span>
                  <strong>Level {level}</strong> ·{' '}
                  {vivid ? `as deep as ${HAIR_LEVEL_NAMES[level].toLowerCase()}` : HAIR_LEVEL_NAMES[level]}
                </span>
              </div>
              <IconButton
                icon="plus"
                label="One level lighter"
                onClick={() => setLevel(stepLevel(level, 1))}
                disabled={level === 10}
              />
            </div>
          )}

          <fieldset className="option-grid">
            <legend className="field-label">Or pick the closest swatch</legend>
            {HAIR_LEVELS.map((l) => (
              <label
                key={l}
                className={estimate && l >= estimate.min && l <= estimate.max ? 'option in-range' : 'option'}
              >
                <input type="radio" name="level" value={l} checked={level === l} onChange={() => setLevel(l)} />
                <span className="option-swatch" style={{ background: HAIR_LEVEL_SWATCHES[l] }} />
                <span className="option-code">{l}</span>
                <span className="option-name">{HAIR_LEVEL_NAMES[l]}</span>
              </label>
            ))}
          </fieldset>
        </section>
      )}

      {/* ---- Dye history ---- */}
      {showLevel && (
        <fieldset>
          <legend className="field-label">Has your hair been dyed before?</legend>
          <div className="segmented">
            {DYE_OPTIONS.map((option) => (
              <label key={option.value} className="segment">
                <input
                  type="radio"
                  name="dyed"
                  value={option.value}
                  checked={dyed === option.value}
                  onChange={() => {
                    dyeAnswered.current = true
                    setDyed(option.value)
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <p className="fine-print field-hint">
            {isDyedLook(look) && dyed === 'yes'
              ? `Your photo shows ${look.colour} dye, so we’ve marked your hair as dyed.`
              : 'Box dye can’t lighten earlier dye, so this changes your prediction.'}
          </p>
        </fieldset>
      )}

      {showLevel && dyed === 'yes' && (
        <fieldset className="option-list">
          <legend className="field-label">What was it?</legend>
          {PREVIOUS_DYE_OPTIONS.map((option) => (
            <label key={option.value} className="choice">
              <input
                type="radio"
                name="previous-dye"
                value={option.value}
                checked={previousDye === option.value}
                onChange={() => {
                  dyeAnswered.current = true
                  setPreviousDye(option.value)
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      )}

      {showLevel && (
        <>
          {level && <p className="fine-print">{METHOD_LABELS[resolveMethod(level, reading, corrected, measured)]}.</p>}
          <Button block disabled={!level || !dyed || needsPreviousDye} onClick={confirm}>
            {level ? `Confirm level ${level}` : 'Choose a level'}
          </Button>
        </>
      )}
    </div>
  )
}
