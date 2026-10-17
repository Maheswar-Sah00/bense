import type { ReactNode } from 'react'
import { Button } from './Button'
import { Icon, type IconName } from './Icon'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state-error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

/** Dashed placeholder card, the same treatment as the reference's "New" card. */
export function EmptyState({
  icon = 'plus',
  title,
  message,
  action,
}: {
  icon?: IconName
  title: string
  message: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} />
      </span>
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </div>
  )
}

/** Labels unfinished features honestly instead of showing invented results. */
export function NotConnectedNote({ children }: { children: ReactNode }) {
  return (
    <div className="note">
      <Icon name="info" size={20} />
      <p>{children}</p>
    </div>
  )
}
