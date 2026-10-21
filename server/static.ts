import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import type { FastifyReply, FastifyRequest } from 'fastify'

// Serves the built app (dist/) from the API server, so one process hosts everything in production.
// The build is small, so it's read into memory once, with an ETag per file and the .br/.gz copies
// the build makes (vite.config.ts), which matter most for the 11.7 MB face-tracking WASM.
// Any page path that isn't a file gets index.html, so the app's own routes (/colour/result…) load
// directly; a missing script, style or model file gets a 404 instead, so a stale tab or the
// service worker never stores the page under a script's name.

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.task': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8',
}

interface StaticFile {
  body: Buffer
  br?: Buffer
  gzip?: Buffer
  type: string
  etag: string
  cache: string
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

export function staticSender(dir: string) {
  const root = resolve(dir)
  const files = new Map<string, StaticFile>()
  for (const path of walk(root)) {
    if (/\.(br|gz)$/.test(path)) continue
    const name = '/' + relative(root, path).replaceAll('\\', '/')
    const body = readFileSync(path)
    const copy = (ext: string) => (existsSync(path + ext) ? readFileSync(path + ext) : undefined)
    files.set(name, {
      body,
      br: copy('.br'),
      gzip: copy('.gz'),
      type: TYPES[extname(path)] ?? 'application/octet-stream',
      etag: `"${createHash('sha1').update(body).digest('base64url')}"`,
      // Hashed bundles never change; everything else must be checked for updates.
      cache: name.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
  }
  const index = files.get('/index.html')

  return (request: FastifyRequest, reply: FastifyReply) => {
    let path = request.url.split('?')[0]
    try {
      path = decodeURIComponent(path)
    } catch {
      // Malformed escapes are just an unknown path.
    }
    let file = files.get(path)
    if (!file) {
      // Files with an extension (scripts, styles, models) are never answered with the page.
      if (/\.[a-z0-9]+$/i.test(path) || !index) {
        return reply.code(404).header('Cache-Control', 'no-store').type('text/plain; charset=utf-8').send('Not found')
      }
      file = index
    }
    reply.header('Content-Type', file.type).header('Cache-Control', file.cache).header('ETag', file.etag).header('Vary', 'Accept-Encoding')
    if (request.headers['if-none-match'] === file.etag) return reply.code(304).send()
    const accepts = String(request.headers['accept-encoding'] ?? '')
    if (file.br && /\bbr\b/.test(accepts)) return reply.header('Content-Encoding', 'br').send(file.br)
    if (file.gzip && /\bgzip\b/.test(accepts)) return reply.header('Content-Encoding', 'gzip').send(file.gzip)
    return reply.send(file.body)
  }
}
