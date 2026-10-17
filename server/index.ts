import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { buildApp } from './app'
import { readEnv } from './env'

const env = readEnv()
// `npm start` (after `npm run build`): this one server also serves the app itself, for hosting.
const dist = fileURLToPath(new URL('../dist', import.meta.url))
const app = buildApp(env, { staticDir: process.argv.includes('--serve-app') && existsSync(dist) ? dist : undefined })

if (!env.YOUCAM_API_KEY) {
  app.log.warn('YOUCAM_API_KEY is not set; YouCam calls will fail until it is added to .env')
}

app.listen({ port: env.PORT, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})
