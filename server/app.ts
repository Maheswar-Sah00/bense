import Fastify from 'fastify'
import type { ApiError } from '../shared/types'
import type { Env } from './env'
import { colourRoutes, type ColourRouteOptions } from './routes/colour'
import { hairRoutes } from './routes/hair'
import { healthRoutes } from './routes/health'

export type AppDeps = Omit<ColourRouteOptions, 'env'>

export function buildApp(env: Env, deps: AppDeps = {}) {
  // Default request logs hold method, URL and status only: never bodies (photos) or headers (keys).
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })

  app.register(healthRoutes, { prefix: '/api', env })
  app.register(colourRoutes, { prefix: '/api', env, ...deps })
  app.register(hairRoutes, { prefix: '/api', env, youcam: deps.youcam, poll: deps.poll, maxConcurrent: deps.maxConcurrent })

  app.setNotFoundHandler((request, reply) => {
    const body: ApiError = { error: `No route for ${request.method} ${request.url}`, code: 'not_found' }
    reply.code(404).send(body)
  })

  app.setErrorHandler<Error & { statusCode?: number }>((error, request, reply) => {
    const status = error.statusCode && error.statusCode < 500 ? error.statusCode : 500
    if (status === 500) request.log.error(error)
    const body: ApiError =
      status === 413 || status === 415
        ? { error: 'Send one JPEG or PNG photo under 10 MB.', code: 'invalid_image' }
        : { error: status === 500 ? 'Internal server error' : error.message, code: status === 500 ? 'internal' : undefined }
    reply.code(status).send(body)
  })

  return app
}
