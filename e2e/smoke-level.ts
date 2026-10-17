// LIVE test of the hair level measurement: one YouCam Hair Color #00FF00 render per photo
// (1 unit each), decoded with a real browser canvas exactly like the app, then measured with
// the shared code the app uses.
//
//   npm run smoke:level -- <photo> [<photo> …] [--card x,y] [--reuse]
//
// --card is the white card's position as fractions of the photo (e.g. 0.8,0.75). Renders are saved
// in tests/out/level/ (git-ignored); --reuse measures from a saved render instead of paying again.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { HAIR_LEVEL_NAMES } from '../shared/domain/hairLevel'
import { MASK_COLOUR, measureHairLevel, type RgbaImage } from '../shared/domain/hairLevelMeasure'
import { readEnv } from '../server/env'
import { ServiceError } from '../server/services/colourTones'
import { renderReveal, validateRenderImage } from '../server/services/hairColourRender'
import { YouCamClient } from '../server/youcam/client'

const args = process.argv.slice(2)
const cardArg = args.indexOf('--card') >= 0 ? args[args.indexOf('--card') + 1] : undefined
const reuse = args.includes('--reuse')
const photos = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--card')
if (!photos.length) {
  console.error('Usage: npm run smoke:level -- <photo> [<photo> …] [--card x,y]')
  process.exit(2)
}
const env = readEnv()
if (!env.YOUCAM_API_KEY) {
  console.error('BLOCKED: YOUCAM_API_KEY is not set.')
  process.exit(2)
}
const card = cardArg ? (([x, y]) => ({ x, y }))(cardArg.split(',').map(Number)) : undefined
const out = resolve('../tests/out/level')
mkdirSync(out, { recursive: true })

const executablePath = [
  process.env.BROWSER_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].find((p): p is string => !!p && existsSync(p))
const browser = await chromium.launch({ executablePath })
const page = await browser.newPage()

/** Decodes both images at the app's working size (512 px long side) with a real canvas. */
async function decode(photoUrl: string, maskUrl: string): Promise<{ photo: RgbaImage; render: RgbaImage }> {
  const [w, h, a, b] = await page.evaluate(
    async ([p, m]) =>
      Promise.all([p, m].map(async (u) => createImageBitmap(await (await fetch(u)).blob()))).then(([pi, mi]) => {
        const scale = Math.min(1, 512 / Math.max(pi.width, pi.height))
        const width = Math.round(pi.width * scale)
        const height = Math.round(pi.height * scale)
        return [pi, mi].reduce<[number, number, ...number[][]]>(
          (acc, img) => {
            const c = document.createElement('canvas')
            c.width = width
            c.height = height
            const ctx = c.getContext('2d')!
            ctx.drawImage(img, 0, 0, width, height)
            return [...acc, Array.from(ctx.getImageData(0, 0, width, height).data)] as [number, number, ...number[][]]
          },
          [width, height],
        )
      }),
    [photoUrl, maskUrl] as const,
  )
  const img = (data: number[]): RgbaImage => ({ width: w, height: h, data: Uint8ClampedArray.from(data), channels: 4 })
  return { photo: img(a as number[]), render: img(b as number[]) }
}

const client = new YouCamClient(env.YOUCAM_API_KEY, env.YOUCAM_API_BASE)
for (const path of photos) {
  const bytes = new Uint8Array(readFileSync(path))
  try {
    const type = validateRenderImage(bytes, undefined)
    const maskFile = resolve(out, `${basename(path).replace(/\.\w+$/, '')}_mask.png`)
    let maskUrl: string
    if (reuse && existsSync(maskFile)) {
      maskUrl = `data:image/png;base64,${readFileSync(maskFile).toString('base64')}`
      console.log(`${basename(path)}: reusing the saved live render ${maskFile}`)
    } else {
      const outcome = await renderReveal(client, bytes, type, { promise: MASK_COLOUR, result: MASK_COLOUR })
      writeFileSync(maskFile, Buffer.from(outcome.promise.image.split(',')[1], 'base64'))
      maskUrl = outcome.promise.image
      console.log(`${basename(path)}: LIVE mask render in ${outcome.elapsedMs} ms -> ${maskFile}`)
    }
    const photoUrl = `data:${type};base64,${Buffer.from(bytes).toString('base64')}`
    const { photo, render } = await decode(photoUrl, maskUrl)
    const m = measureHairLevel(photo, render, { card })
    if (m.status !== 'measured') {
      console.log(`  ${m.status}: ${m.notes.join(' ')}`)
      continue
    }
    console.log(
      `  L* ${m.lab[0].toFixed(1)} a* ${m.lab[1].toFixed(1)} b* ${m.lab[2].toFixed(1)} · ${m.hairPixels} px (${(m.hairShare * 100).toFixed(0)}%) · IQR ${m.spreadL.toFixed(1)}`,
    )
    console.log(
      `  level ${m.level} (${HAIR_LEVEL_NAMES[m.level]}), exact ${m.levelExact.toFixed(2)}, range ${m.range.min}–${m.range.max}${m.calibrated ? ', card-calibrated' : ''}`,
    )
  } catch (error) {
    if (error instanceof ServiceError) console.log(`${basename(path)}: FAILED (handled) ${error.code}: ${error.message}`)
    else throw error
  }
}
await browser.close()
