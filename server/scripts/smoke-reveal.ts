// LIVE test: renders "box promise" and "probable result" with YouCam Hair Color (1 unit each).
//
//   npm run smoke:reveal -- <photo> --start <level> --shade <shade-id> [--dyed <previous-dye>]
//                           [--lift 1] [--intensity 80] [--out <dir>]
//   npm run smoke:reveal -- <photo> --recolour <HEX> [--intensity 100] [--out <dir>]
//
// Images are written to --out (default ../tests/out/reveal), which is git-ignored.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isHairLevel } from '../../shared/domain/hairLevel'
import { engineConfig, predict } from '../../shared/domain/predictionEngine'
import type { PreviousDye } from '../../shared/domain/hairColourReading'
import { revealSentence } from '../../shared/domain/revealSentence'
import { findShade } from '../../shared/domain/shadeCatalogue'
import { readEnv } from '../env'
import { ServiceError } from '../services/colourTones'
import { renderReveal, validateRenderImage } from '../services/hairColourRender'
import { YouCamClient } from '../youcam/client'

const args = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const photo = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
if (!photo) {
  console.error('Usage: see the header of server/scripts/smoke-reveal.ts')
  process.exit(2)
}

const env = readEnv()
if (!env.YOUCAM_API_KEY) {
  console.error('BLOCKED: YOUCAM_API_KEY is not set.')
  process.exit(2)
}

const out = resolve(flag('out') ?? '../tests/out/reveal')
mkdirSync(out, { recursive: true })
const bytes = new Uint8Array(readFileSync(photo))
const type = validateRenderImage(bytes, undefined)
const client = new YouCamClient(env.YOUCAM_API_KEY, env.YOUCAM_API_BASE)
const intensity = Number(flag('intensity') ?? 80)
const stamp = new Date().toISOString().replace(/[:.]/g, '-')

function save(name: string, dataUrl: string) {
  const [meta, data] = dataUrl.split(',')
  const file = join(out, `${stamp}_${name}.${meta.includes('png') ? 'png' : 'jpg'}`)
  writeFileSync(file, Buffer.from(data, 'base64'))
  return file
}

try {
  const recolour = flag('recolour')
  if (recolour) {
    const colour = `#${recolour.replace('#', '').toUpperCase()}`
    const { promise, elapsedMs } = await renderReveal(client, bytes, type, { promise: colour, result: colour }, { colorIntensity: intensity })
    console.log(`recoloured to ${colour} @${intensity} in ${elapsedMs} ms -> ${save(`recolour_${colour.slice(1)}_${intensity}`, promise.image)}`)
  } else {
    const start = Number(flag('start'))
    const shade = findShade(flag('shade'))
    if (!isHairLevel(start) || !shade) throw new Error('--start 1-10 and a valid --shade id are required')
    const dye = flag('dyed') as PreviousDye | undefined
    const prediction = predict(
      {
        start: { level: start, method: 'manual', family: null, previouslyDyed: dye ? 'yes' : 'no', previousDye: dye },
        target: { level: shade.level, tone: shade.tone, code: shade.code, name: shade.name, targetHex: shade.targetHex },
        safety: { previousReaction: false, blackHenna: false, browsOrLashes: false },
      },
      engineConfig({ liftLevels: Number(flag('lift') ?? 1) }),
    )
    const result = prediction.result!
    const colours = { promise: shade.targetHex, result: result.displayHex }
    console.log(revealSentence(prediction, shade))
    console.log(`colours: promise ${colours.promise}, result ${colours.result}, intensity ${intensity}`)
    const outcome = await renderReveal(client, bytes, type, colours, { colorIntensity: intensity })
    const tag = `L${start}_${shade.code}_i${intensity}`
    console.log(`rendered in ${outcome.elapsedMs} ms`)
    console.log(` promise -> ${save(`${tag}_promise`, outcome.promise.image)}`)
    console.log(` result  -> ${save(`${tag}_result`, outcome.result.image)}`)
  }
} catch (error) {
  if (error instanceof ServiceError) {
    console.log(`FAILED (handled): ${error.code} / HTTP ${error.httpStatus}: ${error.message}`)
    process.exit(1)
  }
  throw error
}
