import { createHash } from 'node:crypto'
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { HAIR_SETUPS, measurementPlan, plannedUnits, type AnalysisView } from '../../shared/domain/hairProfile'
import type { ApiError, HairAnalysisResponse } from '../../shared/types'
import type { Env } from '../env'
import { readImageInfo } from '../images'
import { MAX_IMAGE_BYTES, ServiceError } from '../services/colourTones'
import { analyseHair, DEFAULT_HAIR_POLL, type ViewImage } from '../services/hairAnalysis'
import { InFlight } from '../services/hairColourRender'
import { YouCamClient } from '../youcam/client'
import type { PollOptions } from '../youcam/poll'

export interface HairRouteOptions {
  env: Env
  youcam?: YouCamClient
  poll?: PollOptions
  maxConcurrent?: number
}

const DataUrl = z.string().regex(/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/, 'a JPEG or PNG data URL')
const Body = z.object({
  setup: z.enum(HAIR_SETUPS),
  views: z
    .object({ front: DataUrl, left45: DataUrl, right45: DataUrl, top: DataUrl })
    .partial()
    .refine((v) => Object.keys(v).length > 0, 'at least one photo'),
  /** Retry just these measurements; the others aren't run (or paid for). */
  only: z.array(z.enum(['type', 'frizz', 'length', 'density'])).min(1).optional(),
})

// Documented limits: type/frizz/length >= 320 px, density >= 100 px; all <= 4096 px, < 10 MB.
const MIN_SIDE: Record<AnalysisView, number> = { front: 320, left45: 320, right45: 320, top: 100 }

function decode(view: AnalysisView, dataUrl: string): ViewImage {
  const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64')
  if (bytes.byteLength === 0 || bytes.byteLength >= MAX_IMAGE_BYTES) {
    throw new ServiceError('invalid_image', 413, `The ${view} photo is empty or over 10 MB.`)
  }
  const info = readImageInfo(bytes)
  if (!info) throw new ServiceError('invalid_image', 415, `The ${view} photo isn’t a JPEG or PNG.`)
  if (Math.min(info.width, info.height) < MIN_SIDE[view] || Math.max(info.width, info.height) > 4096) {
    throw new ServiceError('invalid_image', 422, `The ${view} photo is too small or too large to analyse.`)
  }
  return { bytes, ...info }
}

export const hairRoutes: FastifyPluginAsync<HairRouteOptions> = async (app, opts) => {
  const client =
    opts.youcam ?? (opts.env.YOUCAM_API_KEY ? new YouCamClient(opts.env.YOUCAM_API_KEY, opts.env.YOUCAM_API_BASE) : null)
  const maxConcurrent = opts.maxConcurrent ?? 4
  let inFlight = 0
  // Requests still uploading or being analysed. Checked before the (up to ~56 MB) body is read,
  // so a burst of uploads can't fill the server's memory before the analysis limit applies.
  let active = 0
  const analyses = new InFlight<HairAnalysisResponse>()

  // Four base64 photos at up to 10 MB each.
  const bodyLimit = 4 * Math.ceil(MAX_IMAGE_BYTES * 1.4)
  const onRequest = (_request: FastifyRequest, reply: FastifyReply, done: () => void) => {
    if (active >= maxConcurrent * 2) {
      const body: ApiError = { error: 'Lots of people are analysing right now. Try again shortly.', code: 'rate_limited', retryable: true }
      reply.code(429).send(body)
      return
    }
    active++
    let released = false
    reply.raw.once('close', () => {
      if (!released) active--
      released = true
    })
    done()
  }
  app.post('/hair/analysis', { bodyLimit, onRequest }, async (request, reply) => {
    const fail = (error: ServiceError) => {
      const body: ApiError = { error: error.message, code: error.code, retryable: error.retryable }
      return reply.code(error.httpStatus).send(body)
    }
    if (!client) return fail(new ServiceError('not_configured', 503, 'Hair analysis isn’t set up on this server.'))
    const parsed = Body.safeParse(request.body)
    if (!parsed.success) return fail(new ServiceError('invalid_image', 400, 'Send the hair setup and at least one photo.'))

    try {
      const views: Partial<Record<AnalysisView, ViewImage>> = {}
      for (const [view, dataUrl] of Object.entries(parsed.data.views) as [AnalysisView, string][]) {
        views[view] = decode(view, dataUrl)
      }
      const { setup, only } = parsed.data
      const units = plannedUnits(measurementPlan(setup, views, only))
      const key = InFlight.key(
        new Uint8Array(),
        ...Object.values(views).map((v) => createHash('sha256').update(v.bytes).digest('hex')),
        setup,
        Object.keys(views).sort().join(','),
        only?.join(',') ?? 'all',
      )
      // Re-sending the same photos while they're being analysed joins the running request.
      const { promise, joined } = analyses.run(key, async () => {
        if (inFlight >= maxConcurrent) {
          throw new ServiceError('rate_limited', 429, 'Lots of people are analysing right now. Try again shortly.', true)
        }
        inFlight++
        const started = Date.now()
        try {
          const profile = await analyseHair(client, views, setup, opts.poll ?? DEFAULT_HAIR_POLL, only)
          return { profile, elapsedMs: Date.now() - started, unitsPlanned: units }
        } finally {
          inFlight--
        }
      })
      const body = await promise
      request.log.info(
        {
          elapsedMs: body.elapsedMs,
          joined,
          statuses: Object.fromEntries(['type', 'frizz', 'length', 'density'].map((m) => [m, body.profile[m as 'type'].status])),
        },
        'hair analysis done',
      )
      return body
    } catch (error) {
      if (error instanceof ServiceError) return fail(error)
      throw error
    }
  })
}
