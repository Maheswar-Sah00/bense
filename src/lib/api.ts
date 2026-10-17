import type { ApiError, ApiErrorCode } from '../../shared/types'

export class ApiRequestError extends Error {
  readonly status: number
  readonly code?: ApiErrorCode
  readonly retryable: boolean

  constructor(message: string, status: number, code?: ApiErrorCode, retryable = false) {
    super(message)
    this.status = status
    this.code = code
    this.retryable = retryable
  }
}

/** Fetch JSON from our own backend (proxied to the API server in development). */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, init)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    const offline = typeof navigator !== 'undefined' && !navigator.onLine
    throw new ApiRequestError(
      offline
        ? 'You’re offline. Live YouCam analysis needs a connection; demo mode works offline.'
        : 'Could not reach the server. Check your connection, or that the API server is running.',
      0,
      undefined,
      true,
    )
  }
  const body = (await res.json().catch(() => null)) as T | ApiError | null
  if (!res.ok) {
    const err = body && typeof body === 'object' && 'error' in body ? body : null
    throw new ApiRequestError(err?.error ?? `Request failed (${res.status})`, res.status, err?.code, err?.retryable ?? false)
  }
  return body as T
}

/** POST a photo as the raw request body. It goes only to our server, which forwards it to YouCam. */
export function postImage<T>(path: string, image: Blob, signal?: AbortSignal): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': image.type || 'image/jpeg' },
    body: image,
    signal,
  })
}
