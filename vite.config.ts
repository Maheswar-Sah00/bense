import { copyFileSync, createReadStream, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
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

export default defineConfig({
  plugins: [react(), mediapipeWasm()],
  // Explicit config stops Vite from picking up B:/Projects/postcss.config.mjs (a Tailwind setup from another project).
  css: { postcss: { plugins: [] } },
  server: {
    // IPv4 loopback so phone tunnels reach it: ngrok, and `adb reverse` over USB.
    host: '127.0.0.1',
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
