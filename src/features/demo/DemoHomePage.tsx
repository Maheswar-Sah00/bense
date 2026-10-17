import { DEMO_SCENARIOS } from '../../../shared/demo/scenarios'
import { scenarioPrediction } from '../../../shared/demo/fixtures'
import { FlowHeader } from '../../components/FlowHeader'
import { ButtonLink } from '../../components/ui/Button'
import { ListRow, SectionHeader } from '../../components/ui/ListRow'
import { DemoBar } from './DemoBar'

export default function DemoHomePage() {
  return (
    <div className="flow">
      <FlowHeader
        backTo="/"
        step={1}
        total={3}
        title="Demo mode"
      />
      <DemoBar />

      <section aria-label="Judge walkthrough">
        <SectionHeader title="Three-minute walkthrough" />
        <ButtonLink block to="/demo/colour/brass-surprise">
          Start the walkthrough
        </ButtonLink>
      </section>

      <section>
        <SectionHeader title="Hair colour scenarios" />
        <div className="rows" aria-label="Hair colour scenarios">
          {DEMO_SCENARIOS.map((s) => {
            const { prediction, shade } = scenarioPrediction(s)
            const result = prediction.result!
            return (
              <ListRow
                key={s.id}
                avatar={<span className="scenario-letter">{s.letter}</span>}
                title={`${s.letter}. ${s.title}`}
                subtitle={s.summary}
                value={result.reachesTarget ? `${shade.code}` : `−${result.levelsShort}`}
                valueNote={result.reachesTarget ? 'risk' : 'levels'}
                to={`/demo/colour/${s.id}`}
              />
            )
          })}
        </div>
      </section>

      <section>
        <SectionHeader title="Hair analysis" />
        <div className="rows">
          <ListRow
            icon="profile"
            title="Hair profile example"
            subtitle="Recorded YouCam results for sample photos, with care tips"
            to="/demo/analysis"
          />
        </div>
      </section>

      <section>
        <SectionHeader title="Try it live" />
        <div className="button-row">
          <ButtonLink size="sm" to="/colour">
            Try a box dye
          </ButtonLink>
          <ButtonLink size="sm" variant="secondary" to="/analysis">
            Hair profile
          </ButtonLink>
        </div>
      </section>
    </div>
  )
}
