import { describe, expect, it } from 'vitest'
import { buildApp } from '../app'
import { readEnv } from '../env'

describe('GET /api/health', () => {
  it('reports ok and whether a key is configured, without leaking the key', async () => {
    const app = buildApp(readEnv({ YOUCAM_API_KEY: 'secret-key' }))
    const res = await app.inject({ method: 'GET', url: '/api/health' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'ok', youcamConfigured: true })
    expect(res.body).not.toContain('secret-key')
  })

  it('returns JSON 404 for unknown API routes', async () => {
    const app = buildApp(readEnv({}))
    const res = await app.inject({ method: 'GET', url: '/api/nope' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toHaveProperty('error')
  })
})
