import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { MASK_COLOUR } from '../../shared/domain/hairLevelMeasure'
import type { ApiError, ColourTonesResponse, HairMaskResponse, RevealResponse } from '../../shared/types'
import type { Env } from '../env'
import { analyseColourTones, MAX_IMAGE_BYTES, ServiceError, validateImage } from '../services/colourTones'
import { HexColour, InFlight, renderReveal, validateRenderImage, type RevealOutcome } from '../services/hairColourRender'
import { YouCamClient } from '../youcam/client'
import type { PollOptions } from '../youcam/poll'

export interface ColourRouteOptions {
  env: Env
  /** Injected in tests; built from env otherwise. */
  youcam?: YouCamClient
  poll?: PollOptions
  /** Used to download render results; injected in tests. */
  downloadFetch?: typeof fetch
  /** Max analyses running at once, to stay inside YouCam's rate limit. */
  maxConcurrent?: number
}

export const colourRoutes: FastifyPluginAsync<ColourRouteOptions> = async (app, opts) => {
  const client =
    opts.youcam ?? (opts.env.YOUCAM_API_KEY ? new YouCamClient(opts.env.YOUCAM_API_KEY, opts.env.YOUCAM_API_BASE) : null)
  const maxConcurrent = opts.maxConcurrent ?? 4
  let inFlight = 0
  const reveals = new InFlight<RevealOutcome>()
  const RevealQuery = z.object({ promise: HexColour, result: HexColour })

  // The photo is the raw request body. It is never logged or written to disk.
  const asBuffer = (_req: unknown, body: Buffer, done: (err: null, body: Buffer) => void) => done(null, body)
  app.addContentTypeParser(['image/jpeg', 'image/png'], { parseAs: 'buffer', bodyLimit: MAX_IMAGE_BYTES }, asBuffer)

  app.post('/colour/tones', { bodyLimit: MAX_IMAGE_BYTES }, async (request, reply) => {
    const fail = (error: ServiceError) => {
      const body: ApiError = { error: error.message, code: error.code, retryable: error.retryable }
      return reply.code(error.httpStatus).send(body)
    }

    if (!client) return fail(new ServiceError('not_configured', 503, 'Hair colour reading isn’t set up on this server.'))
    if (!Buffer.isBuffer(request.body)) {
      return fail(new ServiceError('invalid_image', 415, 'Send the photo as image/jpeg or image/png.'))
    }
    if (inFlight >= maxConcurrent) {
      return fail(new ServiceError('rate_limited', 429, 'Lots of people are analysing right now. Try again shortly.', true))
    }

    inFlight++
    try {
      const type = validateImage(request.body, request.headers['content-type'])
      const outcome = await analyseColourTones(client, request.body, type, opts.poll)
      request.log.info({ elapsedMs: outcome.elapsedMs, family: outcome.reading.family }, 'colour tones done')
      const body: ColourTonesResponse = outcome
      return body
    } catch (error) {
      if (error instanceof ServiceError) {
        request.log.warn({ code: error.code }, 'colour tones failed')
        return fail(error)
      }
      throw error
    } finally {
      inFlight--
    }
  })

  // One Hair Color render in vivid green marks the hair; the browser measures its lightness.
  app.post('/colour/hair-mask', { bodyLimit: MAX_IMAGE_BYTES }, async (request, reply) => {
    const fail = (error: ServiceError) => {
      const body: ApiError = { error: error.message, code: error.code, retryable: error.retryable }
      return reply.code(error.httpStatus).send(body)
    }
    if (!client) return fail(new ServiceError('not_configured', 503, 'Hair level measurement isn’t set up on this server.'))
    if (!Buffer.isBuffer(request.body)) {
      return fail(new ServiceError('invalid_image', 415, 'Send the photo as image/jpeg or image/png.'))
    }
    try {
      const type = validateRenderImage(request.body, request.headers['content-type'])
      const colours = { promise: MASK_COLOUR, result: MASK_COLOUR }
      const photo = request.body
      const { promise, joined } = reveals.run(InFlight.key(photo, 'mask', MASK_COLOUR), async () => {
        if (inFlight >= maxConcurrent) {
          throw new ServiceError('rate_limited', 429, 'Lots of people are measuring right now. Try again shortly.', true)
        }
        inFlight++
        try {
          return await renderReveal(client, photo, type, colours, { poll: opts.poll, fetchImpl: opts.downloadFetch })
        } finally {
          inFlight--
        }
      })
      const outcome = await promise
      request.log.info({ elapsedMs: outcome.elapsedMs, joined }, 'hair mask done')
      const body: HairMaskResponse = { mask: outcome.promise, elapsedMs: outcome.elapsedMs }
      return body
    } catch (error) {
      if (error instanceof ServiceError) {
        request.log.warn({ code: error.code }, 'hair mask failed')
        return fail(error)
      }
      throw error
    }
  })

  app.post('/colour/reveal', { bodyLimit: MAX_IMAGE_BYTES }, async (request, reply) => {
    const fail = (error: ServiceError) => {
      const body: ApiError = { error: error.message, code: error.code, retryable: error.retryable }
      return reply.code(error.httpStatus).send(body)
    }

    if (!client) return fail(new ServiceError('not_configured', 503, 'Hair colour rendering isn’t set up on this server.'))
    const query = RevealQuery.safeParse(request.query)
    if (!query.success) {
      return fail(new ServiceError('invalid_image', 400, 'Both colours must be 6-digit hex values.'))
    }
    if (!Buffer.isBuffer(request.body)) {
      return fail(new ServiceError('invalid_image', 415, 'Send the photo as image/jpeg or image/png.'))
    }

    try {
      const type = validateRenderImage(request.body, request.headers['content-type'])
      const colours = query.data
      const key = InFlight.key(request.body, colours.promise, colours.result)
      const photo = request.body
      // A repeat of a request that is still running joins it instead of paying again.
      const { promise, joined } = reveals.run(key, async () => {
        if (inFlight >= maxConcurrent) {
          throw new ServiceError('rate_limited', 429, 'Lots of people are rendering right now. Try again shortly.', true)
        }
        inFlight++
        try {
          return await renderReveal(client, photo, type, colours, { poll: opts.poll, fetchImpl: opts.downloadFetch })
        } finally {
          inFlight--
        }
      })
      const outcome = await promise
      request.log.info({ elapsedMs: outcome.elapsedMs, joined }, 'reveal done')
      const body: RevealResponse = outcome
      return body
    } catch (error) {
      if (error instanceof ServiceError) {
        request.log.warn({ code: error.code }, 'reveal failed')
        return fail(error)
      }
      throw error
    }
  })
}
