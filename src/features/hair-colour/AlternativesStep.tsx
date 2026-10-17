import { Link } from 'react-router-dom'
import { recommend } from '../../../shared/domain/alternatives'
import { engineConfig } from '../../../shared/domain/predictionEngine'
import { buildPredictionInput, toEngineInput } from '../../../shared/domain/predictionInput'
import { findShade } from '../../../shared/domain/shadeCatalogue'
import { FlowHeader } from '../../components/FlowHeader'
import { ButtonLink } from '../../components/ui/Button'
import { SectionHeader } from '../../components/ui/ListRow'
import { EmptyState } from '../../components/ui/States'
import { useFlow } from '../../state/FlowContext'
import { colourResumePath } from '../../state/flow'
import { ShadeReach } from './LevelChart'
import { AlternativeShades, ProfessionalCard } from './Recommendation'

export default function AlternativesStep() {
  const { colour, safety, settings } = useFlow()
  const built = colour.photo ? buildPredictionInput(colour.starting, colour.shadeId) : null

  if (!built || !built.ok) {
    return (
      <div className="flow">
        <FlowHeader backTo="/colour/result" step={4} total={4} title="Better options" />
        <EmptyState
          icon="box"
          title="Nothing to compare yet"
          message="Better options are worked out from your prediction. Add your selfie, starting colour and a box shade first."
          action={<ButtonLink to={colourResumePath(colour)}>Continue where you left off</ButtonLink>}
        />
      </div>
    )
  }

  const { input } = built
  const shade = findShade(input.target.shadeId)!
  const engine = toEngineInput(input, safety)
  const rec = recommend({ start: engine.start, safety: engine.safety }, shade, engineConfig({ liftLevels: settings.liftLevels }))
  const result = rec.original.result

  return (
    <div className="flow">
      <FlowHeader
        backTo="/colour/result"
        step={4}
        total={4}
        title="Better options"
      />

      {result && (
        <p className="lead">
          You picked {shade.code} {shade.name} (level {shade.level}). We predict about level {result.level}
          {result.reachesTarget ? ', which reaches the box level.' : `, ${result.levelsShort} level${result.levelsShort === 1 ? '' : 's'} short.`}
        </p>
      )}

      {rec.kind === 'blocked' ? (
        <div className="status-banner status-blocked" role="alert">
          <strong>No box dye suggestions</strong>
          <span>
            Your safety answers mean we won’t suggest any hair dye at home. Talk to a pharmacist or doctor first. This
            isn’t a diagnosis.
          </span>
        </div>
      ) : (
        <>
          {rec.professional && <ProfessionalCard recommendation={rec} />}

          {rec.kind === 'on-target' && (
            <div className="note">
              <p>
                <strong>This box should reach its level.</strong> Still do the skin and strand tests first.
              </p>
            </div>
          )}

          {rec.kind === 'closer-shades' && (
            <section>
              <SectionHeader title={rec.professional ? 'If you’d rather use a box' : 'Closer box shades'} />
              <p className="fine-print">The lightest shades a box can reach from your level.</p>
              <ShadeReach recommendation={rec} shade={shade} startLevel={input.starting.level} />
              <AlternativeShades recommendation={rec} />
            </section>
          )}

          {rec.kind === 'no-box-shade' && (
            <div className="note">
              <p>No shade in our catalogue is expected to reach its box level for you at home.</p>
            </div>
          )}
        </>
      )}

      <p className="fine-print">
        Estimates, not guarantees, using a {settings.liftLevels}-level lift (
        <Link to="/settings" className="text-link">
          change in Settings
        </Link>
        ). Shades are illustrative demo entries ({input.catalogue.version}). Do the skin allergy test in the box
        instructions before every use.
      </p>

      <ButtonLink block to="/colour/result" variant="tertiary">
        Back to result
      </ButtonLink>
    </div>
  )
}
