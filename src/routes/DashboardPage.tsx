import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HAIR_LEVEL_NAMES, HAIR_LEVEL_SWATCHES, HAIR_LEVELS } from '../../shared/domain/hairLevel'
import { findShade } from '../../shared/domain/shadeCatalogue'
import { IconLink } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/Dialog'
import { Icon } from '../components/ui/Icon'
import { useBackendHealth } from '../hooks/useBackendHealth'
import { useFlow } from '../state/FlowContext'
import { capturedCount, neededViews } from '../state/captureSession'
import { colourStepsDone, COLOUR_STEPS } from '../state/flow'

export default function DashboardPage() {
  const flow = useFlow()
  const { colour, analysis } = flow
  const [resetOpen, setResetOpen] = useState(false)
  const { state: health } = useBackendHealth()
  const liveUnavailable =
    health.kind === 'error'
      ? 'The server can’t be reached, so live YouCam features won’t work right now. Demo mode still works.'
      : health.kind === 'ready' && !health.health.youcamConfigured
        ? 'Live YouCam features aren’t set up on this server (no API key).'
        : null

  // The result screen is the outcome, so the count is the three inputs before it.
  const colourInputs = COLOUR_STEPS.length - 1
  const colourDone = colourStepsDone(colour)
  const shotCount = capturedCount(analysis)
  const shotsNeeded = neededViews(analysis.hairSetup).length
  const profile = analysis.profile?.profile
  const measured = profile
    ? (['type', 'frizz', 'length', 'density'] as const).filter((m) => profile[m].status === 'measured').length
    : 0
  const shade = findShade(colour.shadeId)
  const startLevel = colour.starting?.confirmedLevel
  const hasProgress = colourDone > 0 || shotCount > 0 || analysis.skipped.length > 0 || !!colour.starting || !!profile

  const colourTitle = colourDone === 0 ? 'Check a box dye' : colourDone === colourInputs ? 'See your result' : 'Continue your check'
  const picked = [
    startLevel ? `Level ${startLevel}` : null,
    shade ? `${shade.code} · ${shade.name}` : colour.unavailableShadeId ? 'Shade no longer available' : null,
  ].filter(Boolean)
  const colourMeta = colourDone === 0 && !picked.length ? 'One selfie · about 25 s' : picked.join(' · ') || `${colourDone} of ${colourInputs} done`
  const hairMeta = profile
    ? `${measured} of 4 measured`
    : shotCount
      ? `${shotCount} of ${shotsNeeded} photos`
      : `${shotsNeeded} guided photos · 1 min`

  return (
    <div className="home">
      <header className="home-top">
        <span className="mark" aria-hidden="true">
          本
        </span>
        <IconLink icon="settings" label="Settings" to="/settings" />
      </header>

      <div className="home-hero">
        <p className="eyebrow">Bense · 本色</p>
        <h1 className="hero-title">
          Will this box
          <br />
          work on you?
        </h1>
        <p className="hero-sub">Your real level. The box’s honest result.</p>
      </div>

      <nav className="home-actions" aria-label="Start">
        <Link to="/colour" className="cta cta-primary">
          <span className="cta-text">
            <span className="cta-title">{colourTitle}</span>
            <span className="cta-meta">{colourMeta}</span>
          </span>
          {(startLevel || shade) && (
            <span className="cta-swatches" aria-hidden="true">
              {startLevel && <span style={{ background: HAIR_LEVEL_SWATCHES[startLevel] }} />}
              {shade && <span style={{ background: shade.swatchHex }} />}
            </span>
          )}
          <Icon name="chevron" size={22} />
        </Link>
        <Link to="/analysis" className="cta">
          <span className="cta-text">
            <span className="cta-title">Hair profile</span>
            <span className="cta-meta">{hairMeta}</span>
          </span>
          <Icon name="chevron" size={22} />
        </Link>
      </nav>

      <figure className="home-scale">
        <div className="level-strip" aria-label="Hair levels 1 to 10">
          {HAIR_LEVELS.map((level) => (
            <span key={level} style={{ background: HAIR_LEVEL_SWATCHES[level] }} title={HAIR_LEVEL_NAMES[level]}>
              {level}
            </span>
          ))}
        </div>
        <figcaption>Box dye lifts natural hair 2–3 levels at most. Dye can’t lift dye.</figcaption>
      </figure>

      <div className="home-foot">
        <Link to="/demo" className="text-link">
          Demo mode
        </Link>
        {hasProgress && (
          <button type="button" className="text-link" onClick={() => setResetOpen(true)}>
            Start over
          </button>
        )}
      </div>

      {liveUnavailable && (
        <p className="fine-print" role="status">
          {liveUnavailable}
        </p>
      )}

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={flow.resetAll}
        title="Start over?"
        message="This clears your photos, starting colour and shade on this device."
        confirmLabel="Clear everything"
      />
    </div>
  )
}
