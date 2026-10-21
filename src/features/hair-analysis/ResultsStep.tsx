import { useRef, useState } from 'react'
import { CARE_DISCLAIMER, careTips } from '../../../shared/domain/careGuidance'
import {
  HAIR_METRICS,
  measurementPlan,
  METRIC_UNITS,
  METRIC_VIEWS,
  type AnalysisView,
  type HairMetric,
  type HairProfile,
} from '../../../shared/domain/hairProfile'
import type { HairAnalysisResponse } from '../../../shared/types'
import { FlowHeader } from '../../components/FlowHeader'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { SectionHeader } from '../../components/ui/ListRow'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { TaskProgress } from '../../components/ui/TaskProgress'
import { ApiRequestError, apiFetch } from '../../lib/api'
import { useFlow } from '../../state/FlowContext'
import {
  analysisPlan,
  ANALYSIS_VIEWS,
  canViewAnalysisResults,
  profileKey,
  type AnalysisCapture,
} from '../../state/captureSession'
import { blobToDataUrl, resizeToMatch } from '../camera/imageUtils'
import { METRIC_INFO, ProfileCard } from './ProfileCards'
import { setupOption, VIEW_INFO } from './views'

type Request =
  | { kind: 'idle' }
  | { kind: 'loading'; started: number; only?: HairMetric[] }
  | { kind: 'error'; message: string; retryable: boolean; only?: HairMetric[] }

const SERVICE: Record<HairMetric, string> = {
  type: 'YouCam Hair Type Detection',
  frizz: 'YouCam Hair Frizziness Detection',
  length: 'YouCam Hair Length Detection',
  density: 'YouCam Hair Density Detection',
}

/** Measurements worth retrying: the task ran and failed (not unsupported or missing photos). */
const failedMetrics = (profile: HairProfile) => HAIR_METRICS.filter((m) => profile[m].status === 'failed')

/** Data URLs for the photos the plan needs; the three angles are made the same size (documented). */
async function buildViews(analysis: AnalysisCapture, only?: HairMetric[]): Promise<Partial<Record<AnalysisView, string>>> {
  const plan = only ? measurementPlan(analysis.hairSetup, analysis.photos, only) : analysisPlan(analysis)
  const needs = new Set<AnalysisView>()
  for (const p of plan) if (p.run) METRIC_VIEWS[p.metric].forEach((v) => needs.add(v))
  const out: Partial<Record<AnalysisView, string>> = {}
  const front = analysis.photos.front
  for (const view of needs) {
    const photo = analysis.photos[view]!
    let blob = photo.blob
    if ((view === 'left45' || view === 'right45') && front && (photo.width !== front.width || photo.height !== front.height)) {
      blob = await resizeToMatch(photo.blob, front.width, front.height)
    }
    out[view] = await blobToDataUrl(blob)
  }
  return out
}

