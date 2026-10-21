import { z } from 'zod'
import type { YouCamTaskStatus } from '../../shared/types'
import { pollTask, type PollOptions } from './poll'

// Shapes follow the official OpenAPI files in /docs/youcam-api (file.yaml, ai_*.yaml).

const FileResponse = z.object({
  data: z.object({
    files: z
      .array(
        z.object({
          file_id: z.string().min(1),
          requests: z
            .array(
              z.object({
                url: z.url(),
                method: z.string().default('PUT'),
                headers: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
              }),
            )
            .min(1),
        }),
      )
      .min(1),
  }),
})

const StartResponse = z.object({ data: z.object({ task_id: z.string().min(1) }) })

const StatusResponse = z.object({
  data: z.looseObject({
    task_status: z.string(),
    error: z.string().nullish(),
    error_message: z.string().nullish(),
    results: z.unknown().optional(),
  }),
})

/** Documented error body: { status, error, error_code? }. */
const ErrorBody = z.looseObject({ error: z.string().optional(), error_code: z.string().optional() })

export interface TaskResult {
  status: YouCamTaskStatus
  taskId: string
  /** Engine error code when status is 'error', e.g. error_no_face. */
  engineError: string | null
  engineErrorMessage: string | null
  results: unknown
}

export class YouCamError extends Error {
  /** HTTP status from YouCam, if the request got a response. */
  readonly status?: number
  /** Documented `error_code`, e.g. CreditInsufficiency. */
  readonly errorCode?: string

  constructor(message: string, status?: number, errorCode?: string) {
    super(message)
    this.name = 'YouCamError'
    this.status = status
    this.errorCode = errorCode
  }
}

export class YouCamClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(apiKey: string, baseUrl: string, fetchImpl: typeof fetch = fetch) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
    this.fetchImpl = fetchImpl
  }

  private async request<S extends z.ZodType>(path: string, schema: S, init: RequestInit = {}): Promise<z.infer<S>> {
    let res: Response
    try {
      res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json', ...init.headers },
        signal: init.signal ?? AbortSignal.timeout(30_000),
      })
    } catch {
      throw new YouCamError(`Could not reach YouCam (${path})`)
    }
    const body: unknown = await res.json().catch(() => null)
    if (!res.ok) {
      const parsed = ErrorBody.safeParse(body)
      const detail = parsed.success ? parsed.data : {}
      throw new YouCamError(detail.error ?? `YouCam ${path} returned ${res.status}`, res.status, detail.error_code)
    }
    const parsed = schema.safeParse(body)
    if (!parsed.success) throw new YouCamError(`Unexpected YouCam response from ${path}`, res.status, 'InvalidResponse')
    return parsed.data
  }

  /** Upload an image via the File API and return its file_id. */
  async uploadImage(bytes: Uint8Array, fileName: string, contentType: string): Promise<string> {
    const { data } = await this.request('/s2s/v2.0/file', FileResponse, {
      method: 'POST',
      body: JSON.stringify({ files: [{ content_type: contentType, file_name: fileName, file_size: bytes.byteLength }] }),
    })
    const file = data.files[0]
    const upload = file.requests[0]
    // fetch sets Content-Length itself; forwarding it as a header is rejected by undici.
    const headers = Object.fromEntries(
      Object.entries(upload.headers)
        .filter(([key]) => key.toLowerCase() !== 'content-length')
        .map(([key, value]) => [key, String(value)]),
    )
    let res: Response
    try {
      res = await this.fetchImpl(upload.url, {
        method: upload.method,
        headers,
        body: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: contentType }),
        signal: AbortSignal.timeout(60_000),
      })
    } catch {
      throw new YouCamError('Could not upload the image to YouCam storage')
    }
    if (!res.ok) throw new YouCamError(`Image upload failed with ${res.status}`, res.status)
    return file.file_id
  }

  async startTask(endpoint: string, body: Record<string, unknown>): Promise<string> {
    const { data } = await this.request(`/s2s/v2.0/task/${endpoint}`, StartResponse, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return data.task_id
  }

  async getTask(endpoint: string, taskId: string): Promise<TaskResult> {
    const { data } = await this.request(`/s2s/v2.0/task/${endpoint}/${encodeURIComponent(taskId)}`, StatusResponse)
    const status: YouCamTaskStatus =
      data.task_status === 'success' || data.task_status === 'error' ? data.task_status : 'running'
    return {
      status,
      taskId,
      engineError: data.error ?? null,
      engineErrorMessage: data.error_message ?? null,
      results: data.results,
    }
  }

  /**
   * Start a task and poll it to completion. A 429, a 5xx or a dropped connection while polling
   * is treated as "still running" (a few times in a row at most): the docs warn an unpolled task
   * can still consume units, so one blip shouldn't abandon a task that is still working.
   */
  async runTask(endpoint: string, body: Record<string, unknown>, poll?: PollOptions): Promise<TaskResult> {
    const taskId = await this.startTask(endpoint, body)
    let blips = 0
    return pollTask(async () => {
      try {
        const result = await this.getTask(endpoint, taskId)
        blips = 0
        return result
      } catch (error) {
        const status = error instanceof YouCamError ? error.status : undefined
        const transient = error instanceof YouCamError && (status === 429 || status === undefined || status >= 500)
        if (transient && (status === 429 || ++blips <= 3)) {
          return { status: 'running', taskId, engineError: null, engineErrorMessage: null, results: undefined }
        }
        throw error
      }
    }, poll)
  }
}
