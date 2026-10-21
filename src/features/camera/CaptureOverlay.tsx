export type OverlayKind = 'face-card' | 'face' | 'turn-right' | 'turn-left' | 'top'

/** Framing guide drawn over the live camera (and as a diagram before it starts). */
export function CaptureOverlay({ kind }: { kind: OverlayKind }) {
  return (
    <svg className="capture-overlay" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="10 8" strokeLinecap="round">
        {kind === 'top' ? (
          <>
            <ellipse cx="150" cy="190" rx="100" ry="82" />
            <path d="M150 120v140" strokeDasharray="4 8" />
          </>
        ) : (
          <ellipse cx="150" cy="168" rx="96" ry="122" />
        )}
        {kind === 'face-card' && <rect x="95" y="310" width="110" height="60" rx="8" />}
        {kind === 'turn-right' && <path d="M110 322c25 18 55 18 80 0m0 0-14 2m14-2-2 14" strokeDasharray="none" />}
        {kind === 'turn-left' && <path d="M190 322c-25 18-55 18-80 0m0 0 14 2m-14-2 2 14" strokeDasharray="none" />}
      </g>
      <g fill="currentColor" fontSize="15" fontWeight="600" textAnchor="middle" fontFamily="inherit">
        {kind === 'face-card' && (
          <text x="150" y="341" dominantBaseline="middle">
            White card
          </text>
        )}
        {kind === 'turn-right' && <text x="150" y="380">Turn about 45° to your right</text>}
        {kind === 'turn-left' && <text x="150" y="380">Turn about 45° to your left</text>}
        {kind === 'top' && <text x="150" y="315">Tilt down · parting here</text>}
      </g>
    </svg>
  )
}
