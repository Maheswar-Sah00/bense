import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import type { ApiError } from '../../shared/types'
import type { Env } from '../env'

// Murf text-to-speech, streamed as MP3. The key stays here; the browser only sends text.
export const MURF_STREAM_URL = 'https://api.murf.ai/v1/speech/stream'
const CACHE_LIMIT = 200 // the angle guide repeats the same short lines, so most requests are cache hits

export interface VoiceRouteOptions {
  env: Env
  fetchImpl?: typeof fetch
}

const Body = z.object({ text: z.string().trim().min(1).max(1500) })

export const voiceRoutes: FastifyPluginAsync<VoiceRouteOptions> = async (app, { env, fetchImpl = fetch }) => {
  const cache = new Map<string, Buffer>()

  app.post('/voice', async (request, reply) => {
    const fail = (status: number, body: ApiError) => reply.code(status).send(body)
    if (!env.MURF_API_KEY) {
      return fail(503, { error: 'The voice isn’t set up on this server.', code: 'not_configured', retryable: false })
    }
    const parsed = Body.safeParse(request.body)
    if (!parsed.success) return fail(400, { error: 'Send text of up to 1,500 characters.', code: 'invalid_text' })
    const { text } = parsed.data

    let audio = cache.get(text)
    if (!audio) {
      try {
        const res = await fetchImpl(MURF_STREAM_URL, {
          method: 'POST',
          headers: { 'api-key': env.MURF_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceId: env.MURF_VOICE_ID, format: 'MP3', sampleRate: 24000 }),
          signal: AbortSignal.timeout(15_000),
        })
        if (!res.ok) throw new Error(`Murf answered ${res.status}`)
        audio = Buffer.from(await res.arrayBuffer())
      } catch (error) {
        request.log.warn(`[voice] ${error instanceof Error ? error.message : 'request failed'}`)
        return fail(502, { error: 'The voice service didn’t answer.', code: 'upstream_unavailable', retryable: true })
      }
      if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!)
      cache.set(text, audio)
    }
    return reply.header('Content-Type', 'audio/mpeg').header('Cache-Control', 'no-store').send(audio)
  })
}
