import { useState, type MouseEvent } from 'react'
import { labToHex } from '../../../shared/domain/colour'
import { HAIR_LEVEL_NAMES } from '../../../shared/domain/hairLevel'
import { CARD_RADIUS, CardError, type CardPoint } from '../../../shared/domain/hairLevelMeasure'
import { Button } from '../../components/ui/Button'
import { OriginBadge } from '../../components/ui/OriginBadge'
import type { CapturedPhoto } from '../../state/captureSession'
import type { LevelMeasureState } from '../../state/flow'
import { LevelChart } from './LevelChart'
import { measureFromBlobs } from './levelMeasure'

/**
 * The lightness measurement: what was measured, how, and the white-card calibration. Re-measuring
 * after a tap runs on the device from the stored render, so calibrating costs no YouCam units.
 */
export function LevelMeasureCard({
  photo,
  measure,
  onChange,
}: {
  photo: CapturedPhoto
  measure: LevelMeasureState
  onChange: (next: LevelMeasureState) => void
}) {
  const [tapping, setTapping] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const m = measure.result

  async function remeasure(card?: CardPoint) {
    setBusy(true)
    setProblem(null)
    try {
      const result = await measureFromBlobs(photo.blob, measure.maskBlob, card)
      onChange({ ...measure, result, card })
      setTapping(false)
    } catch (error) {
      setProblem(error instanceof CardError ? error.message : 'We couldn’t re-measure this photo.')
    } finally {
      setBusy(false)
    }
  }

  function tap(event: MouseEvent<HTMLButtonElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    void remeasure({ x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height })
  }

  // Marker size: CARD_RADIUS of the shorter side, as a share of the width.
  const markerSize = `${(2 * CARD_RADIUS * Math.min(photo.width, photo.height) * 100) / photo.width}%`

  return (
    <div className="reading-card measure-card" role="region" aria-label="Hair level measurement">
      <div className="reading-head">
        <span
          className="reading-swatch"
          style={{ background: m.status === 'measured' ? labToHex(m.lab) : undefined }}
          aria-hidden="true"
        />
        <div>
          <span className="reading-label">Measured from your photo</span>
          <span className="reading-name">
            {m.status === 'measured'
              ? `Level ${m.level} · ${m.look?.name ?? HAIR_LEVEL_NAMES[m.level]}`
              : 'Not enough hair found'}
          </span>
        </div>
      </div>

      {m.status === 'measured' && (
        <p className="measure-figures">
          Measured across {m.hairPixels.toLocaleString('en')} points of your hair (lightness {m.lab[0].toFixed(1)} out of
          100). Likely range: level {m.range.min}
          {m.range.max > m.range.min ? `–${m.range.max}` : ''}.
        </p>
      )}
      {m.status === 'measured' && (
        <LevelChart
          label="Where your measured hair lightness falls on the level scale"
          lanes={[
            {
              label: 'Measured from your hair',
              value: `About ${Math.min(10, Math.max(1, m.levelExact)).toFixed(1)}`,
              dot: Math.min(10, Math.max(1, m.levelExact)),
              dotHex: labToHex(m.lab),
              band: m.range,
            },
          ]}
          caption={
            m.calibrated
              ? 'Shaded: the likely range. The white card corrected the light, so it’s within about half a level.'
              : 'Shaded: the likely range. Without the white card, the light can shift it by about a level.'
          }
        />
      )}

      <div className={tapping ? 'measure-images measure-tapping' : 'measure-images'}>
        {!tapping && (
          <figure>
            <img src={measure.maskUrl} alt="Your photo with the hair YouCam found coloured green" />
            <figcaption>
              Hair found by YouCam Hair Color <OriginBadge origin={{ kind: 'live', service: 'hair-color' }} />
            </figcaption>
          </figure>
        )}
        <figure>
          {tapping ? (
            <button type="button" className="measure-tap" onClick={tap} disabled={busy} aria-label="Tap your white card in the photo">
              <img src={photo.url} alt="" />
            </button>
          ) : (
            <div className="measure-tap">
              <img src={photo.url} alt="Your selfie" />
              {measure.card && (
                <span
                  className="card-marker"
                  style={{ left: `${measure.card.x * 100}%`, top: `${measure.card.y * 100}%`, width: markerSize }}
                  aria-label="White card used for calibration"
                />
              )}
            </div>
          )}
          <figcaption>
            {tapping ? 'Tap the middle of your white card' : measure.card ? 'White card used to correct the light' : 'Your photo'}
          </figcaption>
        </figure>
      </div>

      <ul className="reading-notes">
        {m.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      {problem && (
        <p className="capture-notice" role="alert">
          {problem}
        </p>
      )}

      {m.status === 'measured' && (
        <div className="button-row">
          {tapping ? (
            <Button size="sm" variant="secondary" onClick={() => setTapping(false)} disabled={busy}>
              Cancel
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setTapping(true)}>
              {measure.card ? 'Tap the card again' : 'Calibrate with my white card'}
            </Button>
          )}
          {measure.card && !tapping && (
            <Button size="sm" variant="tertiary" onClick={() => void remeasure(undefined)} disabled={busy}>
              Remove calibration
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
