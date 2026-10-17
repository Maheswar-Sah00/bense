// Mocked: YouCam is replaced by a stubbed fetch. See server/scripts/smoke-colour-tones.ts for the live test.
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { ApiError, ColourTonesResponse } from '../../shared/types'
import { buildApp } from '../app'
import { readEnv } from '../env'
import { YouCamClient } from '../youcam/client'

const env = readEnv({ YOUCAM_API_KEY: 'test-key' })
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
/** Polls instantly on a fake clock, so the 50 ms timeout is reached after 50 polls. */
function fastPoll() {
  let now = 0
  return {
    intervalMs: 1,
    timeoutMs: 50,
    now: () => now,
    sleep: async (ms: number) => {
      now += ms
    },
  }
}

/** 400x400 JPEG header: enough for server-side validation. */
function jpeg(width = 400, height = 400) {
  const sof = [0xff, 0xc0, 0, 17, 8, height >> 8, height & 0xff, width >> 8, width & 0xff, 3]
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, ...sof, ...new Array(9).fill(0)])
}

const fileOk = () =>
  json({
    data: { files: [{ file_id: 'f1', requests: [{ method: 'PUT', url: 'https://s3.test/u', headers: {} }] }] },
  })

// The documented example response from ai_skin_tone_analysis.yaml.
const DOC_EXAMPLE = {
  status: 200,
  data: {
    task_status: 'success',
    results: {
      color: {
        eye_color: '#293F9B',
        eye_color_name: 'Blue',
        lip_color: '#D23245',
        eyebrow_color: '#5B2B31',
        skin_color: '#b9947c',
        hair_color: '#a0a0a0',
        hair_color_name: 'Auburn',
      },
    },
  },
}

function appWith(...responses: (Response | Error)[]) {
  const fetchImpl = vi.fn<typeof fetch>()
  for (const r of responses) {
    if (r instanceof Error) fetchImpl.mockRejectedValueOnce(r)
    else fetchImpl.mockResolvedValueOnce(r)
  }
  const youcam = new YouCamClient('test-key', 'https://api.test', fetchImpl)
  return { app: buildApp(env, { youcam, poll: fastPoll() }), fetchImpl }
}

const post = (app: ReturnType<typeof buildApp>, payload: Buffer, type = 'image/jpeg') =>
  app.inject({ method: 'POST', url: '/api/colour/tones', payload, headers: { 'content-type': type } })

describe('POST /api/colour/tones (mocked YouCam)', () => {
  it('runs the documented lifecycle: file, upload, submit, poll, parse', async () => {
    const { app, fetchImpl } = appWith(
      fileOk(),
      new Response(null, { status: 200 }),
      json({ status: 200, data: { task_id: 't1' } }),
      json({ status: 200, data: { task_status: 'running' } }),
      json(DOC_EXAMPLE),
    )
    const res = await post(app, jpeg())
    expect(res.statusCode).toBe(200)
    const { reading } = res.json<ColourTonesResponse>()
    expect(reading).toMatchObject({
      source: 'youcam-facial-color-tones',
      apiHairColorName: 'Auburn',
      apiHairColorHex: '#a0a0a0',
      normalizedHex: '#A0A0A0',
      family: 'Auburn',
      levelEstimate: { min: 4, max: 6, suggested: 5 },
    })
    const urls = fetchImpl.mock.calls.map((c) => c[0])
    expect(urls).toEqual([
      'https://api.test/s2s/v2.0/file',
      'https://s3.test/u',
      'https://api.test/s2s/v2.0/task/skin-tone-analysis',
      'https://api.test/s2s/v2.0/task/skin-tone-analysis/t1',
      'https://api.test/s2s/v2.0/task/skin-tone-analysis/t1',
    ])
    const submitted = JSON.parse(fetchImpl.mock.calls[2][1]!.body as string)
    expect(submitted).toEqual({ src_file_id: 'f1', face_angle_strictness_level: 'medium' })
  })

  it('parses the real response recorded by the live smoke test', async () => {
    const fixture = JSON.parse(
      readFileSync(new URL('../youcam/__fixtures__/skin-tone-analysis.live.json', import.meta.url), 'utf8'),
    )
    const { app } = appWith(
      fileOk(),
      new Response(null, { status: 200 }),
      json({ data: { task_id: 't1' } }),
      json(fixture.status),
    )
    const res = await post(app, jpeg())
    expect(res.statusCode).toBe(200)
    expect(res.json<ColourTonesResponse>().reading.apiHairColorName).toBe(fixture.status.data.results.color.hair_color_name)
  })

  it('turns documented face errors into guidance', async () => {
    const { app } = appWith(
      fileOk(),
      new Response(null, { status: 200 }),
      json({ data: { task_id: 't1' } }),
      json({ data: { task_status: 'error', error: 'error_face_position_too_small', error_message: 'x' } }),
    )
    const res = await post(app, jpeg())
    expect(res.statusCode).toBe(422)
    expect(res.json<ApiError>()).toMatchObject({ code: 'photo_rejected', retryable: false })
    expect(res.json<ApiError>().error).toContain('Move closer')
  })

  it.each([
    [json({ status: 401, error: 'Invalid API key' }, 401), 503, 'auth_failed'],
    [json({ status: 400, error: 'x', error_code: 'CreditInsufficiency' }, 400), 503, 'out_of_units'],
    [json({ status: 429, error: 'Too many requests' }, 429), 429, 'rate_limited'],
    [json({ data: { nope: true } }), 502, 'invalid_response'],
    [new TypeError('fetch failed'), 502, 'upstream_unavailable'],
  ])('maps upstream failure to %#', async (response, status, code) => {
    const { app } = appWith(response)
    const res = await post(app, jpeg())
    expect(res.statusCode).toBe(status)
    expect(res.json<ApiError>().code).toBe(code)
  })

  it('times out a task that never finishes', async () => {
    const running = () => json({ data: { task_status: 'running' } })
    const { app } = appWith(
      fileOk(),
      new Response(null, { status: 200 }),
      json({ data: { task_id: 't1' } }),
      ...Array.from({ length: 80 }, running),
    )
    const res = await post(app, jpeg())
    expect(res.statusCode).toBe(504)
    expect(res.json<ApiError>()).toMatchObject({ code: 'timeout', retryable: true })
  })

  it('rejects invalid images before calling YouCam', async () => {
    const { app, fetchImpl } = appWith()
    expect((await post(app, Buffer.from('not an image at all'))).statusCode).toBe(415)
    expect((await post(app, jpeg(200, 200))).json<ApiError>().code).toBe('invalid_image')
    expect((await post(app, jpeg(), 'image/png')).statusCode).toBe(415)
    expect((await post(app, jpeg(), 'image/gif')).statusCode).toBe(415)
    expect((await post(app, Buffer.alloc(11 * 1024 * 1024))).statusCode).toBe(413)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('says when the server has no key', async () => {
    const app = buildApp(readEnv({}))
    const res = await post(app, jpeg())
    expect(res.statusCode).toBe(503)
    expect(res.json<ApiError>().code).toBe('not_configured')
  })
})
