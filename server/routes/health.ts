import type { FastifyPluginAsync } from 'fastify'
import type { HealthResponse } from '../../shared/types'
import type { Env } from '../env'

export const healthRoutes: FastifyPluginAsync<{ env: Env }> = async (app, { env }) => {
  app.get('/health', async (): Promise<HealthResponse> => ({
    status: 'ok',
    youcamConfigured: Boolean(env.YOUCAM_API_KEY),
    time: new Date().toISOString(),
  }))
}
