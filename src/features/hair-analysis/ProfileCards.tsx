import type { ReactNode } from 'react'
import type { HairMetric, HairProfile, Measurement } from '../../../shared/domain/hairProfile'
import { Icon } from '../../components/ui/Icon'

const CURL_SCALE = ['1', '2a', '2b', '2c', '3a', '3b', '3c', '4a', '4b', '4c']

export const METRIC_INFO: Record<HairMetric, { title: string; meaning: string }> = {
  type: {
    title: 'Hair type',
    meaning: 'Curl pattern, 1 (straight) to 4C (coily).',
  },
  frizz: {
    title: 'Frizz',
    meaning: 'How much of your hair looks frizzy.',
  },
  length: {
    title: 'Length',
    meaning: 'Where your hair ends, worn down. “Or longer” means at least.',
  },
  density: {
    title: 'Density',
    meaning: 'How much scalp shows from above. Not a diagnosis.',
  },
}

const STATUS_TEXT: Record<Exclude<Measurement<unknown>['status'], 'measured'>, string> = {
  unsupported: 'Not measured for this hair setup',
  'missing-photos': 'Photo missing',
  failed: 'Couldn’t measure',
  inconclusive: 'Inconclusive',
}

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function Meter({ total, filled, label, open }: { total: number; filled: number; label: string; open?: boolean }) {
  return (
    <div className="meter" role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < filled ? 'meter-seg on' : 'meter-seg'} />
      ))}
      {open && <span className="meter-open">+</span>}
    </div>
  )
}

function Value({ metric, profile }: { metric: HairMetric; profile: HairProfile }) {
  switch (metric) {
    case 'type': {
      const v = profile.type.value!
      const from = CURL_SCALE.indexOf(v.from)
      const to = CURL_SCALE.indexOf(v.to)
      return (
        <>
          <span className="metric-value">{v.term}</span>
          <div className="curl-scale" role="img" aria-label={`Range ${v.from.toUpperCase()} to ${v.to.toUpperCase()}`}>
            {CURL_SCALE.map((c, i) => (
              <span key={c} className={i >= from && i <= to ? 'on' : undefined}>
                {c.toUpperCase()}
              </span>
            ))}
          </div>
        </>
      )
    }
    case 'frizz': {
      const v = profile.frizz.value!
      return (
        <>
          <span className="metric-value">{v.term}</span>
          <Meter total={4} filled={v.mapping + 1} label={`${v.mapping + 1} of 4`} />
        </>
      )
    }
    case 'length': {
      const v = profile.length.value!
      return (
        <>
          <span className="metric-value">{sentence(v.term)}</span>
          <Meter total={8} filled={v.index + 1} open={v.lowerBoundOnly} label={`Band ${v.index + 1} of 8`} />
        </>
      )
    }
    case 'density': {
      const v = profile.density.value!
      return (
        <>
          <span className="metric-value">{v.term}</span>
          <Meter total={4} filled={v.level} label={`Level ${v.level} of 4`} />
          {v.score !== null && <span className="metric-note">Score {v.score.toFixed(2)} on YouCam’s 0–3 scale</span>}
        </>
      )
    }
  }
}

export function ProfileCard({
  metric,
  profile,
  compact,
  badge,
  note,
}: {
  metric: HairMetric
  profile: HairProfile
  compact?: boolean
  /** Where the result came from, e.g. an origin badge in demo mode. */
  badge?: ReactNode
  note?: string
}) {
  const m = profile[metric]
  const info = METRIC_INFO[metric]
  const measured = m.status === 'measured'
  return (
    <article className={measured ? 'metric-card' : 'metric-card metric-unavailable'} aria-label={info.title}>
      <header className="metric-head">
        <span className="metric-title">{info.title}</span>
        {m.status === 'measured' ? (
          <span className="metric-badge">
            <Icon name="check" size={14} /> Measured
          </span>
        ) : (
          <span className="metric-badge metric-badge-off">{STATUS_TEXT[m.status]}</span>
        )}
      </header>
      {measured ? <Value metric={metric} profile={profile} /> : <p className="metric-reason">{m.message}</p>}
      {note && <p className="metric-reason">{note}</p>}
      {badge}
      {!compact && measured && <p className="metric-meaning">{info.meaning}</p>}
    </article>
  )
}
