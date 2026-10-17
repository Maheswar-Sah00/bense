// LIVE test: calls the real YouCam Facial Color Tones API with the key from .env.
// A successful run costs 20 units; a task that ends in error costs none (per the docs).
//
//   npm run smoke:tones -- <photo.jpg|png> [--record]
//
// --record saves the final raw task-status response (colours only; URLs and IDs removed)
// to server/youcam/__fixtures__/skin-tone-analysis.live.json for the parsing tests.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { readEnv } from '../env'
import { analyseColourTones, ServiceError, validateImage } from '../services/colourTones'
import { YouCamClient } from '../youcam/client'

const args = process.argv.slice(2)
const photo = args.find((a) => !a.startsWith('--'))
const record = args.includes('--record')
if (!photo) {
  console.error('Usage: npm run smoke:tones -- <photo.jpg|png> [--record]')
  process.exit(2)
}

const env = readEnv()
if (!env.YOUCAM_API_KEY) {
  console.error('BLOCKED: YOUCAM_API_KEY is not set in app/.env or Youcam/.env.')
  process.exit(2)
}

// Keep a copy of every task-status response so the real shape can be recorded.
const statuses: unknown[] = []
const recordingFetch: typeof fetch = async (input, init) => {
  const res = await fetch(input, init)
  const url = String(input)
  if (/\/task\/skin-tone-analysis\/./.test(url)) statuses.push(await res.clone().json())
  return res
}

const strip = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(strip)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, /url|_id$/i.test(k) ? '<removed>' : strip(v)]),
    )
  }
  return typeof value === 'string' && value.startsWith('http') ? '<removed>' : value
}

const bytes = new Uint8Array(readFileSync(photo))
const type = validateImage(bytes, undefined)
const client = new YouCamClient(env.YOUCAM_API_KEY, env.YOUCAM_API_BASE, recordingFetch)

console.log(`LIVE Facial Color Tones on ${photo} (${type}, ${bytes.byteLength} bytes)…`)
try {
  const outcome = await analyseColourTones(client, bytes, type)
  const last = statuses.at(-1)
  console.log(`success in ${outcome.elapsedMs} ms after ${statuses.length} status polls`)
  console.log('raw results:', JSON.stringify(strip((last as { data?: { results?: unknown } })?.data?.results)))
  console.log('normalised:', JSON.stringify(outcome.reading, null, 2))
  if (record) {
    const dir = new URL('../youcam/__fixtures__/', import.meta.url)
    mkdirSync(dir, { recursive: true })
    const fixture = { recordedAt: new Date().toISOString(), endpoint: 'skin-tone-analysis', status: strip(last) }
    writeFileSync(new URL('skin-tone-analysis.live.json', dir), JSON.stringify(fixture, null, 2) + '\n')
    console.log('recorded fixture: server/youcam/__fixtures__/skin-tone-analysis.live.json')
  }
} catch (error) {
  const last = statuses.at(-1)
  if (last) console.log('last raw status:', JSON.stringify(strip(last)))
  if (error instanceof ServiceError) {
    console.log(`FAILED (handled): ${error.code} / HTTP ${error.httpStatus}: ${error.message}`)
    process.exit(1)
  }
  throw error
}
