import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from './Icon'

interface ListRowProps {
  icon?: IconName
  /** Custom content for the round avatar, e.g. a colour swatch. */
  avatar?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  value?: ReactNode
  /** Smaller line under the value, as in the reference's balance column. */
  valueNote?: ReactNode
  tone?: 'positive' | 'muted'
  to?: string
}

/** Transaction-style row: round avatar, title and subtitle, value on the right. */
export function ListRow({ icon, avatar, title, subtitle, value, valueNote, tone, to }: ListRowProps) {
  const inner = (
    <>
      <span className="row-avatar">{avatar ?? (icon && <Icon name={icon} />)}</span>
      <span className="row-text">
        <span className="row-title">{title}</span>
        {subtitle && <span className="row-subtitle">{subtitle}</span>}
      </span>
      {(value || valueNote) && (
        <span className="row-value">
          {value && <span className={tone ? `row-amount row-${tone}` : 'row-amount'}>{value}</span>}
          {valueNote && <span className="row-subtitle">{valueNote}</span>}
        </span>
      )}
    </>
  )
  return to ? (
    <Link to={to} className="row row-link">
      {inner}
    </Link>
  ) : (
    <div className="row">{inner}</div>
  )
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {action}
    </div>
  )
}
