import { ORIGIN_LABELS, type ResultOrigin } from '../../../shared/demo/types'

/** Says where a result came from: live YouCam, the rules engine, a demo example, or nothing. */
export function OriginBadge({ origin }: { origin: ResultOrigin }) {
  const title =
    origin.kind === 'demo-fixture'
      ? origin.provenance
      : origin.kind === 'unavailable'
        ? origin.reason
        : origin.kind === 'deterministic'
          ? `Worked out on this device by the Box Truth rules (${origin.liftLevels}-level lift).`
          : `Returned by YouCam (${origin.service}) for your photo.`
  return (
    <span className={`origin-badge origin-${origin.kind}`} title={title}>
      {ORIGIN_LABELS[origin.kind]}
    </span>
  )
}
