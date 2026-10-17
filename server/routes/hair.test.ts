// Mocked: YouCam is stubbed. Live: npm run smoke:hair.
import { describe, expect, it, vi } from 'vitest'
import type { HairAnalysisResponse } from '../../shared/types'
import { buildApp } from '../app'
import { readEnv } from '../env'
import { YouCamClient } from '../youcam/client'

const env = readEnv({ YOUCAM_API_KEY: 'test-key' })
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

function jpegUrl(width = 600, height = 800, seed = 0) {
  const sof = [0xff, 0xc0, 0, 17, 8, height >> 8, height & 0xff, width >> 8, width & 0xff, 3]
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, seed, ...sof, ...new Array(9).fill(0)])
  return `data:image/jpeg;base64,${bytes.toString('base64')}`
}
const VIEWS = { front: jpegUrl(600, 800, 1), left45: jpegUrl(600, 800, 2), right45: jpegUrl(600, 800, 3), top: jpegUrl(600, 800, 4) }

const RESULTS: Record<string, unknown> = {
  'hair-type-detection': { hair_type: { mapping: '2a to 2b', term: 'Slight to Medium Wavy' } },
  'hair-frizziness-detection': { hair_frizziness: { mapping: 1, term: 'Slightly Frizzy' } },
  'hair-length-detection': { hair_length: { term: 'above chest or longer' } },
  'hair-density-detection': { timed: 1.2, hair_density: { mapping: '2.16', term: 'Medium Density' } },
}

/** Stub answering by URL; `override` replaces a task's final status payload. */
function stub(override: Record<string, unknown> = {}, gate?: Promise<void>) {
  let files = 0
  const bodies: Record<string, unknown> = {}
  const api = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input)
    if (url.endsWith('/s2s/v2.0/file')) {
      const name = JSON.parse(init!.body as string).files[0].file_name.split('.')[0]
      files++
      return json({ data: { files: [{ file_id: `id-${name}`, requests: [{ method: 'PUT', url: `https://s3.test/${name}`, headers: {} }] }] } })
    }
    if (url.startsWith('https://s3.test/')) return new Response(null, { status: 200 })
    const match = url.match(/\/task\/([a-z-]+)(?:\/(.+))?$/)!
    const endpoint = match[1]
    if (!match[2]) {
      bodies[endpoint] = JSON.parse(init!.body as string)
      return json({ data: { task_id: endpoint } })
    }
    if (gate) await gate
    if (override[endpoint]) return json(override[endpoint])
    return json({ data: { task_status: 'success', results: RESULTS[endpoint] } })
  })
  return { api, bodies, uploads: () => files }
}

function fastPoll() {
  let now = 0
  return { intervalMs: 1, timeoutMs: 20, now: () => now, sleep: async (ms: number) => void (now += ms) }
}

const post = (app: ReturnType<typeof buildApp>, payload: unknown) =>
  app.inject({ method: 'POST', url: '/api/hair/analysis', payload: payload as object })

const appWith = (api: typeof fetch) => buildApp(env, { youcam: new YouCamClient('k', 'https://api.test', api), poll: fastPoll() })

