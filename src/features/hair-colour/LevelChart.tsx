// Charts on the 1–10 level scale: where your hair is now, where a box will likely take it, and where the box
// promises. Plain HTML positioned in percent, so it needs no chart library and reads at phone width.
import { HAIR_LEVELS, HAIR_LEVEL_SWATCHES, type HairLevel } from '../../../shared/domain/hairLevel'
import type { Recommendation } from '../../../shared/domain/alternatives'
import type { Prediction } from '../../../shared/domain/predictionEngine'
import type { Shade } from '../../../shared/domain/shadeCatalogue'

export interface LevelLane {
  label: string
  value: string
  /** Dot position; fractional levels are allowed (a measurement). */
  dot: number
  dotHex: string
  /** Solid bar from `from` to `to`. */
  from?: number
  to?: number
  /** Dashed gap from `to` to the dot: promised but not expected. */
  gap?: boolean
  /** Shaded band covering whole levels, e.g. a likely range. */
  band?: { min: number; max: number }
  tone?: 'gap' | 'ok'
}

const centre = (level: number) => ((level - 0.5) / 10) * 100
const span = (a: number, b: number) => ({ left: `${centre(Math.min(a, b))}%`, width: `${(Math.abs(b - a) / 10) * 100}%` })
const levels = (min: number, max: number) => (max > min ? `${min}–${max}` : `${min}`)

export function LevelChart({ lanes, caption, label }: { lanes: LevelLane[]; caption?: string; label: string }) {
  return (
    <figure className="level-chart" aria-label={label}>
      {lanes.map((lane) => (
        <div key={lane.label} className="lc-lane">
          <div className="lc-head">
            <span>{lane.label}</span>
            <strong className={lane.tone ? `lc-${lane.tone}` : undefined}>{lane.value}</strong>
          </div>
          <div className="lc-track" aria-hidden="true">
            {lane.band && (
              <span className="lc-band" style={{ left: `${(lane.band.min - 1) * 10}%`, width: `${(lane.band.max - lane.band.min + 1) * 10}%` }} />
            )}
            {lane.from !== undefined && lane.to !== undefined && lane.from !== lane.to && (
              <span className="lc-bar" style={span(lane.from, lane.to)} />
            )}
            {lane.gap && lane.to !== undefined && lane.to !== lane.dot && <span className="lc-gapline" style={span(lane.to, lane.dot)} />}
            <span className="lc-dot" style={{ left: `${centre(lane.dot)}%`, background: lane.dotHex }} />
          </div>
        </div>
      ))}
      <div className="lc-scale" aria-hidden="true">
        {HAIR_LEVELS.map((l) => (
          <span key={l} style={{ background: HAIR_LEVEL_SWATCHES[l] }} />
        ))}
      </div>
      <div className="lc-nums" aria-hidden="true">
        {HAIR_LEVELS.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <figcaption>{caption ?? '1 black · 10 lightest blonde'}</figcaption>
    </figure>
  )
}

/** Your hair now, the likely result and the box promise, on one scale. */
export function LevelJourney({
  prediction,
  startLevel,
  startRange,
  target,
}: {
  prediction: Prediction
  startLevel: HairLevel
  /** The measurement's likely range, when the level was measured from the photo. */
  startRange?: { min: number; max: number }
  target: { level: number; swatchHex: string }
}) {
  const result = prediction.result
  if (!result) return null
  const short = !result.reachesTarget && target.level > result.level
  return (
    <LevelChart
      label="Your hair level now, the likely result and the box promise"
      caption={short ? 'Dashed: promised, but probably out of reach.' : undefined}
      lanes={[
        {
          label: 'Your hair now',
          value: `Level ${startLevel}`,
          dot: startLevel,
          dotHex: HAIR_LEVEL_SWATCHES[startLevel],
          band: startRange && startRange.max > startRange.min ? startRange : undefined,
        },
        {
          label: 'Likely with this box',
          value: `Level ${levels(result.range.min, result.range.max)}`,
          dot: result.level,
          dotHex: result.displayHex,
          from: startLevel,
          to: result.level,
          band: result.range.max > result.range.min ? result.range : undefined,
        },
        {
          label: 'What the box promises',
          value: short ? `Level ${target.level} · ${result.levelsShort} short` : `Level ${target.level}`,
          dot: target.level,
          dotHex: target.swatchHex,
          from: startLevel,
          to: short ? result.level : target.level,
          gap: short,
          tone: short ? 'gap' : 'ok',
        },
      ]}
    />
  )
}

/** Your picked box and the closer shades: how far each is expected to get from your level. */
export function ShadeReach({
  recommendation,
  shade: picked,
  startLevel,
}: {
  recommendation: Recommendation
  shade: Shade
  startLevel: HairLevel
}) {
  const options = [
    { shade: picked, prediction: recommendation.original, yours: true },
    ...recommendation.shades.map((s) => ({ shade: s.shade, prediction: s.prediction, yours: false })),
  ]
  const lanes = options.flatMap(({ shade, prediction, yours }): LevelLane[] => {
    const r = prediction.result
    if (!r) return []
    const short = !r.reachesTarget && shade.level > r.level
    return [
      {
        label: `${shade.code} ${shade.name}${yours ? ' (your pick)' : ''}`,
        value: short ? `Likely ${r.level} of ${shade.level}` : `Reaches ${shade.level}`,
        dot: shade.level,
        dotHex: shade.swatchHex,
        from: startLevel,
        to: short ? r.level : shade.level,
        gap: short,
        tone: short ? 'gap' : 'ok',
      },
    ]
  })
  return (
    <LevelChart
      label="How far each box is expected to get from your level"
      lanes={lanes}
      caption={`From your level ${startLevel}. Dashed: out of reach.`}
    />
  )
}
