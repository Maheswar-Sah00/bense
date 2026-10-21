// Browser tests for photo capture and the starting-colour screen. Uses an installed Chrome
// or Edge; nothing is downloaded and no YouCam calls are made (the API is mocked in the page).
// The camera is a deterministic canvas stream behind getUserMedia: Chromium's built-in fake
// device on Windows drops out intermittently, which made results depend on the machine.
// Run: npm run test:e2e   (set BROWSER_PATH to use a specific browser)
import { existsSync, readFileSync } from 'node:fs'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core'
import { createServer } from 'vite'
import { normaliseColourTones } from '../shared/domain/hairColourReading'
import { lightnessToLevel, linearToLab } from '../shared/domain/hairLevelMeasure'
import liveFixture from '../server/youcam/__fixtures__/skin-tone-analysis.live.json' with { type: 'json' }
import renderPairs from '../shared/demo/render-pairs.json' with { type: 'json' }

const BROWSERS = [
  process.env.BROWSER_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter((p): p is string => !!p)

// Records object URLs and camera streams so tests can check cleanup.
const INSTRUMENT = () => {
  const w = window as unknown as { __urls: { created: string[]; revoked: string[] }; __streams: MediaStream[] }
  w.__urls = { created: [], revoked: [] }
  w.__streams = []
  const create = URL.createObjectURL.bind(URL)
  const revoke = URL.revokeObjectURL.bind(URL)
  URL.createObjectURL = (obj: Blob | MediaSource) => {
    const url = create(obj)
    w.__urls.created.push(url)
    return url
  }
  URL.revokeObjectURL = (url: string) => {
    w.__urls.revoked.push(url)
    revoke(url)
  }
  // Fake camera. Mode is set per test: granted, denied (as the browser reports a blocked
  // permission) or missing (no device).
  if (!navigator.mediaDevices) return
  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = 960
  const ctx = canvas.getContext('2d')!
  let frame = 0
  setInterval(() => {
    ctx.fillStyle = `hsl(${(frame += 7) % 360} 55% 45%)`
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, 40)
  navigator.mediaDevices.getUserMedia = async () => {
    const mode = (window as unknown as { __cameraMode?: string }).__cameraMode ?? 'granted'
    if (mode === 'denied') throw new DOMException('Permission denied', 'NotAllowedError')
    if (mode === 'missing') throw new DOMException('Requested device not found', 'NotFoundError')
    const stream = canvas.captureStream(25)
    w.__streams.push(stream)
    return stream
  }
}

let passed = 0
const failures: string[] = []

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (error) {
    failures.push(name)
    console.log(`  ✗ ${name}\n    ${error instanceof Error ? (process.env.E2E_VERBOSE ? error.message : error.message.split('\n')[0]) : error}`)
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const phase = (page: Page) => page.locator('.capture').getAttribute('data-phase')

async function waitPhase(page: Page, expected: string) {
  await page.locator(`.capture[data-phase="${expected}"]`).waitFor({ timeout: 10_000 })
}

const liveUrls = (page: Page) =>
  page.evaluate(() => {
    const { created, revoked } = (window as unknown as { __urls: { created: string[]; revoked: string[] } }).__urls
    return created.filter((u) => !revoked.includes(u)).length
  })

/** Make a JPEG in the browser; optionally add an EXIF orientation tag. */
/** sRGB → linear → per-channel light gains → sRGB: how a coloured, dim light changes a pixel. */
const LIGHT: [number, number, number] = [0.75, 0.55, 0.35] // dim, orange indoor light
function underLight(rgb: [number, number, number]): [number, number, number] {
  return rgb.map((v, k) => {
    const c = v / 255
    const lin = (c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92) * LIGHT[k]
    return Math.round((lin > 0.0031308 ? 1.055 * lin ** (1 / 2.4) - 0.055 : 12.92 * lin) * 255)
  }) as [number, number, number]
}
const srgbL = (rgb: [number, number, number]) =>
  linearToLab(...(rgb.map((v) => (v / 255 > 0.04045 ? ((v / 255 + 0.055) / 1.055) ** 2.4 : v / 255 / 12.92)) as [number, number, number]))[0]

/**
 * A selfie stand-in with known colours: hair #66452E (level 4 by the model) and a white card,
 * both under a dim warm light, plus the matching #00FF00 "render" a YouCam mask would give.
 */
const HAIR_TRUE: [number, number, number] = [0x66, 0x45, 0x2e]
const CARD_TRUE: [number, number, number] = [245, 245, 245]
/** A selfie with a white card, under a dim warm light. `dyed` paints the hair that colour instead, in plain light. */
async function makeHairScene(page: Page, dyed?: [number, number, number]) {
  const hair = dyed ?? underLight(HAIR_TRUE)
  const card = underLight(CARD_TRUE)
  const [photo, mask] = await page.evaluate(
    ([h, c]) =>
      // No named functions in here: the test runner's helpers don't exist in the page.
      [`rgb(${h.join(',')})`, 'rgb(20, 230, 30)'].map((hairFill, i) => {
        const cv = document.createElement('canvas')
        cv.width = 900
        cv.height = 1200
        const ctx = cv.getContext('2d')!
        ctx.fillStyle = 'rgb(150, 110, 90)' // skin, also under the warm light
        ctx.fillRect(0, 0, 900, 1200)
        ctx.fillStyle = hairFill
        ctx.fillRect(0, 0, 900, 560)
        ctx.fillStyle = `rgb(${c.join(',')})`
        ctx.fillRect(600, 800, 220, 220) // the white card
        return i === 0 ? cv.toDataURL('image/jpeg', 0.95) : cv.toDataURL('image/png')
      }),
    [hair, card] as const,
  )
  return {
    photo: Buffer.from(photo.split(',')[1], 'base64'),
    mask,
    uncalibratedLevel: Math.round(lightnessToLevel(srgbL(hair))),
    trueLevel: Math.round(lightnessToLevel(srgbL(HAIR_TRUE))),
  }
}

async function makeJpeg(page: Page, width: number, height: number, orientation?: number): Promise<Buffer> {
  const dataUrl = await page.evaluate(
    ([w, h]) => {
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#7a5230'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w / 4, h / 4) // marks the top-left corner
      return c.toDataURL('image/jpeg', 0.9)
    },
    [width, height] as const,
  )
  const jpeg = Buffer.from(dataUrl.split(',')[1], 'base64')
  if (!orientation) return jpeg
  const tiff = Buffer.alloc(26)
  tiff.write('MM', 0, 'latin1')
  tiff.writeUInt16BE(42, 2)
  tiff.writeUInt32BE(8, 4)
  tiff.writeUInt16BE(1, 8)
  tiff.writeUInt16BE(0x0112, 10)
  tiff.writeUInt16BE(3, 12)
  tiff.writeUInt32BE(1, 14)
  tiff.writeUInt16BE(orientation, 18)
  const body = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff])
  const header = Buffer.from([0xff, 0xe1, (body.length + 2) >> 8, (body.length + 2) & 0xff])
  return Buffer.concat([jpeg.subarray(0, 2), header, body, jpeg.subarray(2)])
}

async function upload(page: Page, name: string, mimeType: string, buffer: Buffer) {
  await page.getByTestId('capture-file').setInputFiles({ name, mimeType, buffer })
}

async function main() {
  const executablePath = BROWSERS.find((p) => existsSync(p))
  if (!executablePath) throw new Error('No Chrome/Edge found. Set BROWSER_PATH.')

  const server = await createServer({ server: { port: 0 }, logLevel: 'error' })
  await server.listen()
  const base = server.resolvedUrls!.local[0].replace(/\/$/, '')

  const browser: Browser = await chromium.launch({ executablePath })

  async function open(path: string, opts: { camera?: 'granted' | 'denied' | 'missing'; init?: () => void } = {}) {
    const context: BrowserContext = await browser.newContext({ viewport: { width: 393, height: 852 } })
    await context.addInitScript((mode) => {
      ;(window as unknown as { __cameraMode: string }).__cameraMode = mode
    }, opts.camera ?? 'granted')
    await context.addInitScript(INSTRUMENT)
    if (opts.init) await context.addInitScript(opts.init)
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    // Mocked default: no Murf voice, so tests hear the browser's own voice and never call Murf.
    await page.route('**/api/voice', (route) =>
      route.fulfill({ status: 503, json: { error: 'The voice isn’t set up on this server.', code: 'not_configured' } }),
    )
    // Mocked default: the hair-mask render is "not set up", so no test can spend real units.
    // Tests that exercise the measurement replace this with their own mocked render.
    await page.route('**/api/colour/hair-mask', (route) =>
      route.fulfill({
        status: 503,
        json: { error: 'Hair level measurement isn’t set up on this server.', code: 'not_configured', retryable: false },
      }),
    )
    await page.goto(base + path)
    return { page, context, errors }
  }

  console.log('Hair-colour capture')

  await test('camera: permission, live preview, capture, review, retake, confirm', async () => {
    const { page, context, errors } = await open('/colour/photo')
    assert((await phase(page)) === 'intro', 'starts on the intro')
    await page.getByRole('button', { name: 'Use camera' }).click()
    await waitPhase(page, 'live')
    assert(await page.locator('video').evaluate((v: HTMLVideoElement) => v.videoWidth > 0), 'video is playing')
    // The hair-dye selfie gets the same live guide as the hair-profile photos: voice, then auto-capture.
    await page.locator('.pose-guide').waitFor()
    await page.getByRole('button', { name: 'Voice guide' }).waitFor()
    await page.getByRole('button', { name: 'Take photo' }).click()
    await waitPhase(page, 'review')
    const firstDraft = await page.locator('.capture img').getAttribute('src')
    await page.getByRole('button', { name: 'Retake' }).click()
    await waitPhase(page, 'live')
    const revoked = await page.evaluate(() => (window as unknown as { __urls: { revoked: string[] } }).__urls.revoked)
    assert(revoked.includes(firstDraft!), 'retake revokes the discarded photo URL')
    await page.getByRole('button', { name: 'Take photo' }).click()
    await waitPhase(page, 'review')
    await page.getByRole('button', { name: 'Use this photo' }).click()
    await waitPhase(page, 'confirmed')
    assert(await page.getByRole('button', { name: 'Continue' }).isVisible(), 'continue appears after confirm')
    const streams = await page.evaluate(() =>
      (window as unknown as { __streams: MediaStream[] }).__streams.flatMap((s) => s.getTracks().map((t) => t.readyState)),
    )
    assert(streams.length > 0 && streams.every((s) => s === 'ended'), `camera stopped after capture (${streams})`)
    assert((await liveUrls(page)) === 1, 'only the confirmed photo URL stays alive')
    assert(errors.length === 0, `no page errors: ${errors}`)
    await context.close()
  })

  await test('camera permission denied shows the denied state with upload fallback', async () => {
    const { page, context } = await open('/colour/photo', { camera: 'denied' })
    await page.getByRole('button', { name: 'Use camera' }).click()
    await waitPhase(page, 'camera-error')
    assert(await page.getByText('Camera access is off').isVisible(), 'denied title shown')
    assert(await page.getByRole('button', { name: 'Upload a photo' }).isVisible(), 'upload fallback offered')
    await context.close()
  })

  await test('no camera device shows the unavailable state', async () => {
    const { page, context } = await open('/colour/photo', { camera: 'missing' })
    await page.getByRole('button', { name: 'Use camera' }).click()
    await waitPhase(page, 'camera-error')
    assert(await page.getByText('No camera found').isVisible(), 'no-camera title shown')
    await context.close()
  })

  await test('browser without camera support offers upload only', async () => {
    const { page, context } = await open('/colour/photo', {
      init: () => {
        Object.defineProperty(navigator, 'mediaDevices', { value: undefined })
      },
    })
    await page.getByRole('button', { name: 'Use camera' }).click()
    await waitPhase(page, 'camera-error')
    assert(await page.getByText('Camera not available').isVisible(), 'unsupported title shown')
    assert((await page.getByRole('button', { name: 'Try again' }).count()) === 0, 'no pointless retry')
    await context.close()
  })

  await test('upload: large photo is downscaled, reviewed and confirmed', async () => {
    const { page, context } = await open('/colour/photo')
    await upload(page, 'big.jpg', 'image/jpeg', await makeJpeg(page, 2000, 1500))
    await waitPhase(page, 'review')
    const size = await page.locator('.capture img').evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])
    assert(size[0] === 1024 && size[1] === 768, `downscaled to 1024x768, got ${size}`)
    await page.getByRole('button', { name: 'Use this photo' }).click()
    await waitPhase(page, 'confirmed')
    await context.close()
  })

  await test('upload: EXIF orientation is applied', async () => {
    const { page, context } = await open('/colour/photo')
    await upload(page, 'rotated.jpg', 'image/jpeg', await makeJpeg(page, 800, 600, 6))
    await waitPhase(page, 'review')
    const size = await page.locator('.capture img').evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])
    assert(size[0] === 600 && size[1] === 800, `rotated to portrait 600x800, got ${size}`)
    await context.close()
  })

  await test('upload: invalid, corrupt, oversized and tiny files are rejected clearly', async () => {
    const { page, context } = await open('/colour/photo')
    const cases: [string, string, Buffer, string][] = [
      ['notes.txt', 'text/plain', Buffer.from('hello'), 'isn’t a supported photo'],
      ['broken.jpg', 'image/jpeg', Buffer.from('definitely not a jpeg'), 'may be damaged'],
      ['huge.jpg', 'image/jpeg', Buffer.alloc(21 * 1024 * 1024, 1), 'over 20 MB'],
      ['tiny.jpg', 'image/jpeg', await makeJpeg(page, 300, 200), 'too small'],
    ]
    for (const [name, type, buffer, message] of cases) {
      await upload(page, name, type, buffer)
      await page.locator('.capture-notice', { hasText: message }).waitFor({ timeout: 5000 })
      assert((await phase(page)) === 'intro', `${name} returns to intro`)
    }
    assert((await liveUrls(page)) === 0, 'rejected files leave no object URLs')
    await context.close()
  })

  await test('leaving the screen stops the camera', async () => {
    const { page, context } = await open('/colour/photo')
    await page.getByRole('button', { name: 'Use camera' }).click()
    await waitPhase(page, 'live')
    await page.getByRole('link', { name: 'Home' }).click()
    await page.getByRole('heading', { name: /Will this box/ }).waitFor()
    const states = await page.evaluate(() =>
      (window as unknown as { __streams: MediaStream[] }).__streams.flatMap((s) => s.getTracks().map((t) => t.readyState)),
    )
    assert(states.length > 0 && states.every((s) => s === 'ended'), `all tracks ended, got ${states}`)
    await context.close()
  })

  console.log('Hair-analysis capture')

  await test('four-view sequence uses the same capture, advances, and supports skipping', async () => {
    const { page, context } = await open('/analysis/photos')
    await page.getByRole('button', { name: 'Start with: Front' }).click()
    await page.waitForURL('**/analysis/photos/front')
    // Same component: camera works here too.
    await page.getByRole('button', { name: 'Use camera' }).click()
    await waitPhase(page, 'live')
    await page.getByRole('button', { name: 'Take photo' }).click()
    await waitPhase(page, 'review')
    await page.getByRole('button', { name: 'Use this photo' }).click()
    await page.waitForURL('**/analysis/photos/left-45')
    for (const next of ['right-45', 'top']) {
      await upload(page, 'side.jpg', 'image/jpeg', await makeJpeg(page, 900, 1200))
      await waitPhase(page, 'review')
      await page.getByRole('button', { name: 'Use this photo' }).click()
      await page.waitForURL(`**/analysis/photos/${next}`)
    }
    await page.getByRole('button', { name: 'Skip it' }).click()
    await page.waitForURL('**/analysis/photos')
    await page.getByText('Skipped', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'See hair profile' }).click()
    await page.getByText('won’t be measured: Needs the top photo.').waitFor()
    await context.close()
  })

  await test('loose hair is assumed; other setups are optional and change the guidance', async () => {
    const { page, context } = await open('/analysis/photos')
    await page.getByText('Hair down and forward').waitFor()
    assert(!(await page.getByText('Tied up and can’t let it down').isVisible()), 'setups folded away by default')
    await page.getByText('Hair tied up, in braids or under a wig?').click()
    await page.getByText('Tied up and can’t let it down').click()
    await page.getByText('We’ll only measure density').waitFor()
    await page.goto(base + '/analysis/photos/top')
    await page.getByText('We’ll only measure density').waitFor()
    assert(await page.getByRole('button', { name: 'Use camera' }).isEnabled(), 'capture still available')
    await context.close()
  })

  await test('angle guide: speaks and vibrates until the head is at 45°, then takes the photo itself', async () => {
    const { page, context } = await open('/analysis/photos/left-45', {
      // The canvas camera has no face, so the test supplies the head angle and records voice and vibration.
      init: () => {
        const w = window as unknown as {
          __pose: { turn: number; tilt: number } | null
          __spoken: string[]
          __buzzes: unknown[]
          __benseFakePoseTracker: () => { detect: () => unknown; close: () => void }
        }
        w.__pose = null
        w.__spoken = []
        w.__buzzes = []
        // Member assignments only: tsx wraps functions in object literals with a __name helper the page lacks.
        w.__benseFakePoseTracker = () => {
          const tracker = {} as { detect: () => unknown; close: () => void }
          tracker.detect = () => w.__pose
          tracker.close = () => {}
          return tracker
        }
        speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
          w.__spoken.push(u.text)
          setTimeout(() => u.onend?.call(u, new Event('end') as SpeechSynthesisEvent), 50)
        }
        ;(navigator as unknown as { vibrate: (p: unknown) => boolean }).vibrate = (p: unknown) => (w.__buzzes.push(p), true)
      },
    })
    const spoken = () => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken)
    const buzzes = () => page.evaluate(() => (window as unknown as { __buzzes: unknown[] }).__buzzes)
    const setPose = (pose: { turn: number; tilt: number } | null) =>
      page.evaluate((p) => ((window as unknown as { __pose: unknown }).__pose = p), pose)
    const guideText = page.locator('.pose-text')

    await page.getByRole('button', { name: 'Use camera' }).click()
    await waitPhase(page, 'live')
    assert((await spoken())[0]?.includes('45 degrees to your right'), `intro spoken: ${await spoken()}`)
    await guideText.filter({ hasText: 'Show your face in the oval' }).waitFor()

    await setPose({ turn: 12, tilt: 8 })
    await guideText.filter({ hasText: 'Turn more to your right' }).waitFor()
    await page.waitForFunction(() =>
      (window as unknown as { __spoken: string[] }).__spoken.some((t) => t.includes('isn’t at 45 degrees yet')),
    )
    assert((await buzzes()).length > 0, 'phone vibrates on a new instruction')
    assert((await phase(page)) === 'live', 'no photo while the angle is wrong')

    await setPose({ turn: 70, tilt: 8 })
    await guideText.filter({ hasText: 'Too far, turn back a little' }).waitFor()

    await setPose({ turn: 43, tilt: 8 })
    await guideText.filter({ hasText: 'Perfect. Hold still' }).waitFor()
    await waitPhase(page, 'review')
    assert((await spoken()).includes('Got it.'), 'confirms out loud')
    assert((await buzzes()).some((b) => b === 120), 'long buzz when the photo is taken')

    // Voice can be turned off and the choice is remembered.
    await setPose(null)
    await page.getByRole('button', { name: 'Retake' }).click()
    await waitPhase(page, 'live')
    const toggle = page.getByRole('button', { name: 'Voice guide' })
    await toggle.click()
    assert((await toggle.getAttribute('aria-pressed')) === 'false', 'voice off')
    assert((await page.evaluate(() => localStorage.getItem('bense.voiceGuide'))) === 'off', 'choice saved')
    await context.close()
  })


  console.log('Starting colour (API mocked in the browser with the recorded live response)')

  const liveReading = normaliseColourTones(liveFixture.status.data.results)

  async function selfieThenStartingColour(page: Page) {
    await upload(page, 'selfie.jpg', 'image/jpeg', await makeJpeg(page, 900, 1200))
    await waitPhase(page, 'review')
    await page.getByRole('button', { name: 'Use this photo' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForURL('**/colour/starting-colour')
  }

  await test('reading: suggestion, ±1 adjust, correction, dye history, confirm', async () => {
    const { page, context } = await open('/colour/photo')
    let calls = 0
    await page.route('**/api/colour/tones', async (route) => {
      calls++
      assert(route.request().headers()['content-type'] === 'image/jpeg', 'photo sent as image/jpeg')
      await route.fulfill({ json: { reading: liveReading, elapsedMs: 10193 } })
    })
    await selfieThenStartingColour(page)
    await page.getByRole('button', { name: 'Read my hair colour' }).click()
    await page.getByText('YouCam Facial Color Tones').waitFor()
    assert(await page.locator('.reading-name').getByText('Auburn').isVisible(), 'API family shown')
    await page.getByText('suggested 5').waitFor()
    await page.getByText('Suggested from YouCam reading').waitFor()
    await page.getByRole('button', { name: 'One level lighter' }).click()
    await page.getByText('Level 6', { exact: true }).waitFor()
    await page.getByText('Adjusted by you').waitFor()
    await page.getByRole('button', { name: 'Colour looks wrong? Correct it' }).click()
    await page.getByRole('button', { name: 'Blonde' }).click()
    await page.getByText('Level 8', { exact: true }).waitFor()
    await page.getByText('From the colour you corrected').waitFor()
    assert(await page.getByRole('button', { name: 'Confirm level 8' }).isDisabled(), 'dye history required')
    await page.getByText('No', { exact: true }).click()
    await page.getByRole('button', { name: 'Confirm level 8' }).click()
    await page.waitForURL('**/colour/shade')
    // Coming back (in-app; photos don't survive a reload by design) reuses the stored
    // reading for this photo instead of paying for it again.
    await page.getByRole('button', { name: 'Back' }).click()
    await page.waitForURL('**/colour/starting-colour')
    await page.getByText('You corrected this to').waitFor()
    assert(calls === 1, `one API call for one photo, got ${calls}`)
    await context.close()
  })

  await test('measured level: hair mask + lightness, white-card calibration, carried into the prediction', async () => {
    const { page, context, errors } = await open('/colour/photo')
    const scene = await makeHairScene(page)
    let maskCalls = 0
    await page.route('**/api/colour/tones', (route) => route.fulfill({ json: { reading: liveReading, elapsedMs: 10193 } }))
    await page.route('**/api/colour/hair-mask', async (route) => {
      maskCalls++
      await new Promise((r) => setTimeout(r, 400))
      await route.fulfill({ json: { mask: { image: scene.mask, colour: '#00FF00', colorIntensity: 100 }, elapsedMs: 9100 } })
    })
    await upload(page, 'selfie.jpg', 'image/jpeg', scene.photo)
    await waitPhase(page, 'review')
    await page.getByRole('button', { name: 'Use this photo' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Read my hair colour' }).click()
    const progress = page.getByRole('status', { name: 'Reading your starting colour' })
    await progress.getByText('Finding your hair').waitFor()
    await progress.getByText('Measuring its lightness').waitFor()

    const card = page.getByRole('region', { name: 'Hair level measurement' })
    await card.getByText(`Level ${scene.uncalibratedLevel} ·`).waitFor()
    await card.getByText('Not calibrated').waitFor()
    await page.getByText(`Measured: level ${scene.uncalibratedLevel}`).waitFor()
    await page.getByText('Measured from the hair in your photo').waitFor()
    // The colour family is still shown, as a cross-check.
    assert(await page.locator('.reading-name').getByText('Auburn').isVisible(), 'Facial Color Tones family shown')

    // Calibrate: a tap on the hair is refused, a tap on the card corrects the dim warm light.
    await card.getByRole('button', { name: 'Calibrate with my white card' }).click()
    const target = card.getByRole('button', { name: 'Tap your white card in the photo' })
    await target.evaluate((el) => el.scrollIntoView({ block: 'start' }))
    await target.click({ position: await target.boundingBox().then((b) => ({ x: b!.width * 0.5, y: b!.height * 0.2 })) })
    await card.getByText('That’s hair, not the card.').waitFor()
    await target.click({ position: await target.boundingBox().then((b) => ({ x: b!.width * (710 / 900), y: b!.height * (910 / 1200) })) })
    await card.getByText('Calibrated with your white card').waitFor()
    await card.getByText(`Level ${scene.trueLevel} ·`).waitFor()
    assert(scene.uncalibratedLevel < scene.trueLevel, 'the dim light really did read darker before calibration')
    await page.getByText(`Measured: level ${scene.trueLevel}`).waitFor()

    await page.getByText('No', { exact: true }).click()
    await page.getByRole('button', { name: `Confirm level ${scene.trueLevel}` }).click()
    await page.waitForURL('**/colour/shade')
    await page.locator('label.option', { hasText: '9.1 Very light ash blonde' }).click()
    await page.getByRole('button', { name: 'Use 9.1 Very light ash blonde' }).click()
    await page.getByText('Why this result').click()
    const based = page.getByLabel('Prediction input')
    await based.getByText('Measured from the hair in your photo').waitFor()
    await based.getByText('card-calibrated').waitFor()
    await page.getByText('Measured level.').waitFor()
    assert(maskCalls === 1, `one mask render, got ${maskCalls}`)
    assert(errors.length === 0, `no page errors: ${errors}`)
    await context.close()
  })

  await test('measured level: purple hair reads as purple dye (not brown), and is marked dyed', async () => {
    const { page, context, errors } = await open('/colour/photo')
    const scene = await makeHairScene(page, [122, 42, 143])
    // Facial Color Tones only knows natural shades: on the live purple photo it said "Blonde".
    const blonde = {
      ...liveReading,
      apiHairColorName: 'Blonde',
      apiHairColorHex: '#faf0be',
      normalizedHex: '#FAF0BE',
      family: 'Blonde' as const,
      levelEstimate: { min: 7 as const, max: 10 as const, suggested: 8 as const },
    }
    await page.route('**/api/colour/tones', (route) => route.fulfill({ json: { reading: blonde, elapsedMs: 1 } }))
    await page.route('**/api/colour/hair-mask', (route) =>
      route.fulfill({ json: { mask: { image: scene.mask, colour: '#00FF00', colorIntensity: 100 }, elapsedMs: 1 } }),
    )
    await upload(page, 'selfie.jpg', 'image/jpeg', scene.photo)
    await waitPhase(page, 'review')
    await page.getByRole('button', { name: 'Use this photo' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Read my hair colour' }).click()

    const card = page.getByRole('region', { name: 'Hair level measurement' })
    await card.getByText('Purple isn’t a natural hair colour, so this is dye.', { exact: false }).waitFor()
    const name = (await card.locator('.reading-name').innerText()).trim()
    assert(name === `Level ${scene.uncalibratedLevel} · Purple`, `named by its colour, got "${name}"`)
    await page.getByText('YouCam’s colour families are natural shades only, so it can’t name purple hair.', { exact: false }).waitFor()
    await page.getByText('That’s how deep your purple is.', { exact: false }).waitFor()
    // Purple can't be natural, so the dye question is answered (and can still be changed).
    assert(await page.getByRole('radio', { name: 'Yes' }).isChecked(), 'dyed: yes')
    assert(await page.getByRole('radio', { name: 'Another colour' }).isChecked(), 'earlier dye: another colour')
    await page.getByText('Your photo shows purple dye, so we’ve marked your hair as dyed.').waitFor()

    await page.getByRole('button', { name: `Confirm level ${scene.uncalibratedLevel}` }).click()
    await page.waitForURL('**/colour/shade')
    await page.locator('label.option', { hasText: '9.1 Very light ash blonde' }).click()
    await page.getByRole('button', { name: 'Use 9.1 Very light ash blonde' }).click()
    await page.getByText('Your photo shows purple hair.', { exact: false }).first().waitFor()
    assert(errors.length === 0, `no page errors: ${errors}`)
    await context.close()
  })

  await test('measured level: the mask failing still leaves the colour reading, with its own retry', async () => {
    const { page, context } = await open('/colour/photo')
    let maskCalls = 0
    await page.route('**/api/colour/tones', (route) => route.fulfill({ json: { reading: liveReading, elapsedMs: 1 } }))
    await page.route('**/api/colour/hair-mask', (route) => {
      maskCalls++
      return route.fulfill({ status: 504, json: { error: 'The render took too long.', code: 'timeout', retryable: true } })
    })
    await selfieThenStartingColour(page)
    await page.getByRole('button', { name: 'Read my hair colour' }).click()
    await page.getByText('We couldn’t measure your hair’s lightness: The render took too long.').waitFor()
    await page.getByText('suggested 5').waitFor()
    await page.getByRole('button', { name: 'Try again' }).click()
    await page.getByText('We couldn’t measure your hair’s lightness').waitFor()
    assert(maskCalls === 2, `mask retried alone, got ${maskCalls}`)
    await context.close()
  })

  await test('reading: non-retryable failure falls back to a clearly labelled manual choice', async () => {
    const { page, context } = await open('/colour/photo')
    await page.route('**/api/colour/tones', (route) =>
      route.fulfill({
        status: 503,
        json: { error: 'The analysis service has run out of credits for now.', code: 'out_of_units', retryable: false },
      }),
    )
    await selfieThenStartingColour(page)
    await page.getByRole('button', { name: 'Read my hair colour' }).click()
    await page.getByText('run out of credits').waitFor()
    assert((await page.getByRole('button', { name: 'Try again' }).count()) === 0, 'no retry for a non-retryable error')
    await page.getByRole('button', { name: 'Choose level myself' }).click()
    await page.getByText('Not a reading').waitFor()
    await page.locator('label.option', { hasText: 'Medium brown' }).click()
    await page.getByText('Yes', { exact: true }).click()
    assert(await page.getByRole('button', { name: 'Confirm level 4' }).isDisabled(), 'asks what the dye was')
    await page.getByText('Another colour').click()
    await page.getByText('Chosen manually').waitFor()
    await page.getByRole('button', { name: 'Confirm level 4' }).click()
    await page.waitForURL('**/colour/shade')
    await page.locator('label.option', { hasText: '6.1' }).click()
    await page.getByRole('button', { name: 'Use 6.1 Ash dark blonde' }).click()
    await page.getByText('Chosen manually').waitFor()
    assert((await page.getByText('Suggested from YouCam reading').count()) === 0, 'manual level not attributed to YouCam')
    await context.close()
  })

  await test('reading: retryable failure and photo guidance', async () => {
    const { page, context } = await open('/colour/photo')
    let call = 0
    await page.route('**/api/colour/tones', (route) => {
      call++
      return call === 1
        ? route.fulfill({ status: 504, json: { error: 'The analysis took too long.', code: 'timeout', retryable: true } })
        : route.fulfill({
            status: 422,
            json: {
              error: 'Your face is too small in the photo. Move closer so your face fills most of the frame width.',
              code: 'photo_rejected',
              retryable: false,
            },
          })
    })
    await selfieThenStartingColour(page)
    await page.getByRole('button', { name: 'Read my hair colour' }).click()
    await page.getByText('took too long').waitFor()
    await page.getByRole('button', { name: 'Try again' }).click()
    await page.getByText('Move closer').waitFor()
    await context.close()
  })


  console.log('Shade selector')

  async function confirmManualStart(page: Page, levelName: string, dyed: 'Yes' | 'No', previous = 'Another colour') {
    await selfieThenStartingColour(page)
    await page.getByRole('button', { name: 'Choose level myself' }).click()
    await page.locator('label.option', { hasText: levelName }).click()
    await page.getByText(dyed, { exact: true }).click()
    if (dyed === 'Yes') await page.getByText(previous, { exact: true }).click()
    await page.getByRole('button', { name: /^Confirm level/ }).click()
    await page.waitForURL('**/colour/shade')
  }

  await test('selection persists across navigation and reaches the prediction input', async () => {
    const { page, context } = await open('/colour/photo')
    await confirmManualStart(page, 'Light brown', 'No')
    assert(await page.getByRole('button', { name: 'Choose a shade' }).isDisabled(), 'nothing selected yet')
    await page.getByRole('button', { name: 'Ash & golden' }).click()
    await page.locator('label.option', { hasText: '7.1 Ash medium blonde' }).click()
    await page.getByText('2 levels lighter than your hair').waitFor()
    await page.getByText('Ash tones can turn green').waitFor()

    // Go back and change the starting info screen without losing anything.
    await page.getByRole('link', { name: /Your hair: level 5/ }).click()
    await page.waitForURL('**/colour/starting-colour')
    assert(await page.locator('input[name=level][value="5"]').isChecked(), 'starting level kept')
    assert(await page.locator('input[name=dyed][value=no]').isChecked(), 'dye history kept')
    await page.getByRole('button', { name: 'Confirm level 5' }).click()
    await page.waitForURL('**/colour/shade')
    assert(await page.locator('input[name=shade][value="dev-7-1-ash-medium-blonde"]').isChecked(), 'shade kept')

    // Home and back via the Colour tab resumes at the result with the same input.
    await page.getByRole('link', { name: 'Home' }).click()
    await page.getByText('7.1 · Ash medium blonde').waitFor()
    await page.getByRole('link', { name: 'Colour', exact: true }).click()
    await page.waitForURL('**/colour/result')
    await page.getByText('Why this result').click()
    const input = page.getByLabel('Prediction input')
    await input.getByText('Level 5 · Light brown').waitFor()
    await input.getByText('7.1 · Ash medium blonde').waitFor()
    await input.getByText('Level 7 · Ash').waitFor()
    await input.getByText('Chosen manually').waitFor()

    // Changing the shade from the result keeps the starting colour.
    await page.getByRole('link', { name: 'Change shade' }).click()
    await page.locator('label.option', { hasText: '3 Dark brown' }).click()
    await page.getByText('2 levels darker than your hair').waitFor()
    await page.getByRole('button', { name: 'Use 3 Dark brown' }).click()
    if (!(await input.isVisible())) await page.getByText('Why this result').click()
    await input.getByText('3 · Dark brown').waitFor()
    await input.getByText('Level 5 · Light brown').waitFor()
    await context.close()
  })

  await test('missing selection: the result asks for the missing step', async () => {
    const { page, context } = await open('/colour/photo')
    await confirmManualStart(page, 'Dark blonde', 'Yes')
    await page.getByRole('link', { name: 'Home' }).click()
    await page.getByRole('link', { name: /Continue your check/ }).click()
    await page.waitForURL('**/colour/shade')
    await page.getByRole('button', { name: 'Back' }).click()
    await page.getByRole('link', { name: 'Colour', exact: true }).click()
    await page.waitForURL('**/colour/shade') // resume stops at the missing step
    await context.close()
  })

  await test('unavailable shade id from an older session is reported, not used', async () => {
    const { page, context } = await open('/', {
      init: () => {
        sessionStorage.setItem(
          'bense.flow',
          JSON.stringify({ starting: { confirmedLevel: 6, method: 'manual', previouslyDyed: 'no' }, shadeId: '7.1' }),
        )
      },
    })
    await page.getByText('No longer available').waitFor()
    await page.goto(base + '/colour/shade')
    await page.getByText('isn’t in the catalogue any more').waitFor()
    assert((await page.locator('input[name=shade]:checked').count()) === 0, 'nothing pre-selected')
    await page.locator('label.option', { hasText: '8 Light blonde' }).click()
    assert((await page.getByText('isn’t in the catalogue any more').count()) === 0, 'notice clears after choosing')
    await context.close()
  })


  console.log('Prediction engine in the app')

  async function toResult(page: Page, shadeLabel: string, useLabel: string) {
    await page.locator('label.option', { hasText: shadeLabel }).click()
    await page.getByRole('button', { name: useLabel }).click()
    await page.waitForURL('**/colour/result')
  }

  await test('level 4 natural → 9.1 ash: default 1-level lift, then 2 levels via Settings', async () => {
    const { page, context } = await open('/colour/photo')
    await confirmManualStart(page, 'Medium brown', 'No')
    await toResult(page, '9.1 Very light ash blonde', 'Use 9.1 Very light ash blonde')
    const predicted = page.getByLabel('Reveal summary').locator('.stat', { hasText: 'Predicted level' })
    await page.getByText('Predicted level 5 red-orange brown versus promised level 9 ash: 4 levels short.').waitFor()
    assert((await predicted.locator('.stat-value').innerText()).trim() === '5', 'predicted 5')
    await predicted.getByText('Estimate').waitFor()
    await page.getByText('This box won’t look like the picture').waitFor()

    // The same result in plain words, read out on request.
    const plain = page.getByLabel('In plain words')
    await plain.getByText('you’ll likely get to about level 5').waitFor()
    await plain.getByText('That is 4 levels darker than the picture on the box.').waitFor()
    await page.evaluate(() => {
      const w = window as unknown as { __said: string[] }
      w.__said = []
      speechSynthesis.speak = (u: SpeechSynthesisUtterance) => void w.__said.push(u.text)
    })
    await plain.getByRole('button', { name: 'Listen' }).click()
    await page.waitForFunction(() =>
      (window as unknown as { __said: string[] }).__said.some((t) => t.startsWith('Your hair is about level 4 out of 10')),
    )

    await page.getByText('Why this result').click()
    await page.locator('.fold').getByRole('link', { name: 'Settings' }).click()
    await page.getByText('2 levels', { exact: true }).click()
    await page.getByRole('link', { name: 'Colour', exact: true }).click()
    await page.waitForURL('**/colour/result')
    await page.getByText('Predicted level 6 orange blonde versus promised level 9 ash: 3 levels short.').waitFor()
    assert((await predicted.locator('.stat-value').innerText()).trim() === '6', 'predicted 6')
    await page.getByText('Why this result').click()
    await page.getByText('Assumed lift: 2 levels').waitFor()
    await context.close()
  })

  await test('safety answers: a previous reaction blocks home use and drops "go ahead" steps', async () => {
    const { page, context } = await open('/colour/photo')
    await confirmManualStart(page, 'Dark blonde', 'No')
    await toResult(page, '7 Medium blonde', 'Use 7 Medium blonde')
    await page.getByText('Answer the safety questions').waitFor()
    await page.getByText('Do the skin allergy test in the box instructions').waitFor()
    const safety = page.getByLabel('Safety check')
    await safety.getByRole('group', { name: /reacted to hair dye/ }).getByText('Yes').click()
    await safety.getByRole('group', { name: /black henna/ }).getByText('No').click()
    await safety.getByRole('group', { name: /eyebrows or eyelashes/ }).getByText('No').click()
    await page.getByText('Don’t use this box at home').waitFor()
    assert((await page.getByText('Do the skin allergy test in the box instructions').count()) === 0, 'no skin-test go-ahead')
    assert((await page.getByText('Answer the safety questions').count()) === 0, 'answered')
    await context.close()
  })

  await test('black-dyed hair targeting lighter brown: dye can’t lift dye', async () => {
    const { page, context } = await open('/colour/photo')
    await confirmManualStart(page, 'Darkest brown', 'Yes', 'Black or very dark')
    await toResult(page, '5 Light brown', 'Use 5 Light brown')
    await page.getByText('Why this result').click()
    await page.getByText('Dye can’t lift dye.').waitFor()
    const stat = page.getByLabel('Reveal summary').locator('.stat', { hasText: 'Predicted level' })
    assert((await stat.locator('.stat-value').innerText()).trim() === '2', 'predicted 2')
    await page.getByText('Black or very dark dye is the hardest to lighten').waitFor()
    await page.getByText('This box won’t look like the picture').waitFor()
    await context.close()
  })


  console.log('Promise vs reality reveal (API mocked in the browser with the recorded live renders)')

  // The recorded live renders from the demo data layer, served to the page as mocked API output.
  const demo = renderPairs['dark-base-9-1']
  const asDataUrl = (path: string) =>
    `data:image/jpeg;base64,${readFileSync(new URL(`../public${path}`, import.meta.url)).toString('base64')}`

  await test('reveal: both renders, labels and a headline that agrees with the numbers', async () => {
    const { page, context } = await open('/colour/photo')
    let calls = 0
    let query = ''
    await page.route('**/api/colour/reveal**', async (route) => {
      calls++
      query = new URL(route.request().url()).search
      await route.fulfill({
        json: {
          promise: { image: asDataUrl(demo.promise.image), colour: demo.promise.colour, colorIntensity: 100 },
          result: { image: asDataUrl(demo.result.image), colour: demo.result.colour, colorIntensity: 100 },
          elapsedMs: 15271,
        },
      })
    })
    await confirmManualStart(page, 'Light brown', 'No')
    await toResult(page, '9.1 Very light ash blonde', 'Use 9.1 Very light ash blonde')
    const reveal = page.getByLabel('Promise versus reality')
    const headline = 'Predicted level 6 orange blonde versus promised level 9 ash: 3 levels short.'
    await reveal.getByText(headline).waitFor()
    await page.getByRole('button', { name: 'Show it on my photo' }).click()
    await reveal.getByText('What the box promises').waitFor()
    await reveal.getByText('What you’ll probably get').waitFor()
    assert(query === `?promise=${demo.promise.colour.slice(1)}&result=${demo.result.colour.slice(1)}`, `colours sent: ${query}`)
    const summary = page.getByLabel('Reveal summary')
    await summary.getByText('9.1', { exact: true }).waitFor()
    for (const [label, value] of [['Your level', '5'], ['Predicted level', '6'], ['Difference', '−3']]) {
      const stat = summary.locator('.stat', { hasText: label })
      assert((await stat.locator('.stat-value').innerText()).trim() === value, `${label} = ${value}`)
    }
    const loaded = await reveal.locator('img').evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).naturalWidth > 0))
    assert(loaded.length === 2 && loaded.every(Boolean), 'both images decoded')
    // Navigating away and back reuses the renders instead of paying again.
    await page.getByRole('link', { name: 'Change shade' }).click()
    await page.getByRole('button', { name: 'Use 9.1 Very light ash blonde' }).click()
    await reveal.getByText('What the box promises').waitFor()
    assert(calls === 1, `one render request, got ${calls}`)
    await context.close()
  })

  await test('reveal: mismatched colours are refused, failures offer retry and a labelled demo', async () => {
    const { page, context } = await open('/colour/photo')
    let call = 0
    await page.route('**/api/colour/reveal**', (route) => {
      call++
      if (call === 1) {
        return route.fulfill({
          json: {
            promise: { image: asDataUrl(demo.promise.image), colour: '#000000', colorIntensity: 100 },
            result: { image: asDataUrl(demo.result.image), colour: '#000000', colorIntensity: 100 },
            elapsedMs: 1,
          },
        })
      }
      return route.fulfill({ status: 502, json: { error: 'The hair colour render failed. Try again.', code: 'analysis_failed', retryable: true } })
    })
    await confirmManualStart(page, 'Light brown', 'No')
    await toResult(page, '9.1 Very light ash blonde', 'Use 9.1 Very light ash blonde')
    await page.getByRole('button', { name: 'Show it on my photo' }).click()
    await page.getByText('didn’t match this prediction').waitFor()
    assert((await page.locator('.reveal-figure').count()) === 0, 'mismatched renders not shown')
    await page.getByRole('button', { name: 'Try again' }).click()
    await page.getByText('The hair colour render failed').waitFor()
    await page.getByRole('button', { name: 'View demo example' }).click()
    await page.getByText('Demo example, not your photo.').waitFor()
    await page.locator('.reveal-figure').first().waitFor()
    await context.close()
  })


  console.log('Hair analysis (API mocked in the browser)')

  const FULL_PROFILE = {
    type: { status: 'measured', value: { mapping: '2a to 2b', term: 'Slight to Medium Wavy', index: 1, from: '2a', to: '2b' } },
    frizz: { status: 'measured', value: { mapping: 2, term: 'Frizzy' } },
    length: { status: 'measured', value: { term: 'above chest or longer', index: 6, lowerBoundOnly: true } },
    density: { status: 'measured', value: { term: 'Medium Density', level: 3, score: 2.16 } },
    measuredAt: '2026-10-15T10:00:00Z',
    notes: [],
  }

  async function captureAll(page: Page, views: string[]) {
    for (const view of views) {
      await page.waitForURL(`**/analysis/photos/${view}`)
      await upload(page, `${view}.jpg`, 'image/jpeg', await makeJpeg(page, 900, 1200))
      await waitPhase(page, 'review')
      await page.getByRole('button', { name: 'Use this photo' }).click()
    }
    await page.waitForURL('**/analysis/photos')
  }

  await test('complete profile: four measurements, care tips, cached, independent of colour', async () => {
    const { page, context } = await open('/analysis/photos')
    let calls = 0
    let sent: { setup?: string; views?: Record<string, string> } = {}
    await page.route('**/api/hair/analysis', async (route) => {
      calls++
      sent = JSON.parse(route.request().postData()!)
      await route.fulfill({ json: { profile: FULL_PROFILE, elapsedMs: 19643, unitsPlanned: 7 } })
    })
    await page.getByRole('button', { name: 'Start with: Front' }).click()
    await captureAll(page, ['front', 'left-45', 'right-45', 'top'])
    await page.getByRole('button', { name: 'See hair profile' }).click()
    await page.getByText('7 YouCam units if all succeed').waitFor()
    await page.getByRole('button', { name: 'Analyse my hair' }).click()
    const profile = page.getByLabel('Hair profile', { exact: true })
    await profile.getByText('Slight to Medium Wavy').waitFor()
    await profile.getByText('Frizzy', { exact: true }).waitFor()
    await profile.getByText('Above chest or longer').waitFor()
    await profile.getByText('Score 2.16 on YouCam’s 0–3 scale').waitFor()
    assert((await profile.locator('.metric-unavailable').count()) === 0, 'all measured')
    assert(sent.setup === 'loose' && Object.keys(sent.views!).sort().join() === 'front,left45,right45,top', 'all views sent')
    await page.getByText('Taming frizz.').waitFor()
    await page.getByText('Caring for longer lengths.').waitFor()
    await page.getByText('not professional or medical advice').waitFor()
    // Independent of colour: offers the colour journey rather than requiring it.
    await page.getByRole('link', { name: 'Try a box dye' }).waitFor()
    await page.getByRole('link', { name: 'Home' }).click()
    await page.getByText('4 of 4 measured').waitFor()
    await page.getByRole('link', { name: 'Hair profile', exact: true }).first().click()
    await page.waitForURL('**/analysis/results')
    await profile.getByText('Slight to Medium Wavy').waitFor()
    assert(calls === 1, `analysed once, got ${calls}`)

    // Reuse in the colour journey: care context appears, prediction unchanged.
    await page.getByRole('link', { name: 'Try a box dye' }).click()
    await upload(page, 'selfie.jpg', 'image/jpeg', await makeJpeg(page, 900, 1200))
    await waitPhase(page, 'review')
    await page.getByRole('button', { name: 'Use this photo' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Choose level myself' }).click()
    await page.locator('label.option', { hasText: 'Light brown' }).click()
    await page.getByText('No', { exact: true }).click()
    await page.getByRole('button', { name: 'Confirm level 5' }).click()
    await toResult(page, '9.1 Very light ash blonde', 'Use 9.1 Very light ash blonde')
    const profileContext = page.getByLabel('Hair profile context')
    await profileContext.getByText('Hair type: Slight to Medium Wavy').waitFor()
    await profileContext.getByText('Check the box instructions for how much product to use').waitFor()
    await page.getByText('Predicted level 6 orange blonde versus promised level 9 ash: 3 levels short.').waitFor()
    await context.close()
  })

  await test('partial profile: failed and inconclusive measurements shown honestly beside valid ones', async () => {
    const { page, context } = await open('/analysis/photos')
    await page.route('**/api/hair/analysis', (route) =>
      route.fulfill({
        json: {
          profile: {
            ...FULL_PROFILE,
            type: {
              status: 'failed',
              errorCode: 'error_face_angle_invalid',
              message: 'The head angle wasn’t right: front within 10°, sides turned more than 15°.',
            },
            frizz: {
              status: 'inconclusive',
              raw: { mapping: 9 },
              message: 'The frizz result wasn’t one of the documented values, so we can’t show it.',
            },
          },
          elapsedMs: 1,
          unitsPlanned: 7,
        },
      }),
    )
    await page.getByRole('button', { name: 'Start with: Front' }).click()
    await captureAll(page, ['front', 'left-45', 'right-45', 'top'])
    await page.getByRole('button', { name: 'See hair profile' }).click()
    await page.getByRole('button', { name: 'Analyse my hair' }).click()
    const typeCard = page.getByRole('article', { name: 'Hair type' })
    await typeCard.getByText('Couldn’t measure').waitFor()
    await typeCard.getByText('The head angle wasn’t right').waitFor()
    await page.getByRole('article', { name: 'Frizz' }).getByText('Inconclusive').waitFor()
    await page.getByRole('article', { name: 'Density' }).getByText('Medium Density').waitFor()
    assert((await page.getByText('Taming frizz.').count()) === 0, 'no tips from unmeasured frizz')

    // Retry only the failed measurement; the others are kept, not re-run or re-paid.
    let retryBody: { only?: string[]; views?: Record<string, string> } = {}
    await page.unroute('**/api/hair/analysis')
    await page.route('**/api/hair/analysis', async (route) => {
      retryBody = JSON.parse(route.request().postData()!)
      await new Promise((r) => setTimeout(r, 300))
      await route.fulfill({
        json: {
          profile: {
            type: FULL_PROFILE.type,
            frizz: { status: 'unsupported', message: 'Not requested in this run.' },
            length: { status: 'unsupported', message: 'Not requested in this run.' },
            density: { status: 'unsupported', message: 'Not requested in this run.' },
            measuredAt: '2026-10-15T11:00:00Z',
            notes: [],
          },
          elapsedMs: 1,
          unitsPlanned: 2,
        },
      })
    })
    const retry = page.getByRole('region', { name: 'Retry failed measurements' })
    await retry.getByText('Hair type couldn’t be measured').waitFor()
    await retry.getByRole('button', { name: 'Try failed measurements again' }).click()
    await page.getByRole('status', { name: 'Retrying failed measurements' }).getByText('Keeping your earlier result').first().waitFor()
    await typeCard.getByText('Slight to Medium Wavy').waitFor()
    assert(retryBody.only?.join() === 'type', `only type retried, got ${retryBody.only}`)
    assert(Object.keys(retryBody.views!).sort().join() === 'front,left45,right45', 'only the type photos sent')
    await page.getByRole('article', { name: 'Frizz' }).getByText('Inconclusive').waitFor()
    await page.getByRole('article', { name: 'Density' }).getByText('Medium Density').waitFor()
    assert((await retry.count()) === 0, 'retry panel gone once nothing has failed')
    await context.close()
  })

  await test('failed analysis request offers a retry; tied hair only asks for the top photo', async () => {
    const { page, context } = await open('/analysis/photos')
    let call = 0
    let sentViews: string[] = []
    await page.route('**/api/hair/analysis', (route) => {
      call++
      sentViews = Object.keys(JSON.parse(route.request().postData()!).views)
      if (call === 1) {
        return route.fulfill({
          status: 504,
          json: { error: 'The analysis took too long. Try again in a moment.', code: 'timeout', retryable: true },
        })
      }
      return route.fulfill({
        json: {
          profile: {
            type: { status: 'unsupported', message: 'Hair type needs your hair down. Tied hair hides its natural pattern.' },
            frizz: { status: 'unsupported', message: 'Frizz needs your hair down. Tied hair hides the lengths.' },
            length: { status: 'unsupported', message: 'Length can’t be measured while your hair is tied up.' },
            density: FULL_PROFILE.density,
            measuredAt: '2026-10-15T10:00:00Z',
            notes: [],
          },
          elapsedMs: 1,
          unitsPlanned: 1,
        },
      })
    })
    await page.getByText('Hair tied up, in braids or under a wig?').click()
    await page.getByText('Tied up and can’t let it down').click()
    await page.getByText('1 guided photo').waitFor()
    await page.getByRole('button', { name: 'Start with: Top, tilted down' }).click()
    await captureAll(page, ['top'])
    await page.getByRole('button', { name: 'See hair profile' }).click()
    await page.getByText('won’t be measured: Length can’t be measured while your hair is tied up.').waitFor()
    await page.getByRole('button', { name: 'Analyse my hair' }).click()
    await page.getByText('The analysis took too long').waitFor()
    await page.getByRole('button', { name: 'Try again' }).click()
    await page.getByRole('article', { name: 'Length' }).getByText('Not measured for this hair setup').waitFor()
    await page.getByRole('article', { name: 'Density' }).getByText('Medium Density').waitFor()
    assert(sentViews.join() === 'top', `only the top photo sent, got ${sentViews}`)
    await context.close()
  })

  await test('wig or covering: no photos, honest profile page, colour still available', async () => {
    const { page, context } = await open('/analysis/photos')
    await page.getByText('Hair tied up, in braids or under a wig?').click()
    await page.getByText('Wig, scarf or covering').click()
    await page.getByText('No photos needed for this setup.').waitFor()
    await page.getByRole('button', { name: 'See hair profile' }).click()
    await page.getByText('Nothing can be measured for this hair setup').waitFor()
    assert((await page.getByRole('button', { name: 'Analyse my hair' }).count()) === 0, 'nothing to send')
    await page.getByRole('link', { name: 'Try a box dye' }).waitFor()
    await context.close()
  })


  console.log('Demo mode (prepared examples; no API calls)')

  await test('demo walkthrough A: starting colour, ash blonde 9, promise vs prediction, gap, better option', async () => {
    const { page, context, errors } = await open('/')
    let apiCalls = 0
    await page.route('**/api/**', (route) => {
      if (!route.request().url().endsWith('/api/health')) apiCalls++
      return route.continue()
    })
    const before = await page.evaluate(() => JSON.stringify(sessionStorage))
    await page.getByRole('link', { name: 'Demo mode', exact: true }).first().click()
    await page.waitForURL('**/demo')
    await page.getByText('Demo mode.', { exact: true }).waitFor()
    await page.getByRole('link', { name: 'Start the walkthrough' }).click()
    await page.waitForURL('**/demo/colour/brass-surprise')
    await page.getByText('Level 4 · Medium brown').waitFor()
    await page.getByText('9.1 Very light ash blonde').first().waitFor()
    const comparison = page.getByLabel('Promise versus prediction')
    await comparison.getByText('Predicted level 6 orange blonde versus promised level 9 ash: 3 levels short.').waitFor()
    await comparison.getByText('Demo example, not your photo.').waitFor()
    await comparison.locator('.origin-demo-fixture').waitFor()
    await comparison.locator('.origin-deterministic').waitFor()
    assert((await comparison.locator('.origin-live').count()) === 0, 'nothing labelled live in demo mode')
    const decoded = await comparison.locator('img').evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).naturalWidth > 0))
    assert(decoded.length === 2 && decoded.every(Boolean), 'both recorded renders decode')
    const summary = page.getByLabel('Reveal summary')
    for (const [label, value] of [['Your level', '4'], ['Predicted level', '6'], ['Difference', '−3']]) {
      assert((await summary.locator('.stat', { hasText: label }).locator('.stat-value').innerText()).trim() === value, `${label} = ${value}`)
    }
    await page.getByText('Lightening stops around level 6, where orange pigment shows.').waitFor()
    const recommendation = page.getByLabel('Recommendation')
    assert((await page.getByText(/colou?rist/i).count()) === 0, 'no colourist referral anywhere')
    await recommendation.getByText('6.1 Ash dark blonde').waitFor()
    assert((await recommendation.getByRole('button', { name: /^Use / }).count()) === 0, 'demo suggestions are read-only')

    // Confirming a different level re-runs the same engine and withholds the level-4 renders.
    await page.getByRole('button', { name: 'One level lighter' }).click()
    await comparison.getByText('Predicted level 7').waitFor()
    await comparison.getByText('the recorded photo renders are for level 4').waitFor()
    assert((await comparison.locator('img').count()) === 0, 'renders hidden when they no longer match')

    await page.getByRole('link', { name: 'Next: B. Dye can’t lift dye' }).click()
    await page.getByText('Why this result').click()
    await page.getByText('Dye can’t lift dye.', { exact: true }).waitFor()
    await page.getByText('We have no genuine sample photo for this example').waitFor()
    await page.getByText('Black or very dark dye is the hardest to lighten').waitFor()
    await page.getByRole('link', { name: 'Next: C. The green-tone risk' }).click()
    await page.getByText('Ash over lightened, yellow or porous hair can turn green').waitFor()
    await page.getByText('with a risk of a green tinge').waitFor()
    await page.getByLabel('Recommendation').getByText('8 Light blonde').waitFor()

    await page.getByRole('link', { name: 'Next: hair analysis example' }).click()
    await page.waitForURL('**/demo/analysis')
    const profile = page.getByLabel('Hair profile', { exact: true })
    await profile.getByText('Above chest or longer').waitFor()
    await profile.getByText('Low Density').waitFor()
    assert((await profile.locator('.origin-demo-fixture').count()) === 2, 'two recorded measurements labelled as demo')
    assert((await profile.locator('.origin-unavailable').count()) === 2, 'two unavailable measurements labelled')
    await page.getByRole('article', { name: 'Hair type' }).getByText('Couldn’t measure').waitFor()
    await page.getByText('Caring for longer lengths.').waitFor()
    await page.getByText('Demo example, not your hair.').waitFor()

    await page.getByRole('link', { name: 'Back to dashboard' }).click()
    await page.getByText('One selfie · about 25 s').waitFor() // home shows no progress: the session is untouched
    const after = await page.evaluate(() => JSON.stringify(sessionStorage))
    assert(after === before, 'demo mode left the real session untouched')
    assert(apiCalls === 0, `demo mode made no API calls, got ${apiCalls}`)
    assert(errors.length === 0, `no page errors: ${errors}`)
    await context.close()
  })

  await test('demo examples never enter a real session: live result page still asks for real inputs', async () => {
    const { page, context } = await open('/demo/colour/green-risk')
    await page.getByText('with a risk of a green tinge').waitFor()
    await page.goto(page.url().replace(/\/demo\/.*$/, '/colour/result'))
    await page.getByText('A few steps left').waitFor()
    await page.goto(page.url().replace(/\/colour\/.*$/, '/analysis/results'))
    await page.getByText('Photos needed').waitFor()
    await context.close()
  })

  console.log('Theme, offline and live-service messaging')

  await test('dark theme by default; Light in Settings persists', async () => {
    const { page, context } = await open('/settings')
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    assert((await bg()) === 'rgb(24, 23, 22)', `dark background, got ${await bg()}`)
    await page.getByText('Light', { exact: true }).click()
    assert((await bg()) === 'rgb(247, 246, 243)', 'light background after switching')
    await page.reload()
    assert((await bg()) === 'rgb(247, 246, 243)', 'light theme kept after reload')
    await page.getByText('Dark', { exact: true }).click()
    assert((await bg()) === 'rgb(24, 23, 22)', 'back to dark')
    await context.close()
  })

  await test('offline: banner, honest API error, demo still works', async () => {
    const { page, context } = await open('/colour/photo')
    await upload(page, 'selfie.jpg', 'image/jpeg', await makeJpeg(page, 900, 1200))
    await waitPhase(page, 'review')
    await page.getByRole('button', { name: 'Use this photo' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await context.setOffline(true)
    await page.getByText('You’re offline. Demo mode and your saved choices still work').waitFor()
    await page.getByRole('button', { name: 'Read my hair colour' }).click()
    await page.getByText('Live YouCam analysis needs a connection; demo mode works offline.').waitFor()
    await page.getByRole('link', { name: 'Home' }).click()
    await page.getByRole('link', { name: 'Demo mode', exact: true }).first().click()
    await page.getByRole('link', { name: 'Start the walkthrough' }).click()
    await page.getByText('3 levels short').first().waitFor()
    await context.setOffline(false)
    await context.close()
  })

  await test('live YouCam not configured: dashboard says so and points to demo mode', async () => {
    const { page, context } = await open('/', {})
    await page.route('**/api/health', (route) => route.fulfill({ json: { status: 'ok', youcamConfigured: false } }))
    await page.reload()
    await page.getByText('Live YouCam features aren’t set up on this server (no API key).').waitFor()
    await context.close()
  })

  await test('mobile layout: no horizontal scroll on the main screens', async () => {
    const { page, context } = await open('/')
    for (const path of ['/', '/demo', '/demo/colour/brass-surprise', '/demo/colour/dye-on-dye', '/demo/colour/green-risk', '/demo/analysis', '/analysis/photos', '/colour/photo', '/settings']) {
      await page.goto(page.url().replace(/(https?:\/\/[^/]+).*/, `$1${path}`))
      await page.locator('main').waitFor()
      await page.waitForTimeout(150)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      assert(overflow <= 0, `${path} overflows by ${overflow}px`)
    }
    await context.close()
  })

  await browser.close()
  await server.close()

  console.log(`\n${passed} passed, ${failures.length} failed`)
  if (failures.length) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
