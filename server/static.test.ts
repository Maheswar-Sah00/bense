import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildApp } from './app'
import { readEnv } from './env'

function site() {
  const dir = mkdtempSync(join(tmpdir(), 'bense-dist-'))
  mkdirSync(join(dir, 'assets'))
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Bense</title>')
  writeFileSync(join(dir, 'assets', 'app-123.js'), 'console.log(1)')
  writeFileSync(join(dir, 'assets', 'app-123.js.br'), 'BROTLI')
  return dir
}

describe('serving the built app', () => {
  const app = buildApp(readEnv({}), { staticDir: site() })

  it('serves files, and the page itself for app routes', async () => {
    const js = await app.inject({ method: 'GET', url: '/assets/app-123.js' })
    expect(js.statusCode).toBe(200)
    expect(js.headers['content-type']).toContain('text/javascript')
    expect(js.headers['cache-control']).toContain('immutable')

    const route = await app.inject({ method: 'GET', url: '/colour/result' })
    expect(route.statusCode).toBe(200)
    expect(route.body).toContain('<title>Bense</title>')
    expect(route.headers['cache-control']).toBe('no-cache')
  })

  it('never serves files outside the build, and API 404s stay JSON', async () => {
    const escape = await app.inject({ method: 'GET', url: '/..%2f..%2fpackage.json' })
    expect(escape.statusCode).toBe(404)
    expect(escape.body).not.toContain('"name"')
    const api = await app.inject({ method: 'GET', url: '/api/nope' })
    expect(api.statusCode).toBe(404)
    expect(api.json()).toMatchObject({ code: 'not_found' })
  })

  it('answers a missing script with 404, never with the page', async () => {
    const res = await app.inject({ method: 'GET', url: '/assets/old-999.js' })
    expect(res.statusCode).toBe(404)
    expect(res.body).not.toContain('<title>')
  })

  it('sends the compressed copy when the browser accepts it, and 304 when unchanged', async () => {
    const br = await app.inject({ method: 'GET', url: '/assets/app-123.js', headers: { 'accept-encoding': 'gzip, br' } })
    expect(br.headers['content-encoding']).toBe('br')
    expect(br.body).toBe('BROTLI')
    const again = await app.inject({ method: 'GET', url: '/assets/app-123.js', headers: { 'if-none-match': String(br.headers.etag) } })
    expect(again.statusCode).toBe(304)
    const head = await app.inject({ method: 'HEAD', url: '/' })
    expect(head.statusCode).toBe(200)
  })
})
