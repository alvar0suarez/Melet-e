// Melete Service Worker — enables PWA installation (Chrome WebAPK / iOS Add to Home Screen)
// We don't cache anything: all data lives on the server and must be fresh.

const VERSION = 'melete-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim())
})

// Pass every request straight through — no offline caching.
// The server must be reachable (via local network or Tailscale VPN).
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request))
})
