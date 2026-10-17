import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { scenarioPrediction, verifiedRenderPair } from '../../../shared/demo/fixtures'
import { DEMO_SCENARIOS, findScenario } from '../../../shared/demo/scenarios'
import { recommend } from '../../../shared/domain/alternatives'
import { HAIR_LEVEL_NAMES, HAIR_LEVEL_SWATCHES, toHairLevel } from '../../../shared/domain/hairLevel'
import { engineConfig } from '../../../shared/domain/predictionEngine'
import { revealSentence } from '../../../shared/domain/revealSentence'
import { TONE_LABELS } from '../../../shared/domain/shadeCatalogue'
import { FlowHeader } from '../../components/FlowHeader'
import { ButtonLink, IconButton } from '../../components/ui/Button'
import { ListRow, SectionHeader } from '../../components/ui/ListRow'
import { OriginBadge } from '../../components/ui/OriginBadge'
import { EmptyState } from '../../components/ui/States'
import { LevelJourney } from '../hair-colour/LevelChart'
import { GapLine, RuleList, StatGrid, WarningItem } from '../hair-colour/PredictionParts'
import { AlternativeShades } from '../hair-colour/Recommendation'
import { Pair } from '../hair-colour/Reveal'
import { DemoBar } from './DemoBar'

const DYE_TEXT = { 'black-dark': 'black or very dark', lightened: 'lightened', 'other-colour': 'another colour', henna: 'henna', unsure: 'unknown' }

export default function DemoScenarioPage() {
  const { id } = useParams()
  const scenario = findScenario(id)
  // Local state only: the demo never writes to the user's own session.
  const [levelById, setLevelById] = useState<Record<string, number>>({})

  if (!scenario) {
    return (
      <div className="flow">
        <FlowHeader backTo="/demo" step={2} total={3} title="Scenario not found" />
        <EmptyState title="No such scenario" message="Pick one from the demo menu." action={<ButtonLink to="/demo">Demo menu</ButtonLink>} />
      </div>
    )
  }

  const level = toHairLevel(levelById[scenario.id] ?? scenario.start.level)
  const setLevel = (n: number) => setLevelById((m) => ({ ...m, [scenario.id]: toHairLevel(n) }))
  const { shade, input, prediction } = scenarioPrediction(scenario, level)
  const result = prediction.result!
  const pair = verifiedRenderPair(scenario, shade, prediction)
  const config = engineConfig({ liftLevels: scenario.liftLevels })
  const rec = recommend({ start: input.start, safety: input.safety }, shade, config)
  const cautions = prediction.warnings.filter((w) => w.severity !== 'info')
  const index = DEMO_SCENARIOS.indexOf(scenario)
  const next = DEMO_SCENARIOS[index + 1]
  const changed = level !== scenario.start.level
  const dyed = scenario.start.previouslyDyed === 'yes'

  return (
    <div className="flow">
      <FlowHeader
        backTo="/demo"
        step={2}
        total={3}
        title={`${scenario.letter}. ${scenario.title}`}
        subtitle={scenario.summary}
      />
      <DemoBar />

      <section aria-label="Starting colour">
        <SectionHeader title="Starting colour" />
        <div className="level-confirm">
          <span className="row-avatar">
            <span className="swatch-fill" style={{ background: HAIR_LEVEL_SWATCHES[level] }} />
          </span>
          <span className="row-text">
            <span className="row-title">
              Level {level} · {HAIR_LEVEL_NAMES[level]}
            </span>
            <span className="row-subtitle">
              {scenario.start.description}
              {dyed && scenario.start.previousDye ? ` (${DYE_TEXT[scenario.start.previousDye]})` : ''}
            </span>
          </span>
          <IconButton icon="minus" label="One level darker" onClick={() => setLevel(level - 1)} disabled={level <= 1} />
          <IconButton icon="plus" label="One level lighter" onClick={() => setLevel(level + 1)} disabled={level >= 10} />
        </div>
        {changed && <p className="fine-print">Changed from level {scenario.start.level}.</p>}
      </section>

      <section aria-label="Box shade">
        <SectionHeader title="Box shade" />
        <div className="rows">
          <ListRow
            avatar={<span className="swatch-fill" style={{ background: shade.swatchHex }} />}
            title={`${shade.code} ${shade.name}`}
            subtitle={`Level ${shade.level} · ${TONE_LABELS[shade.tone]} · example shade`}
          />
        </div>
      </section>

      <section className="reveal" aria-label="Promise versus prediction">
        <SectionHeader title="Promise vs prediction" />
        <p className="reveal-headline">{revealSentence(prediction, shade)}</p>
        <div className="section-title-row">
          <OriginBadge origin={{ kind: 'deterministic', liftLevels: scenario.liftLevels }} />
          <span className="fine-print">{scenario.liftLevels}-level lift</span>
        </div>
        {pair ? (
          <>
            <div className="demo-banner" role="note" title={pair.provenance}>
              <strong>Demo example, not your photo.</strong> YouCam Hair Color on a sample photo.
            </div>
            <Pair
              promise={pair.promise.image}
              result={pair.result.image}
              alt="Demo sample photo"
              finish={{ before: pair.before, resultLiftLevels: result.level - level }}
            />
            <OriginBadge origin={{ kind: 'demo-fixture', provenance: pair.provenance }} />
          </>
        ) : (
          <>
            <div className="swatch-compare">
              <figure>
                <span className="swatch-big" style={{ background: shade.swatchHex }} />
                <figcaption>What the box promises</figcaption>
              </figure>
              <figure>
                <span className="swatch-big" style={{ background: result.displayHex }} />
                <figcaption>What you’ll probably get</figcaption>
              </figure>
            </div>
            <p className="fine-print">
              {scenario.renderPairId
                ? `Model swatches only: the recorded photo renders are for level ${scenario.start.level}.`
                : 'Model swatches only. We have no genuine sample photo for this example, so we don’t show a photo render.'}
            </p>
          </>
        )}
      </section>

      <StatGrid prediction={prediction} shade={shade} startLevel={level} />
      <LevelJourney prediction={prediction} startLevel={level} target={shade} />
      <GapLine prediction={prediction} />

      {cautions.length > 0 && (
        <section>
          <SectionHeader title="Watch out" />
          <ul className="warning-list">
            {cautions.map((w) => (
              <WarningItem key={w.id} warning={w} />
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Recommendation">
        <SectionHeader title="Better option" />
        {rec.kind === 'closer-shades' && <AlternativeShades recommendation={rec} readOnly />}
        {rec.kind === 'on-target' && <p className="lead">This box should reach its level.</p>}
      </section>

      <details className="fold">
        <summary>Why this result</summary>
        <RuleList prediction={prediction} />
      </details>

      <div className="stack-actions">
        {next ? (
          <ButtonLink block to={`/demo/colour/${next.id}`}>
            Next: {next.letter}. {next.title}
          </ButtonLink>
        ) : (
          <ButtonLink block to="/demo/analysis">
            Next: hair analysis example
          </ButtonLink>
        )}
        {next && (
          <ButtonLink block variant="secondary" to="/demo/analysis">
            Skip to hair analysis
          </ButtonLink>
        )}
        <ButtonLink block variant="tertiary" to="/demo">
          Demo menu
        </ButtonLink>
      </div>
    </div>
  )
}
