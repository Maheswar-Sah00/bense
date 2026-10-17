import { Link } from 'react-router-dom'
import { HAIR_LEVEL_NAMES, HAIR_LEVEL_SWATCHES } from '../../../shared/domain/hairLevel'
import { engineConfig, predict, type Prediction, type SafetyAnswers } from '../../../shared/domain/predictionEngine'
import { buildPredictionInput, toEngineInput } from '../../../shared/domain/predictionInput'
import { findShade, TONE_LABELS } from '../../../shared/domain/shadeCatalogue'
import { FlowHeader } from '../../components/FlowHeader'
import { ButtonLink } from '../../components/ui/Button'
import { GapLine, RuleList, StatGrid, WarningItem } from './PredictionParts'
import { LevelJourney } from './LevelChart'
import { ListRow, SectionHeader } from '../../components/ui/ListRow'
import { EmptyState } from '../../components/ui/States'
import { useFlow } from '../../state/FlowContext'
import { colourResumePath } from '../../state/flow'
import { careTips, quantityNote } from '../../../shared/domain/careGuidance'
import { HAIR_METRICS } from '../../../shared/domain/hairProfile'
import { METRIC_INFO } from '../hair-analysis/ProfileCards'
import { recommend } from '../../../shared/domain/alternatives'
import { AlternativeShades, ProfessionalCard } from './Recommendation'
import { Reveal } from './Reveal'
import { METHOD_LABELS } from './startingColour'

const DYED = { yes: 'Yes', no: 'No', unsure: 'Not sure' }
const PREVIOUS = {
  'black-dark': 'black or very dark',
  lightened: 'lightened',
  'other-colour': 'another colour',
  henna: 'henna',
  unsure: 'not sure what',
}

const SAFETY_QUESTIONS: { key: keyof SafetyAnswers; question: string }[] = [
  { key: 'previousReaction', question: 'Have you ever reacted to hair dye (itching, rash, swelling)?' },
  { key: 'blackHenna', question: 'Have you had a “black henna” tattoo, or used black henna on skin or hair?' },
  { key: 'browsOrLashes', question: 'Do you plan to use this dye on eyebrows or eyelashes?' },
]

const STATUS_COPY: Record<Prediction['status'], { title: string; text: string } | null> = {
  blocked: {
    title: 'Don’t use this box at home',
    text: 'Based on your safety answers, we won’t suggest dyeing at home. This isn’t a diagnosis; please get advice first.',
  },
  'professional-recommended': {
    title: 'Get a professional opinion first',
    text: 'This box is unlikely to give the result on the front, and fixing it later can be hard.',
  },
  'insufficient-input': null,
  estimate: null,
}

