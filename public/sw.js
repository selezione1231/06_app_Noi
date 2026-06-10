// ============================================================================
// Todos Hub — Service Worker (PWA)
// Strategia: Network-first per API, Cache-first per assets statici
// ============================================================================

const CACHE_NAME = 'todos-hub-v1'
const STATIC_ASSETS = [
  '/',
  '/todos-logo.png',
  '/manifest.json'
]

// Install: pre-cache assets statici
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate: rimuove cache vecchie
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network-first per Supabase/API, cache-first per statici
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Non intercettare richieste non-GET o cross-origin API (Supabase, Gemini)
  if (request.method !== 'GET') return
  if (url.hostname.includes('supabase') || url.hostname.includes('googleapis') || url.hostname.includes('generativelanguage')) return

  // Strategia cache-first per assets (JS, CSS, immagini)
  if (url.pathname.match(/\.(js|css|png|jpg|svg|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Network-first per tutto il resto (pagine HTML, navigazione)
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok && request.mode === 'navigate') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('/')))
  )
})

// Background sync per timbrature offline (preparazione futura)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-clockin') {
    event.waitUntil(syncPendingClockIns())
  }
})

async function syncPendingClockIns() {
  // In produzione: legge da IndexedDB le timbrature offline e le invia a Supabase
  console.log('[SW] Sync timbrature offline — da implementare con Supabase')
}
