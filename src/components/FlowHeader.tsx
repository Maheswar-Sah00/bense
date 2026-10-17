import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconButton } from './ui/Button'

interface FlowHeaderProps {
  backTo: string
  step: number
  total: number
  title: string
  subtitle?: ReactNode
}

export function FlowHeader({ backTo, step, total, title, subtitle }: FlowHeaderProps) {
  const navigate = useNavigate()
  return (
    <header className="flow-head">
      <div className="flow-bar">
        <IconButton icon="back" label="Back" onClick={() => navigate(backTo)} />
        <div
          className="progress progress-steps"
          role="progressbar"
          aria-label={`Step ${step} of ${total}`}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={step}
        >
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={i < step ? 'on' : undefined} />
          ))}
        </div>
        <span className="flow-step">
          {String(step).padStart(2, '0')}/{String(total).padStart(2, '0')}
        </span>
      </div>
      <h1>{title}</h1>
      {subtitle && <p className="lead">{subtitle}</p>}
    </header>
  )
}
