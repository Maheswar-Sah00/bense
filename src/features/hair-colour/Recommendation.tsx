import { useNavigate } from 'react-router-dom'
import type { Recommendation } from '../../../shared/domain/alternatives'
import { HAIR_LEVEL_NAMES } from '../../../shared/domain/hairLevel'
import { TONE_LABELS } from '../../../shared/domain/shadeCatalogue'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { useFlow } from '../../state/FlowContext'

/** The professional-consultation card, shown when the engine's status says so. */
export function ProfessionalCard({ recommendation }: { recommendation: Recommendation }) {
  // Short reasons only; the full warnings with sources are listed separately.
  const { rules, warnings, result } = recommendation.original
  const reasons: string[] = []
  if (rules.some((r) => r.id === 'dye-cant-lift-dye')) reasons.push('Box dye can’t lighten hair that has been coloured before.')
  if (warnings.some((w) => w.id === 'beyond-lift') && result) {
    reasons.push(`The box is ${result.levelsShort} levels lighter than we expect a box dye to reach from your hair.`)
  }
  return (
    <div className="recommend-card recommend-pro">
      <span className="recommend-icon">
        <Icon name="profile" size={22} />
      </span>
      <div>
        <strong>Recommended: see a professional colourist</strong>
        {reasons.length > 0 && (
          <ul className="recommend-reasons">
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

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
