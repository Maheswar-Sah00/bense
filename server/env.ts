import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

// Prefer app/.env; fall back to the project-level .env the Python test harness uses.
// loadEnvFile does not override variables already set in the environment.
for (const candidate of ['../.env', '../../.env']) {
  const path = fileURLToPath(new URL(candidate, import.meta.url))
  if (existsSync(path)) {
    process.loadEnvFile(path)
    break
  }
}

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  YOUCAM_API_KEY: z.string().trim().min(1).optional(),
  YOUCAM_API_BASE: z.url().default('https://yce-api-01.makeupar.com'),
  /** Murf text-to-speech for the spoken guide and result. Optional: without it the phone's own voice is used. */
  MURF_API_KEY: z.string().trim().min(1).optional(),
  MURF_VOICE_ID: z.string().trim().min(1).default('en-US-natalie'),
})

export type Env = z.infer<typeof EnvSchema>

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return EnvSchema.parse({ ...source, YOUCAM_API_KEY: source.YOUCAM_API_KEY || undefined, MURF_API_KEY: source.MURF_API_KEY || undefined, MURF_VOICE_ID: source.MURF_VOICE_ID || undefined })
}
