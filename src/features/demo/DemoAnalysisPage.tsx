import { careTips, CARE_DISCLAIMER } from '../../../shared/domain/careGuidance'
import { HAIR_METRICS } from '../../../shared/domain/hairProfile'
import { DEMO_HAIR_PROFILE, demoMeasurementOrigin } from '../../../shared/demo/fixtures'
import { FlowHeader } from '../../components/FlowHeader'
import { ButtonLink } from '../../components/ui/Button'
import { SectionHeader } from '../../components/ui/ListRow'
import { OriginBadge } from '../../components/ui/OriginBadge'
import { ProfileCard } from '../hair-analysis/ProfileCards'
import { DemoBar } from './DemoBar'

export default function DemoAnalysisPage() {
  const demo = DEMO_HAIR_PROFILE
  const profile = demo.profile
  const measured = HAIR_METRICS.filter((m) => profile[m].status === 'measured').length
  const tips = careTips({ profile })
  const cosmetic = tips.filter((t) => t.kind === 'cosmetic')
  const professional = tips.filter((t) => t.kind === 'professional')

  return (
    <div className="flow">
      <FlowHeader
        backTo="/demo"
        step={3}
        total={3}
        title="Hair profile example"
        subtitle={`${measured} of 4 measured.`}
      />
      <DemoBar />

      <div className="demo-banner" role="note">
        <strong>Demo example, not your hair.</strong> Recorded YouCam results for sample photos.
      </div>

      <section aria-label="Hair profile">
        <SectionHeader title="Measurements" />
        <div className="metric-grid">
          {HAIR_METRICS.map((metric) => (
            <ProfileCard
              key={metric}
              metric={metric}
              profile={profile}
              note={demo.notes[metric]}
              badge={<OriginBadge origin={demoMeasurementOrigin(metric)} />}
            />
          ))}
        </div>
        <p className="fine-print">Type and frizz need three real 45° photos; the sample set has none.</p>
      </section>

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
        {professional.map((tip) => (
          <div key={tip.id} className="note">
            <p>
              <strong>{tip.title}.</strong> {tip.text}
            </p>
          </div>
        ))}
        <p className="fine-print">{CARE_DISCLAIMER}</p>
      </section>

      <div className="stack-actions">
        <ButtonLink block to="/analysis">
          Analyse my own hair (live)
        </ButtonLink>
        <ButtonLink block variant="secondary" to="/demo">
          Demo menu
        </ButtonLink>
        <ButtonLink block variant="tertiary" to="/">
          Back to dashboard
        </ButtonLink>
      </div>
    </div>
  )
}