describe('POST /api/hair/analysis (mocked YouCam)', () => {
  it('runs all four documented tasks, uploads each photo once, and normalises the results', async () => {
    const { api, bodies, uploads } = stub()
    const res = await post(appWith(api), { setup: 'loose', views: VIEWS })
    expect(res.statusCode).toBe(200)
    const { profile, unitsPlanned } = res.json<HairAnalysisResponse>()
    expect(unitsPlanned).toBe(7)
    expect(uploads()).toBe(5) // front uploaded twice: type/frizz share one copy, length gets its own
    // Documented order: frontFace, rightFace (our left45: face turned right), leftFace.
    expect(bodies['hair-type-detection']).toEqual({ src_file_ids: ['id-front', 'id-left45', 'id-right45'] })
    expect(bodies['hair-frizziness-detection']).toEqual({ src_file_ids: ['id-front', 'id-left45', 'id-right45'] })
    expect(bodies['hair-length-detection']).toEqual({ src_file_id: 'id-front' })
    expect(bodies['hair-density-detection']).toEqual({ src_file_id: 'id-top' })
    expect(profile.type).toMatchObject({ status: 'measured', value: { mapping: '2a to 2b', from: '2a', to: '2b' } })
    expect(profile.frizz).toMatchObject({ status: 'measured', value: { mapping: 1 } })
    expect(profile.length).toMatchObject({ status: 'measured', value: { term: 'above chest or longer', lowerBoundOnly: true } })
    expect(profile.density).toMatchObject({ status: 'measured', value: { level: 3, score: 2.16 } })
  })

  it('keeps valid results when one measurement fails', async () => {
    const { api } = stub({
      'hair-type-detection': { data: { task_status: 'error', error: 'error_face_angle_invalid', error_message: 'x' } },
    })
    const { profile } = (await post(appWith(api), { setup: 'loose', views: VIEWS })).json<HairAnalysisResponse>()
    expect(profile.type).toMatchObject({ status: 'failed', errorCode: 'error_face_angle_invalid' })
    expect(profile.type.message).toMatch(/angle/)
    expect(profile.frizz.status).toBe('measured')
    expect(profile.density.status).toBe('measured')
  })

  it('retries only the requested measurements, so successful ones are not paid for again', async () => {
    const { api, bodies } = stub()
    const res = await post(appWith(api), { setup: 'loose', views: VIEWS, only: ['type', 'frizz'] })
    expect(res.statusCode).toBe(200)
    const { profile, unitsPlanned } = res.json<HairAnalysisResponse>()
    expect(unitsPlanned).toBe(4)
    expect(Object.keys(bodies).sort()).toEqual(['hair-frizziness-detection', 'hair-type-detection'])
    expect(profile.type.status).toBe('measured')
    expect(profile.length).toMatchObject({ status: 'unsupported', message: 'Not requested in this run.' })
    expect((await post(appWith(api), { setup: 'loose', views: VIEWS, only: ['colour'] })).statusCode).toBe(400)
  })

  it('retries a task once after YouCam’s intermittent unknown_internal_error, but not other errors', async () => {
    let densityPolls = 0
    const flaky = stub()
    const api = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/task/hair-density-detection/hair-density-detection') && densityPolls++ === 0) {
        return json({ data: { task_status: 'error', error: 'unknown_internal_error', error_message: 'x' } })
      }
      return flaky.api(input, init)
    })
    const { profile } = (await post(appWith(api), { setup: 'tied', views: { top: VIEWS.top } })).json<HairAnalysisResponse>()
    expect(profile.density.status).toBe('measured')
    expect(densityPolls).toBe(2)

    const angle = stub({ 'hair-length-detection': { data: { task_status: 'error', error: 'error_face_angle_invalid' } } })
    await post(appWith(angle.api), { setup: 'loose', views: { front: VIEWS.front } })
    const lengthStarts = angle.api.mock.calls.filter(([u, init]) => String(u).endsWith('/task/hair-length-detection') && init?.method === 'POST')
    expect(lengthStarts).toHaveLength(1)
  })

  it('retries type and frizz with the side photos swapped when YouCam rejects the angle', async () => {
    const base = stub()
    const starts: string[][] = []
    const api = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/task/hair-type-detection') && init?.method === 'POST') {
        starts.push(JSON.parse(init.body as string).src_file_ids)
      }
      // YouCam accepts only the swapped order in this stub.
      if (url.endsWith('/task/hair-type-detection/hair-type-detection') && starts.at(-1)?.[1] === 'id-left45') {
        return json({ data: { task_status: 'error', error: 'error_face_angle_invalid', error_message: 'x' } })
      }
      return base.api(input, init)
    })
    const { profile } = (await post(appWith(api), { setup: 'loose', views: VIEWS })).json<HairAnalysisResponse>()
    expect(starts).toEqual([
      ['id-front', 'id-left45', 'id-right45'],
      ['id-front', 'id-right45', 'id-left45'],
    ])
    expect(profile.type.status).toBe('measured')
  })

  it('marks out-of-spec values inconclusive instead of guessing', async () => {
    const { api } = stub({ 'hair-length-detection': { data: { task_status: 'success', results: { hair_length: { term: 'waist' } } } } })
    const { profile } = (await post(appWith(api), { setup: 'loose', views: VIEWS })).json<HairAnalysisResponse>()
    expect(profile.length).toMatchObject({ status: 'inconclusive', raw: { term: 'waist' } })
  })

  it('does not run measurements that tied hair would distort', async () => {
    const { api, bodies } = stub()
    const { profile, unitsPlanned } = (await post(appWith(api), { setup: 'tied', views: VIEWS })).json<HairAnalysisResponse>()
    expect(Object.keys(bodies)).toEqual(['hair-density-detection'])
    expect(unitsPlanned).toBe(1)
    expect(profile.type.status).toBe('unsupported')
    expect(profile.density.status).toBe('measured')
  })

  it('runs what the available photos allow and explains the rest', async () => {
    const { api, bodies } = stub()
    const { profile } = (await post(appWith(api), { setup: 'short', views: { front: VIEWS.front } })).json<HairAnalysisResponse>()
    expect(Object.keys(bodies)).toEqual(['hair-length-detection'])
    expect(profile.type).toMatchObject({ status: 'missing-photos' })
    expect(profile.density).toMatchObject({ status: 'missing-photos', message: 'Needs the top photo.' })
    expect(profile.notes[0]).toMatch(/Short hair/)
  })

  it('refuses three angle photos of different sizes before paying for them', async () => {
    const { api, bodies } = stub()
    const views = { ...VIEWS, right45: jpegUrl(700, 800, 3) }
    const { profile } = (await post(appWith(api), { setup: 'loose', views })).json<HairAnalysisResponse>()
    expect(profile.type).toMatchObject({ status: 'failed', errorCode: 'error_mismatch_image_size' })
    expect(bodies['hair-type-detection']).toBeUndefined()
    expect(profile.length.status).toBe('measured')
  })

  it('joins an identical request that is still running', async () => {
    let release!: () => void
    const { api } = stub({}, new Promise<void>((r) => (release = r)))
    const app = appWith(api)
    const first = post(app, { setup: 'loose', views: VIEWS })
    const second = post(app, { setup: 'loose', views: VIEWS })
    await new Promise((r) => setTimeout(r, 30))
    release()
    const [a, b] = await Promise.all([first, second])
    expect(a.statusCode).toBe(200)
    expect(b.json()).toEqual(a.json())
    expect(api.mock.calls.filter((c) => String(c[0]).endsWith('/task/hair-type-detection'))).toHaveLength(1)
  })

  it('validates the request', async () => {
    const { api } = stub()
    const app = appWith(api)
    expect((await post(app, { setup: 'loose', views: {} })).statusCode).toBe(400)
    expect((await post(app, { setup: 'curly', views: VIEWS })).statusCode).toBe(400)
    expect((await post(app, { setup: 'loose', views: { front: 'data:text/plain;base64,aGk=' } })).statusCode).toBe(400)
    expect((await post(app, { setup: 'loose', views: { front: jpegUrl(200, 200) } })).statusCode).toBe(422)
    expect(api).not.toHaveBeenCalled()
  })
})