export default function ResultStep() {
  const { colour, analysis, safety, settings, setSafetyAnswer } = useFlow()
  const built = colour.photo ? buildPredictionInput(colour.starting, colour.shadeId ?? colour.unavailableShadeId) : null

  if (!built || !built.ok) {
    const unknown = built?.reason === 'unknown-shade'
    return (
      <div className="flow">
        <FlowHeader backTo="/colour/shade" step={4} total={4} title="Promise vs prediction" />
        <EmptyState
          title={unknown ? 'That shade isn’t available' : 'A few steps left'}
          message={
            unknown
              ? 'The shade you picked is no longer in the catalogue. Choose another one.'
              : 'Add your selfie, confirm your starting colour and pick a box shade to compare results.'
          }
          action={
            <ButtonLink to={unknown ? '/colour/shade' : colourResumePath(colour)}>
              {unknown ? 'Choose a shade' : 'Continue where you left off'}
            </ButtonLink>
          }
        />
      </div>
    )
  }

  const { input } = built
  const shade = findShade(input.target.shadeId)!
  const engineInput = toEngineInput(input, safety)
  const config = engineConfig({ liftLevels: settings.liftLevels })
  const prediction = predict(engineInput, config)
  const rec = recommend({ start: engineInput.start, safety: engineInput.safety }, shade, config)
  const status = STATUS_COPY[prediction.status]

  return (
    <div className="flow">
      <FlowHeader backTo="/colour/shade" step={4} total={4} title="Your result" />

      {status && (
        <div className={`status-banner status-${prediction.status}`} role="alert">
          <strong>{status.title}</strong>
          <span>{status.text}</span>
        </div>
      )}

      {colour.photo && <Reveal photo={colour.photo} prediction={prediction} target={input.target} startLevel={engineInput.start.level} />}

      <StatGrid
        prediction={prediction}
        shade={{ ...shade, code: input.target.code, name: input.target.name }}
        startLevel={input.starting.level}
      />

      <LevelJourney
        prediction={prediction}
        startLevel={input.starting.level}
        startRange={
          input.starting.method === 'measured' && colour.measure?.result.status === 'measured'
            ? colour.measure.result.range
            : undefined
        }
        target={{ level: input.target.level, swatchHex: shade.swatchHex }}
      />

      <GapLine prediction={prediction} />

      {(rec.professional || rec.kind === 'closer-shades') && rec.kind !== 'blocked' && (
        <section aria-label="Recommendation">
          <SectionHeader
            title="Better option"
            action={
              <Link to="/colour/alternatives" className="text-link">
                All options
              </Link>
            }
          />
          {rec.professional && <ProfessionalCard recommendation={rec} />}
          {rec.kind === 'closer-shades' && <AlternativeShades recommendation={rec} limit={1} />}
        </section>
      )}

      <section aria-label="Safety check">
        <SectionHeader title="Safety check" />
        {SAFETY_QUESTIONS.map(({ key, question }) => (
          <fieldset key={key} className="safety-q">
            <legend>{question}</legend>
            <div className="segmented segmented-2">
              {[true, false].map((value) => (
                <label key={String(value)} className="segment">
                  <input
                    type="radio"
                    name={key}
                    checked={safety[key] === value}
                    onChange={() => setSafetyAnswer(key, value)}
                  />
                  <span>{value ? 'Yes' : 'No'}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </section>

      <section>
        <SectionHeader title="Before you dye" />
        <ul className="warning-list">
          {prediction.warnings.map((w) => (
            <WarningItem key={w.id} warning={w} />
          ))}
        </ul>
      </section>

      {analysis.profile && (
        <section aria-label="Hair profile context">
          <SectionHeader title="Your hair profile" />
          <HairProfileContext profile={analysis.profile.profile} />
        </section>
      )}

      <details className="fold">
        <summary>Why this result</summary>
        <RuleList prediction={prediction} />
        <div className="rows" aria-label="Prediction input">
          <ListRow
            avatar={<span className="swatch-fill" style={{ background: HAIR_LEVEL_SWATCHES[input.starting.level] }} />}
            title={`Level ${input.starting.level} · ${HAIR_LEVEL_NAMES[input.starting.level]}`}
            subtitle={`${METHOD_LABELS[input.starting.method]}${
              colour.starting?.measurement
                ? ` · L* ${colour.starting.measurement.lightness.toFixed(1)}${colour.starting.measurement.calibrated ? ', card-calibrated' : ''}`
                : ''
            }`}
          />
          <ListRow
            icon="colour"
            title="Dyed before"
            subtitle={
              input.starting.previouslyDyed === 'yes' && input.starting.previousDye
                ? `Yes, ${PREVIOUS[input.starting.previousDye]}`
                : DYED[input.starting.previouslyDyed]
            }
          />
          <ListRow
            avatar={<span className="swatch-fill" style={{ background: shade.swatchHex }} />}
            title={`${input.target.code} · ${input.target.name}`}
            subtitle={`Level ${input.target.level} · ${TONE_LABELS[input.target.tone]}${
              input.target.brand ? ` · ${input.target.brand.name}` : ' · example shade'
            }`}
          />
        </div>
        <p className="fine-print">
          Uncertainty: {prediction.uncertainty.level}. {prediction.disclaimer} Assumes a{' '}
          {prediction.assumptions.liftLevels}-level lift (
          <Link to="/settings" className="text-link">
            Settings
          </Link>
          ). Swatches are modelled colours, not the brand’s.
        </p>
      </details>

      <div className="stack-actions">
        <ButtonLink block to="/colour/alternatives" variant="secondary">
          See better options
        </ButtonLink>
        <ButtonLink block to="/colour/shade" variant="tertiary">
          Change shade
        </ButtonLink>
      </div>
    </div>
  )
}

function HairProfileContext({
  profile,
}: {
  profile: NonNullable<ReturnType<typeof useFlow>['analysis']['profile']>['profile']
}) {
  const quantity = quantityNote(profile)
  const tips = careTips({ profile, colourTreated: true }).filter((t) => t.kind === 'cosmetic')
  return (
    <>
      <div className="profile-chips">
        {HAIR_METRICS.map((metric) => {
          const m = profile[metric]
          const value =
            m.status !== 'measured'
              ? 'not measured'
              : metric === 'type'
                ? profile.type.value!.term
                : metric === 'frizz'
                  ? profile.frizz.value!.term
                  : metric === 'length'
                    ? profile.length.value!.term
                    : profile.density.value!.term
          return (
            <span key={metric} className={m.status === 'measured' ? 'profile-chip' : 'profile-chip profile-chip-off'}>
              {METRIC_INFO[metric].title}: {value}
            </span>
          )
        })}
      </div>
      {quantity && <p className="lead">{quantity}</p>}
      {tips.length > 0 && (
        <ul className="tip-list">
          {tips.map((tip) => (
            <li key={tip.id}>
              <strong>{tip.title}.</strong> {tip.text}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
