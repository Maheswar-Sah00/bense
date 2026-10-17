import { buildApp } from './app'
import { readEnv } from './env'

const env = readEnv()
const app = buildApp(env)

if (!env.YOUCAM_API_KEY) {
  app.log.warn('YOUCAM_API_KEY is not set; YouCam calls will fail until it is added to .env')
}

app.listen({ port: env.PORT, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})
