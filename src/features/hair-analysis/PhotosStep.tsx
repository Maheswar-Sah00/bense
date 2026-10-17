import { useNavigate } from 'react-router-dom'
import { FlowHeader } from '../../components/FlowHeader'
import { Button } from '../../components/ui/Button'
import { ListRow } from '../../components/ui/ListRow'
import { Icon } from '../../components/ui/Icon'
import { useFlow } from '../../state/FlowContext'
import { canViewAnalysisResults, neededViews, nextAnalysisView } from '../../state/captureSession'
import { HAIR_SETUP_OPTIONS, setupOption, VIEW_INFO, viewPath } from './views'

/** Guided views with per-view status. Loose hair is assumed; other setups are optional. */
export default function PhotosStep() {
  const { analysis, setHairSetup } = useFlow()
  const navigate = useNavigate()
  const views = neededViews(analysis.hairSetup)
  const next = nextAnalysisView(analysis)
  const setup = setupOption(analysis.hairSetup)
  const loose = analysis.hairSetup === 'loose'
  const ready = canViewAnalysisResults(analysis)

  return (
    <div className="flow">
      <FlowHeader
        backTo="/"
        step={1}
        total={2}
        title="Hair profile photos"
        subtitle={views.length ? `${views.length} guided photo${views.length > 1 ? 's' : ''}. It takes about a minute.` : 'No photos needed for this setup.'}
      />

      <div className="note note-strong">
        <Icon name="sparkle" size={20} />
        <p>
          <strong>{loose ? 'Hair down and forward' : setup.label}</strong>
          {setup.tip}
        </p>
      </div>

      {views.length > 0 && (
        <div className="rows">
          {views.map((view, i) => {
            const photo = analysis.photos[view]
            const skipped = analysis.skipped.includes(view)
            return (
              <ListRow
                key={view}
                avatar={photo ? <img className="swatch-fill" src={photo.url} alt="" /> : <span>{i + 1}</span>}
                title={VIEW_INFO[view].label}
                subtitle={VIEW_INFO[view].instruction}
                value={photo ? 'Done' : skipped ? 'Skipped' : 'To do'}
                tone={photo ? 'positive' : 'muted'}
                to={viewPath(view)}
              />
            )
          })}
        </div>
      )}

      {next ? (
        <Button block icon="camera" onClick={() => navigate(viewPath(next))}>
          {next === views[0] && !analysis.photos[next] ? `Start with: ${VIEW_INFO[next].label}` : `Next: ${VIEW_INFO[next].label}`}
        </Button>
      ) : (
        <Button block disabled={!ready} onClick={() => navigate('/analysis/results')}>
          {ready ? 'See hair profile' : 'Add at least one photo'}
        </Button>
      )}
      <details className="setup-more" open={!loose}>
        <summary>Hair tied up, in braids or under a wig?</summary>
        <fieldset className="option-list">
          <legend className="sr-only">Your hair today</legend>
          {HAIR_SETUP_OPTIONS.map((option) => (
            <label key={option.value} className="choice">
              <input
                type="radio"
                name="hair-setup"
                value={option.value}
                checked={analysis.hairSetup === option.value}
                onChange={() => setHairSetup(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      </details>
    </div>
  )
}
