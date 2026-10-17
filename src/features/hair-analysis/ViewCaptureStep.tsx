import { useNavigate, useParams } from 'react-router-dom'
import { FlowHeader } from '../../components/FlowHeader'
import { ButtonLink } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/States'
import { useFlow } from '../../state/FlowContext'
import {
  ANALYSIS_VIEWS,
  METRIC_VIEWS,
  nextAnalysisView,
  type AnalysisCapture,
  type HairMetric,
} from '../../state/captureSession'
import { PhotoCapture } from '../camera/PhotoCapture'
import { analysisGuide, METRIC_LABELS, VIEW_INFO, viewFromSlug, viewPath } from './views'

/** One step of the guided four-view sequence. Uses the same PhotoCapture as hair colour. */
export default function ViewCaptureStep() {
  const { view: slug } = useParams()
  const view = viewFromSlug(slug)
  const { analysis, setAnalysisPhoto, skipAnalysisView } = useFlow()
  const navigate = useNavigate()

  if (!view) {
    return (
      <div className="flow">
        <EmptyState
          icon="camera"
          title="Unknown view"
          message="That photo step doesn’t exist."
          action={<ButtonLink to="/analysis/photos">Back to photos</ButtonLink>}
        />
      </div>
    )
  }

  const goNext = (after: AnalysisCapture) => {
    const next = nextAnalysisView(after)
    navigate(next ? viewPath(next) : '/analysis/photos')
  }

  const affected = (Object.keys(METRIC_VIEWS) as HairMetric[])
    .filter((metric) => METRIC_VIEWS[metric].includes(view))
    .map((metric) => METRIC_LABELS[metric])

  return (
    <div className="flow">
      <FlowHeader
        backTo="/analysis/photos"
        step={ANALYSIS_VIEWS.indexOf(view) + 1}
        total={ANALYSIS_VIEWS.length}
        title={VIEW_INFO[view].label}
        subtitle={VIEW_INFO[view].instruction}
      />

      <PhotoCapture
        key={view}
        view={view}
        poseView={view}
        guide={analysisGuide(view, analysis.hairSetup)}
        photo={analysis.photos[view]}
        onConfirm={(photo) => {
          setAnalysisPhoto(view, photo)
          goNext({ ...analysis, photos: { ...analysis.photos, [view]: photo } })
        }}
      />

      {!analysis.photos[view] && (
        <p className="fine-print">
          Can’t take this view?{' '}
          <button
            type="button"
            className="text-link"
            onClick={() => {
              skipAnalysisView(view)
              goNext({ ...analysis, skipped: [...analysis.skipped, view] })
            }}
          >
            Skip it
          </button>{' '}
          — we won’t be able to measure {affected.join(' or ')}.
        </p>
      )}
    </div>
  )
}
