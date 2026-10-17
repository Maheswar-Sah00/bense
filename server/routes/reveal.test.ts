// Mocked: YouCam and the result download are stubbed. Live: npm run smoke:reveal.
import { describe, expect, it, vi } from 'vitest'
import type { ApiError, HairMaskResponse, RevealResponse } from '../../shared/types'
import { buildApp } from '../app'
import { readEnv } from '../env'
import { InFlight } from '../services/hairColourRender'
import { YouCamClient } from '../youcam/client'

const env = readEnv({ YOUCAM_API_KEY: 'test-key' })
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

function jpeg(width = 600, height = 800) {
  const sof = [0xff, 0xc0, 0, 17, 8, height >> 8, height & 0xff, width >> 8, width & 0xff, 3]
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, ...sof, ...new Array(9).fill(0)])
}
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16, 1)])

function fastPoll() {
  let now = 0
  return { intervalMs: 1, timeoutMs: 20, now: () => now, sleep: async (ms: number) => void (now += ms) }
}

/** YouCam stub that answers by URL, so two parallel renders interleave safely. */
function youcamStub(opts: { failRender?: string } = {}) {
  let tasks = 0
  const submitted: { color: string; intensity: number }[] = []
  const api = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input)
    if (url.endsWith('/s2s/v2.0/file')) {
      return json({ data: { files: [{ file_id: 'f1', requests: [{ method: 'PUT', url: 'https://s3.test/up', headers: {} }] }] } })
    }
    if (url === 'https://s3.test/up') return new Response(null, { status: 200 })
    if (url.endsWith('/task/hair-color')) {
      const body = JSON.parse(init!.body as string)
      submitted.push({ color: body.palettes[0].color, intensity: body.palettes[0].color_intensity })
      expect(body).toMatchObject({ src_file_id: 'f1', pattern: { name: 'full' } })
      expect(body.preset).toBeUndefined()
      return json({ data: { task_id: `t-${body.palettes[0].color.slice(1)}-${++tasks}` } })
    }
    const id = url.split('/').pop()!
    if (opts.failRender && id.includes(opts.failRender)) {
      return json({ data: { task_status: 'error', error: 'error_inference', error_message: 'x' } })
    }
    return json({ data: { task_status: 'success', results: { url: `https://results.test/${id}.png` } } })
  })
  return { api, submitted }
}

function appWith(api: typeof fetch, download: typeof fetch) {
  const youcam = new YouCamClient('test-key', 'https://api.test', api)
  return buildApp(env, { youcam, poll: fastPoll(), downloadFetch: download })
}

const post = (app: ReturnType<typeof buildApp>, query = 'promise=AEA596&result=876956', payload = jpeg()) =>
  app.inject({ method: 'POST', url: `/api/colour/reveal?${query}`, payload, headers: { 'content-type': 'image/jpeg' } })

