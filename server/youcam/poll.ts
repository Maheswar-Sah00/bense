import type { YouCamTaskStatus } from '../../shared/types'

export interface PollOptions {
  intervalMs?: number
  timeoutMs?: number
  sleep?: (ms: number) => Promise<void>
  now?: () => number
}

export class TaskTimeoutError extends Error {}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Poll a YouCam task until it leaves the running state.
 * A Hair Color render takes about 13 s, so the defaults allow plenty of headroom.
 */
export async function pollTask<T extends { status: YouCamTaskStatus }>(
  check: () => Promise<T>,
  { intervalMs = 2000, timeoutMs = 120_000, sleep = defaultSleep, now = Date.now }: PollOptions = {},
): Promise<T> {
  const deadline = now() + timeoutMs
  for (;;) {
    const result = await check()
    if (result.status !== 'running') return result
    if (now() + intervalMs > deadline) throw new TaskTimeoutError(`Task still running after ${timeoutMs} ms`)
    await sleep(intervalMs)
  }
}
