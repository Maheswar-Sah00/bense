import { copyFileSync, createReadStream, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const apiPort = process.env.PORT ?? '8787'

const MEDIAPIPE_WASM_DIR = resolve('node_modules/@mediapipe/tasks-vision/wasm')
const MEDIAPIPE_WASM_FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
]

/** Serves MediaPipe's WASM at /mediapipe/wasm in dev and copies it into the build, so face tracking needs no CDN. */
function mediapipeWasm(): Plugin {
  return {
    name: 'mediapipe-wasm',
    configureServer(server) {
      server.middlewares.use('/mediapipe/wasm', (req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\//, '')
        if (!MEDIAPIPE_WASM_FILES.includes(name)) return next()
        res.setHeader('Content-Type', name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript')
        createReadStream(join(MEDIAPIPE_WASM_DIR, name)).pipe(res)
      })
    },
    writeBundle(options) {
      const out = join(options.dir ?? 'dist', 'mediapipe/wasm')
      mkdirSync(out, { recursive: true })
      for (const name of MEDIAPIPE_WASM_FILES) copyFileSync(join(MEDIAPIPE_WASM_DIR, name), join(out, name))
    },
  }
}

/** Writes .br and .gz copies of the build's text and WASM files; the server sends them to browsers that accept them. */
function precompress(): Plugin {
  let outDir = 'dist'
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]))
  return {
    name: 'precompress',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      for (const path of walk(outDir)) {
        if (!/\.(js|css|html|json|webmanifest|svg|wasm|task)$/.test(path)) continue
        const body = readFileSync(path)
        if (body.byteLength < 1024) continue
        // Highest brotli quality is slow on the 11.7 MB WASM, so big files use 9.
        const quality = body.byteLength > 1_000_000 ? 9 : 11
        const br = brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: quality } })
        const gz = gzipSync(body, { level: 9 })
        if (br.byteLength < body.byteLength * 0.9) writeFileSync(path + '.br', br)
        if (gz.byteLength < body.byteLength * 0.9) writeFileSync(path + '.gz', gz)
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), mediapipeWasm(), precompress()],
  // Explicit config stops Vite from picking up B:/Projects/postcss.config.mjs (a Tailwind setup from another project).
  css: { postcss: { plugins: [] } },
  server: {
    // Every address: IPv4 and IPv6 loopback (browsers may resolve localhost to ::1), the LAN, and
    // the 127.0.0.1 that phone tunnels (ngrok, `adb reverse`) connect to.
    host: true,
    // Phones open the app through an ngrok HTTPS address (the camera needs HTTPS).
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app'],
    proxy: {
      '/api': `http://localhost:${apiPort}`,
    },
  },
  test: {
    include: ['{src,server,shared}/**/*.test.{ts,tsx}'],
    // The first run after install transforms Fastify cold and can pass 5 s on Windows.
    testTimeout: 15_000,
  },
})