describe('POST /api/colour/reveal (mocked YouCam)', () => {
  it('uploads once, renders both colours with the same settings, and returns both images', async () => {
    const { api, submitted } = youcamStub()
    const download = vi.fn<typeof fetch>(async () => new Response(PNG))
    const res = await post(appWith(api, download))
    expect(res.statusCode).toBe(200)
    const body = res.json<RevealResponse>()
    expect(body.promise).toMatchObject({ colour: '#AEA596', colorIntensity: 100 })
    expect(body.result).toMatchObject({ colour: '#876956', colorIntensity: 100 })
    expect(body.promise.image.startsWith('data:image/png;base64,')).toBe(true)
    expect(api.mock.calls.filter((c) => String(c[0]).endsWith('/file'))).toHaveLength(1)
    expect(submitted.map((s) => s.color).sort()).toEqual(['#876956', '#AEA596'])
    expect(new Set(submitted.map((s) => s.intensity))).toEqual(new Set([100]))
    expect(download).toHaveBeenCalledTimes(2)
  })

  it('renders once when the predicted colour equals the promise', async () => {
    const { api, submitted } = youcamStub()
    const res = await post(appWith(api, async () => new Response(PNG)), 'promise=AEA596&result=aea596')
    expect(res.statusCode).toBe(200)
    expect(submitted).toHaveLength(1)
    expect(res.json<RevealResponse>().result.colour).toBe('#AEA596')
  })

  it('joins a duplicate request that is still running instead of paying twice', async () => {
    const { api, submitted } = youcamStub()
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    const app = appWith(api, async () => {
      await gate
      return new Response(PNG)
    })
    const first = post(app)
    const second = post(app)
    await new Promise((r) => setTimeout(r, 30))
    release()
    const [a, b] = await Promise.all([first, second])
    expect(a.statusCode).toBe(200)
    expect(b.statusCode).toBe(200)
    expect(submitted).toHaveLength(2) // one promise + one result, not four
  })

  it('reports an expired result link as retryable', async () => {
    const { api } = youcamStub()
    const res = await post(appWith(api, async () => new Response('gone', { status: 403 })))
    expect(res.statusCode).toBe(502)
    expect(res.json<ApiError>()).toMatchObject({ code: 'render_expired', retryable: true })
  })

  it('rejects a result that is not an image', async () => {
    const { api } = youcamStub()
    const res = await post(appWith(api, async () => new Response('<html>error</html>')))
    expect(res.json<ApiError>().code).toBe('invalid_response')
  })

  it('fails the reveal when either render fails', async () => {
    const { api } = youcamStub({ failRender: '876956' })
    const res = await post(appWith(api, async () => new Response(PNG)))
    expect(res.statusCode).toBe(502)
    expect(res.json<ApiError>()).toMatchObject({ code: 'analysis_failed', retryable: true })
  })

  it('validates colours and the documented image limits before calling YouCam', async () => {
    const { api } = youcamStub()
    const app = appWith(api, async () => new Response(PNG))
    expect((await post(app, 'promise=red&result=876956')).statusCode).toBe(400)
    expect((await post(app, 'promise=AEA596')).statusCode).toBe(400)
    expect((await post(app, undefined, jpeg(1920, 800))).json<ApiError>().code).toBe('invalid_image')
    expect((await post(app, undefined, jpeg(800, 1080))).json<ApiError>().code).toBe('invalid_image')
    expect((await post(app, undefined, jpeg(300, 300))).json<ApiError>().code).toBe('invalid_image')
    expect(api).not.toHaveBeenCalled()
  })
})

describe('InFlight', () => {
  it('runs one task per key and forgets it when done', async () => {
    const flights = new InFlight<number>()
    let calls = 0
    const task = async () => ++calls
    const a = flights.run('k', task)
    const b = flights.run('k', task)
    expect(b.joined).toBe(true)
    expect(await a.promise).toBe(1)
    expect(await b.promise).toBe(1)
    expect(flights.size).toBe(0)
    expect(await flights.run('k', task).promise).toBe(2)
  })
})

describe('POST /api/colour/hair-mask (mocked YouCam)', () => {
  const postMask = (app: ReturnType<typeof buildApp>, payload: Buffer = jpeg()) =>
    app.inject({ method: 'POST', url: '/api/colour/hair-mask', payload, headers: { 'content-type': 'image/jpeg' } })

  it('renders the hair in #00FF00 at full intensity, once, and returns the image', async () => {
    const { api, submitted } = youcamStub()
    const res = await postMask(appWith(api, async () => new Response(PNG)))
    expect(res.statusCode).toBe(200)
    const body = res.json<HairMaskResponse>()
    expect(body.mask).toMatchObject({ colour: '#00FF00', colorIntensity: 100 })
    expect(body.mask.image.startsWith('data:image/png;base64,')).toBe(true)
    expect(submitted).toEqual([{ color: '#00FF00', intensity: 100 }])
  })

  it('a double tap joins the running render instead of paying twice', async () => {
    const { api, submitted } = youcamStub()
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    const app = appWith(api, async () => {
      await gate
      return new Response(PNG)
    })
    const first = postMask(app)
    const second = postMask(app)
    await new Promise((r) => setTimeout(r, 30))
    release()
    const [a, b] = await Promise.all([first, second])
    expect([a.statusCode, b.statusCode]).toEqual([200, 200])
    expect(submitted).toHaveLength(1)
  })

  it('reports render failures and bad photos with their codes', async () => {
    const failing = youcamStub({ failRender: '00FF00' })
    const res = await postMask(appWith(failing.api, async () => new Response(PNG)))
    expect(res.statusCode).toBeGreaterThanOrEqual(400)
    expect(res.json<ApiError>().code).toBeDefined()
    const { api } = youcamStub()
    const bad = await postMask(appWith(api, async () => new Response(PNG)), Buffer.from('not an image'))
    expect(bad.json<ApiError>().code).toBe('invalid_image')
    const unconfigured = await buildApp(readEnv({ YOUCAM_API_KEY: '' })).inject({
      method: 'POST',
      url: '/api/colour/hair-mask',
      payload: jpeg(),
      headers: { 'content-type': 'image/jpeg' },
    })
    expect(unconfigured.json<ApiError>().code).toBe('not_configured')
  })
})
