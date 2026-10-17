import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, resolve, sep } from 'node:path'
import type { FastifyReply } from 'fastify'

// Serves the built app (dist/) from the API server, so one process hosts everything in production.
// Any path that isn't a file gets index.html, so the app's own routes (/colour/result…) load directly.

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

export function staticSender(dir: string) {
  const root = resolve(dir)
  const index = join(root, 'index.html')

  return (url: string, reply: FastifyReply) => {
    let path = join(root, decodeURIComponent(url.split('?')[0]))
    if (!path.startsWith(root + sep) || !existsSync(path) || !statSync(path).isFile()) path = index
    const name = path.slice(root.length + 1).replaceAll('\\', '/')
    // Hashed bundles never change; the page and service worker must always be checked for updates.
    const cache = name.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'
    return reply
      .header('Content-Type', TYPES[extname(path)] ?? 'application/octet-stream')
      .header('Cache-Control', cache)
      .send(readFileSync(path))
  }
}
