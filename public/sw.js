// Simple cache-first service worker for KCET Predictor
const CACHE = 'kcet-predictor-v1'
const ASSETS = ['/', '/manifest.json', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  // Bypass API and Razorpay
  if (url.pathname.startsWith('/api/')) return
  if (url.hostname.includes('razorpay.com')) return
  if (url.hostname.includes('supabase')) return

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, clone)).catch(() => {})
        }
        return response
      }).catch(() => cached)
      return cached || fetchPromise
    })
  )
})
