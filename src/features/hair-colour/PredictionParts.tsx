// Pieces of the prediction result shared by the live result screen and the demo scenarios.
import { HAIR_LEVEL_NAMES, type HairLevel } from '../../../shared/domain/hairLevel'
import { RULE_SOURCES, type EngineWarning, type Prediction, type RuleSourceId } from '../../../shared/domain/predictionEngine'
import { Icon } from '../../components/ui/Icon'

export function Sources({ ids }: { ids: RuleSourceId[] }) {
  const links = ids.filter((id) => RULE_SOURCES[id].startsWith('http'))
  if (!links.length) return null
  return (
    <>
      {' '}
      {links.map((id, i) => (
        <span key={id}>
          {i > 0 && ', '}
          <a className="source-link" href={RULE_SOURCES[id]} target="_blank" rel="noreferrer">
            {links.length > 1 ? `Source ${i + 1}` : 'Source'}
          </a>
        </span>
      ))}
    </>
  )
}

export function WarningItem({ warning }: { warning: EngineWarning }) {
  return (
    <li className={`warning warning-${warning.severity}`}>
      <Icon name={warning.severity === 'stop' ? 'close' : warning.severity === 'caution' ? 'info' : 'shield'} size={18} />
      <span>
        {warning.text}
        <Sources ids={warning.sourceIds} />
      </span>
    </li>
  )
}

export function StatGrid({
  prediction,
  shade,
  startLevel,
}: {
  prediction: Prediction
  shade: { code: string; name: string; level: number; swatchHex: string }
  startLevel: HairLevel
}) {
  const result = prediction.result!
  const rangeText = result.range.max > result.range.min ? `${result.range.min}–${result.range.max}` : null
  return (
    <div className="stat-grid" aria-label="Reveal summary">
      <div className="stat">
        <span className="stat-label">Box shade</span>
        <span className="stat-value">
          <span className="stat-swatch" style={{ background: shade.swatchHex }} /> {shade.code}
        </span>
        <span className="stat-note">
          {shade.name}, level {shade.level}
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">Your level</span>
        <span className="stat-value">{startLevel}</span>
        <span className="stat-note">{HAIR_LEVEL_NAMES[startLevel]}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Predicted level</span>
        <span className="stat-value">
          <span className="stat-swatch" style={{ background: result.displayHex }} /> {rangeText ?? result.level}
        </span>
        <span className="stat-note">Estimate</span>
      </div>
      <div className="stat">
        <span className="stat-label">Difference</span>
        <span className="stat-value">{result.reachesTarget ? '0' : `−${result.levelsShort}`}</span>
        <span className="stat-note">{result.reachesTarget ? 'Reaches the box level' : 'Levels short of the box'}</span>
      </div>
    </div>
  )
}

export function GapLine({ prediction }: { prediction: Prediction }) {
  const result = prediction.result!
  return (
    <p className={result.reachesTarget && result.appearance === 'as-box' ? 'gap-line gap-ok' : 'gap-line'}>
      {result.predictedFamily.description}.
      {result.underlyingWarmth &&
        !result.reachesTarget &&
        prediction.rules.some((r) => r.id === 'underlying-warmth') &&
        ` Lightening stops around level ${result.level}, where ${result.underlyingWarmth.name} pigment shows.`}
    </p>
  )
}

export function RuleList({ prediction }: { prediction: Prediction }) {
  return (
    <ol className="rule-list">
      {prediction.rules.map((rule) => (
        <li key={rule.id}>
          <strong>{rule.title}.</strong> {rule.detail}
          <Sources ids={rule.sourceIds} />
        </li>
      ))}
    </ol>
  )
}
