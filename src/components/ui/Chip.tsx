import type { ReactNode } from 'react'

/** Selectable pill. Selected chips use the accent colour, like the reference's primary pill. */
export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" className="chip" aria-pressed={selected} onClick={onClick}>
      {children}
    </button>
  )
}

export function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="chip-row" role="group" aria-label={label}>
      {children}
    </div>
  )
}
