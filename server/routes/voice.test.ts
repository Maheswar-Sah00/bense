import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app'
import { readEnv } from '../env'
import { MURF_STREAM_URL } from './voice'

const mp3 = Buffer.from([0x49, 0x44, 0x33, 1, 2, 3])

describe('POST /api/voice', () => {
  it('without a Murf key, says the voice isn’t set up so the phone uses its own', async () => {
    const app = buildApp(readEnv({}))
    const res = await app.inject({ method: 'POST', url: '/api/voice', payload: { text: 'Hello' } })
    expect(res.statusCode).toBe(503)
    expect(res.json()).toMatchObject({ code: 'not_configured' })
  })

  it('streams Murf audio, keeps the key server-side, and serves repeats from memory', async () => {
    const fetchImpl = vi.fn(async () => new Response(mp3, { status: 200 }))
    const app = buildApp(readEnv({ MURF_API_KEY: 'murf-secret' }), { voiceFetch: fetchImpl as unknown as typeof fetch })

    const first = await app.inject({ method: 'POST', url: '/api/voice', payload: { text: 'Turn more to your right' } })
    expect(first.statusCode).toBe(200)
    expect(first.headers['content-type']).toBe('audio/mpeg')
    expect(first.rawPayload.equals(mp3)).toBe(true)
    expect(first.body).not.toContain('murf-secret')

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(MURF_STREAM_URL)
    expect((init.headers as Record<string, string>)['api-key']).toBe('murf-secret')
    expect(JSON.parse(String(init.body))).toMatchObject({ text: 'Turn more to your right', voiceId: 'en-US-natalie', format: 'MP3' })

    await app.inject({ method: 'POST', url: '/api/voice', payload: { text: 'Turn more to your right' } })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('rejects empty or very long text, and reports a Murf failure as retryable', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 401 }))
    const app = buildApp(readEnv({ MURF_API_KEY: 'k' }), { voiceFetch: fetchImpl as unknown as typeof fetch })
    expect((await app.inject({ method: 'POST', url: '/api/voice', payload: { text: ' ' } })).statusCode).toBe(400)
    expect((await app.inject({ method: 'POST', url: '/api/voice', payload: { text: 'x'.repeat(1501) } })).statusCode).toBe(400)
    const failed = await app.inject({ method: 'POST', url: '/api/voice', payload: { text: 'Hi' } })
    expect(failed.statusCode).toBe(502)
    expect(failed.json()).toMatchObject({ code: 'upstream_unavailable', retryable: true })
  })
})
