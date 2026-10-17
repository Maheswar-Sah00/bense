import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/Dialog'
import { ListRow, SectionHeader } from '../components/ui/ListRow'
import { ErrorState, LoadingState } from '../components/ui/States'
import { useBackendHealth } from '../hooks/useBackendHealth'
import { useFlow } from '../state/FlowContext'
import { readTheme, saveTheme, type Theme } from '../theme'

const THEME_LABELS: Record<Theme, string> = { dark: 'Dark', light: 'Light', system: 'System' }

export default function SettingsPage() {
  const { resetAll, settings, setLiftLevels } = useFlow()
  const { state, retry } = useBackendHealth()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [theme, setTheme] = useState(readTheme)

  return (
    <div className="flow">
      <h1 className="display">Settings</h1>

      <section id="privacy">
        <SectionHeader title="Privacy" />
        <div className="rows">
          <ListRow
            icon="shield"
            title="Photos stay on this device until you ask"
            subtitle="Memory only. Gone when you close the tab."
          />
          <ListRow
            icon="server"
            title="Analysis goes through our server"
            subtitle="Only when you tap. Never stored, logged or tracked."
          />
          <ListRow
            icon="sparkle"
            title="What is sent, and when"
            subtitle="Your selfie for the reading and renders; profile photos for the analysis. Demo mode sends nothing."
          />
        </div>
      </section>

      <section aria-label="Appearance">
        <SectionHeader title="Appearance" />
        <fieldset>
          <legend className="field-label">Theme</legend>
          <div className="segmented">
            {(Object.keys(THEME_LABELS) as Theme[]).map((t) => (
              <label key={t} className="segment">
                <input
                  type="radio"
                  name="theme"
                  checked={theme === t}
                  onChange={() => {
                    setTheme(t)
                    saveTheme(t)
                  }}
                />
                <span>{THEME_LABELS[t]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section aria-label="Prediction assumptions">
        <SectionHeader title="Prediction" />
        <fieldset>
          <legend className="field-label">How much can a box dye lighten natural hair?</legend>
          <div className="segmented">
            {([1, 2, 3] as const).map((levels) => (
              <label key={levels} className="segment">
                <input
                  type="radio"
                  name="lift"
                  checked={settings.liftLevels === levels}
                  onChange={() => setLiftLevels(levels)}
                />
                <span>
                  {levels} level{levels === 1 ? '' : 's'}
                  {levels === 1 ? ' (default)' : ''}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <p className="fine-print">Brands quote 1–3. We default to 1 so we never over-promise.</p>
      </section>

      <section>
        <SectionHeader title="Your data" />
        <div className="rows">
          <ListRow
            icon="trash"
            title="Clear photos and choices"
            subtitle={cleared ? 'Cleared.' : 'Removes your selfie, profile photos, starting colour and shade.'}
          />
        </div>
        <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
          Clear everything
        </Button>
      </section>

      <section>
        <SectionHeader title="Connection" />
        {state.kind === 'loading' && <LoadingState label="Checking the server…" />}
        {state.kind === 'error' && <ErrorState message={state.message} onRetry={retry} />}
        {state.kind === 'ready' && (
          <div className="rows">
            <ListRow icon="server" title="Server" subtitle="Reachable" value="Online" tone="positive" />
            <ListRow
              icon="sparkle"
              title="YouCam key"
              subtitle="Stored on the server only"
              value={state.health.youcamConfigured ? 'Set' : 'Missing'}
              tone={state.health.youcamConfigured ? 'positive' : 'muted'}
            />
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="About" />
        <div className="rows">
          <ListRow icon="info" title="Results are previews" subtitle="A guide to likely results, not a guarantee." />
          <ListRow icon="box" title="Version" value="0.2.0" />
        </div>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          resetAll()
          setCleared(true)
        }}
        title="Clear everything?"
        message="This removes your photos, starting colour and shade from this device."
        confirmLabel="Clear everything"
      />
    </div>
  )
}
