// LIVE test of the four YouCam hair measurements (type 2, frizz 2, length 2, density 1 units;
// failed tasks cost nothing).
//
//   npm run smoke:hair -- --front f.jpg [--left l.jpg] [--right r.jpg] [--top t.jpg] [--setup loose]
//                         [--record "Where the photos came from"]
//
// --record saves the results (never the photos) as the demo-mode hair profile in
// shared/demo/hair-profile.recorded.json, labelled with the given provenance.
//
// "left" = face turned to the user's right (left side to camera); "right" = the opposite.
import { readFileSync, writeFileSync } from 'node:fs'
import { HAIR_SETUPS, measurementPlan, plannedUnits, type AnalysisView, type HairSetup } from '../../shared/domain/hairProfile'
import { readEnv } from '../env'
import { readImageInfo } from '../images'
import { analyseHair, type ViewImage } from '../services/hairAnalysis'
import { YouCamClient } from '../youcam/client'

const args = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const setup = (flag('setup') ?? 'loose') as HairSetup
if (!HAIR_SETUPS.includes(setup)) throw new Error(`--setup must be one of ${HAIR_SETUPS.join(', ')}`)

const env = readEnv()
if (!env.YOUCAM_API_KEY) {
  console.error('BLOCKED: YOUCAM_API_KEY is not set.')
  process.exit(2)
}

const paths: Record<AnalysisView, string | undefined> = {
  front: flag('front'),
  left45: flag('left'),
  right45: flag('right'),
  top: flag('top'),
}
const views: Partial<Record<AnalysisView, ViewImage>> = {}
for (const [view, path] of Object.entries(paths) as [AnalysisView, string | undefined][]) {
  if (!path) continue
  const bytes = new Uint8Array(readFileSync(path))
  const info = readImageInfo(bytes)
  if (!info) throw new Error(`${path} is not a JPEG or PNG`)
  views[view] = { bytes, ...info }
}

const plan = measurementPlan(setup, views)
console.log(`LIVE hair analysis, setup "${setup}", up to ${plannedUnits(plan)} units if every task succeeds`)
const started = Date.now()
const profile = await analyseHair(new YouCamClient(env.YOUCAM_API_KEY, env.YOUCAM_API_BASE), views, setup)
console.log(`done in ${Date.now() - started} ms`)
for (const metric of ['type', 'frizz', 'length', 'density'] as const) {
  const m = profile[metric]
  console.log(`  ${metric.padEnd(7)} ${m.status.padEnd(14)} ${m.value ? JSON.stringify(m.value) : `${m.errorCode ?? ''} ${m.message ?? ''}`}`)
}
if (profile.notes.length) console.log('  notes:', profile.notes.join(' '))

const provenance = flag('record')
if (provenance) {
  const file = new URL('../../shared/demo/hair-profile.recorded.json', import.meta.url)
  const recorded = {
    provenance: `Recorded from a live YouCam run on ${profile.measuredAt.slice(0, 10)}. ${provenance} Not your hair.`,
    recordedAt: profile.measuredAt,
    setup,
    notes: {},
    profile,
  }
  writeFileSync(file, `${JSON.stringify(recorded, null, 2)}\n`)
  console.log(`recorded demo profile -> ${file.pathname}`)
}
