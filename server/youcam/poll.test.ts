import { describe, expect, it } from 'vitest'
import { pollTask, TaskTimeoutError } from './poll'

function fakeClock() {
  let t = 0
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += ms
    },
  }
}

describe('pollTask', () => {
  it('returns once the task finishes', async () => {
    const statuses = ['running', 'running', 'success'] as const
    let calls = 0
    const result = await pollTask(async () => ({ status: statuses[calls++] }), fakeClock())

    expect(result.status).toBe('success')
    expect(calls).toBe(3)
  })

  it('returns error results instead of throwing', async () => {
    const result = await pollTask(async () => ({ status: 'error' as const }), fakeClock())
    expect(result.status).toBe('error')
  })

  it('times out if the task never finishes', async () => {
    const run = pollTask(async () => ({ status: 'running' as const }), {
      ...fakeClock(),
      intervalMs: 1000,
      timeoutMs: 5000,
    })
    await expect(run).rejects.toBeInstanceOf(TaskTimeoutError)
  })
})
