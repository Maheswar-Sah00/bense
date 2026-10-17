import { useEffect, useState } from 'react'
import { Icon } from './Icon'

export type TaskState = 'waiting' | 'running' | 'done' | 'failed' | 'skipped'

export interface TaskStep {
  id: string
  label: string
  state: TaskState
  /** Small grey line under the label, e.g. which service runs it. */
  detail?: string
}

const STATE_TEXT: Record<TaskState, string> = {
  waiting: 'Waiting',
  running: 'In progress',
  done: 'Done',
  failed: 'Failed',
  skipped: 'Not run',
}

/**
 * Progress for slow live work. We can't see inside YouCam's queue, so steps that run in
 * parallel are all shown "in progress", with real elapsed time against the usual duration.
 */
export function TaskProgress({
  title,
  steps,
  startedAt,
  typicalSeconds,
  engine = 'YouCam AI',
}: {
  title: string
  steps: TaskStep[]
  startedAt: number
  typicalSeconds: number
  /** The service doing the live work, shown as a badge so it's clear what runs here. */
  engine?: string
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const elapsed = Math.max(0, Math.round((now - startedAt) / 1000))
  const slow = elapsed > typicalSeconds * 2

  return (
    <div className="task-progress" role="status" aria-live="polite" aria-label={title}>
      <div className="task-progress-head">
        <span className="spinner" aria-hidden="true" />
        <strong>{title}</strong>
        <span className="engine-badge">
          <i aria-hidden="true" />
          Powered by {engine}
          <span className="engine-live">Live</span>
        </span>
      </div>
      <ol className="task-list">
        {steps.map((step) => (
          <li key={step.id} className={`task task-${step.state}`}>
            <span className="task-icon" aria-hidden="true">
              {step.state === 'done' ? (
                <Icon name="check" size={16} />
              ) : step.state === 'failed' || step.state === 'skipped' ? (
                <Icon name={step.state === 'failed' ? 'close' : 'minus'} size={16} />
              ) : (
                <span className="task-dot" />
              )}
            </span>
            <span className="task-text">
              <span className="task-label">{step.label}</span>
              {step.detail && <span className="task-detail">{step.detail}</span>}
            </span>
            <span className="task-state">{STATE_TEXT[step.state]}</span>
          </li>
        ))}
      </ol>
      <p className="task-time">
        {elapsed} s so far · usually about {typicalSeconds} s
        {slow ? '. YouCam is slower than usual; we’ll keep waiting up to the time limit.' : ''}
      </p>
    </div>
  )
}
