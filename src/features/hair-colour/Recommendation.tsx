import { useNavigate } from 'react-router-dom'
import type { Recommendation } from '../../../shared/domain/alternatives'
import { HAIR_LEVEL_NAMES } from '../../../shared/domain/hairLevel'
import { TONE_LABELS } from '../../../shared/domain/shadeCatalogue'
import { Button } from '../../components/ui/Button'
import { useFlow } from '../../state/FlowContext'

/** One closer box shade, with the engine's own prediction for it and a way to switch to it. */
export function AlternativeShades({
  recommendation,
  limit,
  readOnly,
}: {
  recommendation: Recommendation
  limit?: number
  /** Demo mode: show the suggestions without changing the user's own session. */
  readOnly?: boolean
}) {
  const { setShade } = useFlow()
  const navigate = useNavigate()
  const shades = recommendation.shades.slice(0, limit)
  return (
    <ul className="alt-list" aria-label="Closer box shades">
      {shades.map(({ shade, reason, prediction }) => (
        <li key={shade.id} className="alt-item">
          <span className="row-avatar">
            <span className="swatch-fill" style={{ background: shade.swatchHex }} />
          </span>
          <span className="row-text">
            <span className="row-title">
              {shade.code} {shade.name}
            </span>
            <span className="row-subtitle" title={reason}>
              Lands at level {prediction.result!.level} · {HAIR_LEVEL_NAMES[prediction.result!.level].toLowerCase()} ·{' '}
              {TONE_LABELS[shade.tone].toLowerCase()}
            </span>
          </span>
          {!readOnly && (
            <Button
              size="sm"
              variant="secondary"
              aria-label={`Use ${shade.code} ${shade.name}`}
              onClick={() => {
                setShade(shade.id)
                navigate('/colour/result')
                window.scrollTo(0, 0)
              }}
            >
              Use
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}
