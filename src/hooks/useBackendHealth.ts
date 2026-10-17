import { useCallback, useEffect, useState } from 'react'
import type { HealthResponse } from '../../shared/types'
import { apiFetch } from '../lib/api'

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ready'; health: HealthResponse }
  | { kind: 'error'; message: string }

export function useBackendHealth() {
  const [state, setState] = useState<HealthState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    apiFetch<HealthResponse>('/health')
      .then((health) => !cancelled && setState({ kind: 'ready', health }))
      .catch((err: Error) => !cancelled && setState({ kind: 'error', message: err.message }))
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState({ kind: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { state, retry }
}