export default function ResultsStep() {
  const { analysis, colour, setHairProfile } = useFlow()
  const [request, setRequest] = useState<Request>({ kind: 'idle' })
  // Not aborted when the page closes: the analysis may already have used YouCam units, so it
  // finishes and is saved to the session, ready when the user comes back.
  const abortRef = useRef<AbortController | null>(null)

  const key = profileKey(analysis)
  const stored = analysis.profile
  const profile = stored?.profile
  const hasPhotos = ANALYSIS_VIEWS.some((v) => analysis.photos[v])
  const stale = !!stored && hasPhotos && stored.key !== key
  const plan = analysisPlan(analysis)
  const units = plan.filter((p) => p.run).reduce((sum, p) => sum + METRIC_UNITS[p.metric], 0)
  const setupNote = analysis.hairSetup === 'loose' ? 'Measured from your photos.' : `Hair setup: ${setupOption(analysis.hairSetup).label}.`

  /** Runs the plan, or with `only`, retries those measurements and keeps the rest. */
  async function analyse(only?: HairMetric[]) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setRequest({ kind: 'loading', started: Date.now(), only })
    try {
      const views = await buildViews(analysis, only)
      const res = await apiFetch<HairAnalysisResponse>('/hair/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setup: analysis.hairSetup, views, only }),
        signal: controller.signal,
      })
      const merged: HairProfile =
        only && profile
          ? { ...profile, ...Object.fromEntries(only.map((m) => [m, res.profile[m]])), measuredAt: res.profile.measuredAt }
          : res.profile
      setHairProfile(key, merged)
      setRequest({ kind: 'idle' })
    } catch (error) {
      if (controller.signal.aborted) return
      const e = error instanceof ApiRequestError ? error : null
      setRequest({ kind: 'error', message: e?.message ?? 'The analysis didn’t work.', retryable: e?.retryable ?? true, only })
    }
  }

  if (!profile && !canViewAnalysisResults(analysis)) {
    return (
      <div className="flow">
        <FlowHeader backTo="/analysis/photos" step={2} total={2} title="Your hair profile" />
        <EmptyState
          icon="camera"
          title="Photos needed"
          message="Take or skip each requested photo to build your hair profile."
          action={<ButtonLink to="/analysis/photos">Go to photos</ButtonLink>}
        />
      </div>
    )
  }

  const colourTreated = colour.starting?.previouslyDyed === 'yes' || !!colour.shadeId
  const tips = profile ? careTips({ profile, colourTreated }) : []
  const cosmetic = tips.filter((t) => t.kind === 'cosmetic')
  const professional = tips.filter((t) => t.kind === 'professional')
  const runnable = plan.some((p) => p.run)
  const failed = profile && !stale ? failedMetrics(profile) : []
  const retryUnits = failed.reduce((sum, m) => sum + METRIC_UNITS[m], 0)
  const progress =
    request.kind === 'loading' ? (
      <TaskProgress
        title={request.only ? 'Retrying failed measurements' : 'Analysing your hair'}
        startedAt={request.started}
        typicalSeconds={request.only ? 12 : 20}
        steps={(request.only ? measurementPlan(analysis.hairSetup, analysis.photos, request.only) : plan).map((item) => ({
          id: item.metric,
          label: METRIC_INFO[item.metric].title,
          detail: item.run ? `${SERVICE[item.metric]}, live` : request.only ? 'Keeping your earlier result' : item.reason!.message,
          state: item.run ? 'running' : 'skipped',
        }))}
      />
    ) : null

  return (
    <div className="flow">
      <FlowHeader backTo="/analysis/photos" step={2} total={2} title="Your hair profile" subtitle={setupNote} />

      {hasPhotos && (
        <div className="thumb-row">
          {ANALYSIS_VIEWS.map((view) =>
            analysis.photos[view] ? (
              <img key={view} src={analysis.photos[view].url} alt={`${VIEW_INFO[view].label} photo`} />
            ) : (
              <span key={view} className="thumb-skipped">
                {analysis.skipped.includes(view) ? 'Skipped' : 'Not needed'}
              </span>
            ),
          )}
        </div>
      )}

      {(!profile || stale) && (
        <div className="panel-card">
          {request.kind === 'loading' ? (
            progress
          ) : request.kind === 'error' && !request.only ? (
            <ErrorState message={request.message} />
          ) : runnable ? (
            <p className="lead">
              {stale ? 'New photos. ' : ''}
              {plan
                .filter((p) => p.run)
                .map((p) => METRIC_INFO[p.metric].title)
                .join(' · ')}
              <span className="fine-print"> · {units} YouCam units if all succeed</span>
            </p>
          ) : (
            <p className="lead">Nothing can be measured for this hair setup.</p>
          )}
          <div className="button-row">
            {runnable && request.kind !== 'loading' && (request.kind !== 'error' || request.retryable) && (
              <Button icon="sparkle" onClick={() => analyse()}>
                {request.kind === 'error' ? 'Try again' : stale ? 'Analyse new photos' : 'Analyse my hair'}
              </Button>
            )}
            {request.kind === 'error' && !request.only && (
              <ButtonLink variant="secondary" to="/demo/analysis">
                View demo example
              </ButtonLink>
            )}
          </div>
        </div>
      )}

      {failed.length > 0 && (
        <div className="panel-card" role="region" aria-label="Retry failed measurements">
          {request.kind === 'loading' ? (
            progress
          ) : (
            <>
              {request.kind === 'error' && request.only ? (
                <ErrorState message={request.message} />
              ) : (
                <p className="lead">
                  {failed.map((m) => METRIC_INFO[m].title).join(' and ')} couldn’t be measured.
                  <span className="fine-print"> Retry: {retryUnits} units if it works; failures are free.</span>
                </p>
              )}
              <div className="button-row">
                {!(request.kind === 'error' && !request.retryable) && (
                  <Button size="sm" icon="sparkle" onClick={() => analyse(failed)}>
                    Try failed measurements again
                  </Button>
                )}
                <ButtonLink size="sm" variant="secondary" to="/analysis/photos">
                  Retake photos
                </ButtonLink>
              </div>
            </>
          )}
        </div>
      )}

      <section aria-label="Hair profile">
        <SectionHeader title={profile ? 'Measurements' : 'What we’ll measure'} />
        {profile ? (
          <>
            {stale && <p className="fine-print">Previous results until you analyse the new photos.</p>}
            <div className="metric-grid">
              {HAIR_METRICS.map((metric) => (
                <ProfileCard key={metric} metric={metric} profile={profile} />
              ))}
            </div>
            {profile.notes.map((note) => (
              <p key={note} className="fine-print">
                {note}
              </p>
            ))}
          </>
        ) : (
          <ul className="plan-list">
            {plan.map((p) => (
              <li key={p.metric} className={p.run ? undefined : 'plan-skip'}>
                <Icon name={p.run ? 'check' : 'close'} size={18} />
                <span>
                  <strong>{METRIC_INFO[p.metric].title}</strong>
                  {p.run ? ' will be measured.' : ` won’t be measured: ${p.reason!.message}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {profile && (
        <section aria-label="Care guidance">
          <SectionHeader title="Care tips" />
          {cosmetic.length ? (
            <ul className="tip-list">
              {cosmetic.map((tip) => (
                <li key={tip.id}>
                  <strong>{tip.title}.</strong> {tip.text}
                  <span className="tip-because">Because: {tip.because.toLowerCase()}.</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="lead">No specific tips from these measurements.</p>
          )}
          <p className="fine-print">{CARE_DISCLAIMER}</p>
          {professional.length > 0 && (
            <div className="note">
              <Icon name="info" size={20} />
              <div>
                {professional.map((tip) => (
                  <p key={tip.id}>
                    <strong>{tip.title}.</strong> {tip.text}
                  </p>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="stack-actions">
        {colour.starting && colour.shadeId ? (
          <ButtonLink block to="/colour/result" variant="secondary">
            See your dye result with this profile
          </ButtonLink>
        ) : (
          <ButtonLink block to="/colour" variant="secondary">
            Try a box dye
          </ButtonLink>
        )}
        <ButtonLink block variant="tertiary" to="/analysis/photos">
          Review photos
        </ButtonLink>
      </div>
    </div>
  )
}
