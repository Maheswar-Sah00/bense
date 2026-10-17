// PWA checks against the PRODUCTION build (the service worker only registers in production).
// Run: npm run test:pwa   (builds first, then serves dist with vite preview)
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright-core'
import { preview } from 'vite'

const BROWSERS = [
  process.env.BROWSER_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter((p): p is string => !!p)

let failed = 0
function check(ok: unknown, label: string) {
  console.log(`  ${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failed++
}

const server = await preview({ preview: { port: 0 }, logLevel: 'error' })
const base = server.resolvedUrls!.local[0].replace(/\/$/, '')
// A persistent (non-incognito) profile: browsers don't offer installation in incognito.
const profile = mkdtempSync(join(tmpdir(), 'bense-pwa-'))
const context = await chromium.launchPersistentContext(profile, {
  executablePath: BROWSERS.find((p) => existsSync(p)),
  viewport: { width: 393, height: 852 },
})
const page = await context.newPage()
const errors: string[] = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  // Network failures while deliberately offline are expected.
  if (m.type() === 'error' && !m.text().includes('ERR_INTERNET_DISCONNECTED')) errors.push(m.text())
})

console.log('Manifest and icons')
await page.goto(base + '/')
const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
const manifest = await (await fetch(base + manifestHref)).json()
check(manifest.name && manifest.short_name === 'Bense', `name "${manifest.name}", short name "${manifest.short_name}"`)
check(manifest.start_url === '/' && manifest.display === 'standalone', 'start_url / and display standalone')
for (const size of ['192x192', '512x512']) {
  const icon = manifest.icons.find((i: { sizes: string; type: string }) => i.sizes === size && i.type === 'image/png')
  const res = icon && (await fetch(base + icon.src))
  check(res?.ok && res.headers.get('content-type')?.includes('png'), `${size} PNG icon served`)
}
check(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable'), 'maskable icon')

console.log('Service worker')
const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)
check(scope === base + '/', `registered for ${scope}`)
await page.reload()
check(await page.evaluate(() => !!navigator.serviceWorker.controller), 'controls the page after reload')
const cdp = await context.newCDPSession(page)
const { installabilityErrors } = (await cdp.send('Page.getInstallabilityErrors')) as { installabilityErrors: { errorId: string }[] }
check(installabilityErrors.length === 0, `installable (browser report: ${JSON.stringify(installabilityErrors.map((e) => e.errorId))})`)

// Visit the demo (public images) and touch the API, then inspect what was cached.
await page.goto(base + '/demo/colour/brass-surprise')
await page.getByText('3 levels short').first().waitFor()
await page.evaluate(() => fetch('/api/health').catch(() => null))
const cached = await page.evaluate(async () => {
  const keys: string[] = []
  for (const name of await caches.keys()) for (const req of await (await caches.open(name)).keys()) keys.push(new URL(req.url).pathname)
  return keys
})
check(cached.includes('/') && cached.some((k) => k.startsWith('/assets/')), `app shell cached (${cached.length} entries)`)
check(cached.every((k) => !k.startsWith('/api/')), 'no API responses cached')
check(cached.every((k) => k === '/' || /^\/(assets|demo-assets)\/|^\/(manifest\.webmanifest|icon[\w-]*\.(svg|png))$/.test(k)), 'only shell files, icons and public demo assets cached')

console.log('Offline')
// Going offline on an open page (Chromium's emulation doesn't set navigator.onLine for pages
// that start loading while already offline; real devices do).
await context.setOffline(true)
check(await page.getByText('You’re offline.').waitFor({ timeout: 5000 }).then(() => true, () => false), 'offline banner shown')
await page.goto(base + '/demo/colour/green-risk')
check(await page.getByText('with a risk of a green tinge').first().isVisible(), 'demo scenario works offline')
await page.goto(base + '/colour/photo')
check(await page.locator('[data-phase]').count(), 'live screens load as an app shell offline')
const apiOffline = await page.evaluate(() => fetch('/api/health').then(() => 'answered', () => 'failed'))
check(apiOffline === 'failed', 'API is not answered from cache offline')
const demoImage = await page.evaluate(() => fetch('/demo-assets/reveal-promise.jpg').then((r) => r.ok, () => false))
check(demoImage, 'labelled demo renders available offline')
await context.setOffline(false)

check(errors.length === 0, `no console errors (${errors.join(' | ')})`)
await context.close()
rmSync(profile, { recursive: true, force: true })
await server.close()
console.log(`\n${failed ? `${failed} failed` : 'all PWA checks passed'}`)
process.exit(failed ? 1 : 0)
