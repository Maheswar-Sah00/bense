// App-shell service worker. It caches only the app's own code, icons and the public demo
// assets. It never caches API calls (photos, readings, renders), blob or data URLs, or
// anything from another origin, so no private photo or temporary result link is stored.
const CACHE = 'bense-shell-v4'
const STATIC = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/demo-assets/reveal-before.jpg',
  '/demo-assets/reveal-promise.jpg',
  '/demo-assets/reveal-result.jpg',
]

async function precache() {
  const cache = await caches.open(CACHE)
  await cache.addAll(STATIC)
  // The built JS and CSS have hashed names, so read them from the page we just cached.
  const html = await (await cache.match('/')).text()
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1])
  await cache.addAll(assets)
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

const isShellAsset = (path) =>
  path.startsWith('/assets/') ||
  path.startsWith('/demo-assets/') ||
  // On-device face model for the angle guide: fetched on first use, then works offline.
  path.startsWith('/mediapipe/') ||
  STATIC.includes(path)

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    // Network first so new builds show up; offline, every route gets the cached app shell.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put('/', copy))
          }
          return response
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  if (isShellAsset(url.pathname)) {
    // Hashed or fixed public files: cache first, filled on demand if missing.
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
  }
})
