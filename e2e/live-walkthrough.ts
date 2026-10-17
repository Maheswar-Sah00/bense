// LIVE end-to-end walkthrough at a 393 px phone viewport, through the real UI and the real
// YouCam APIs (uses units: Facial Color Tones 20, Hair Color 2, hair tasks up to 7).
// Needs `npm run dev` running with the API key.
//
//   npm run smoke:walkthrough -- --selfie s.jpg --front f.jpg --left l.jpg --right r.jpg --top t.jpg
//                                [--only colour|analysis] [--out dir]
//
// Screenshots go to --out (default ../tests/out/walkthrough), which is git-ignored.
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium, type Page } from 'playwright-core'

const args = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const base = process.env.BASE_URL ?? 'http://localhost:5173'
const out = resolve(flag('out') ?? '../tests/out/walkthrough')
mkdirSync(out, { recursive: true })
const selfie = flag('selfie')
const views = {
  front: flag('front'),
  'left-45': flag('left'),
  'right-45': flag('right'),
  top: flag('top'),
}
const only = flag('only')
if (!selfie && only !== 'analysis') throw new Error('--selfie is required')

const executablePath = [
  process.env.BROWSER_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].find((p): p is string => !!p && existsSync(p))

const browser = await chromium.launch({ executablePath })
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
})
const page = await context.newPage()
const errors: string[] = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
const shot = (name: string) => page.screenshot({ path: `${out}/${name}.png`, fullPage: true })
const timed = async (label: string, fn: () => Promise<unknown>) => {
  const t = Date.now()
  await fn()
  console.log(`  ${label}: ${((Date.now() - t) / 1000).toFixed(1)} s`)
}

async function addPhoto(p: Page, path: string) {
  await p.getByTestId('capture-file').setInputFiles(path)
  await p.locator('[data-phase="review"]').waitFor()
  await p.getByRole('button', { name: 'Use this photo' }).click()
}

const started = Date.now()
if (only !== 'analysis') {
  console.log('Journey A: hair colour prediction (live)')
  await page.goto(base + '/')
  await page.getByRole('link', { name: 'Try a box dye' }).first().click()
  await addPhoto(page, selfie!)
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Read my hair colour' }).click()
  await page.getByRole('status', { name: 'Reading your starting colour' }).waitFor()
  await shot('a1-reading-progress')
  const measured = page.getByRole('region', { name: 'Hair level measurement' })
  await timed('colour reading + hair mask + measurement (parallel)', () => measured.waitFor({ timeout: 120_000 }))
  console.log(
    `  measured: ${(await measured.locator('.reading-name').innerText()).trim()} · ${(await measured.locator('.measure-figures').innerText()).trim()}`,
  )
  const family = page.locator('.reading-card:not(.measure-card) .reading-name')
  if (await family.count()) console.log(`  Facial Color Tones said: ${(await family.innerText()).trim()}`)
  await page.getByText('No', { exact: true }).click()
  const confirm = page.getByRole('button', { name: /^Confirm level/ })
  console.log(`  ${await confirm.innerText()}`)
  await shot('a2-reading')
  await confirm.click()
  await page.locator('label.option', { hasText: '9.1 Very light ash blonde' }).click()
  await page.getByRole('button', { name: 'Use 9.1 Very light ash blonde' }).click()
  await page.waitForURL('**/colour/result')
  console.log(`  headline: ${(await page.locator('.reveal-headline').first().innerText()).trim()}`)
  await page.getByRole('button', { name: 'Show it on my photo' }).click()
  await page.getByRole('status', { name: 'Rendering both looks on your photo' }).waitFor()
  await shot('a3-render-progress')
  await timed('Hair Color renders (2, parallel)', () =>
    page.getByText('What the box promises').waitFor({ timeout: 120_000 }),
  )
  await shot('a4-result')
  console.log(
    `  recommendation: ${(await page.getByLabel('Recommendation').innerText()).split('\n').slice(1, 3).join(' / ')}`,
  )
}

if (only !== 'colour') {
  console.log('Journey B: hair analysis (live)')
  await page.goto(base + '/')
  await page.getByRole('link', { name: 'Hair profile', exact: true }).first().click()
  await page.getByRole('button', { name: /^Start with/ }).click()
  for (const [view, path] of Object.entries(views)) {
    await page.waitForURL(`**/analysis/photos/${view}`)
    if (path) await addPhoto(page, path)
    else await page.getByRole('button', { name: 'Skip it' }).click()
  }
  await page.getByRole('button', { name: 'See hair profile' }).click()
  await page.getByRole('button', { name: 'Analyse my hair' }).click()
  await page.getByRole('status', { name: 'Analysing your hair' }).waitFor()
  await shot('b1-analysis-progress')
  await timed('hair analysis', () =>
    page.getByRole('article').first().locator('.metric-badge').waitFor({ timeout: 180_000 }),
  )
  for (const title of ['Hair type', 'Frizz', 'Length', 'Density']) {
    const card = page.getByRole('article', { name: title })
    console.log(
      `  ${title}: ${(await card.locator('.metric-badge').innerText()).trim()} · ${(await card.locator('.metric-value, .metric-reason').first().innerText()).trim()}`,
    )
  }
  await shot('b2-profile')
}

console.log(
  `whole walkthrough: ${((Date.now() - started) / 1000).toFixed(1)} s; console errors: ${errors.length ? errors.join(' | ') : 'none'}`,
)
console.log(`screenshots: ${out}`)
await browser.close()
