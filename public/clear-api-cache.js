// Previous releases cached API responses. Remove that cache on activation.
self.addEventListener('activate', event => {
  event.waitUntil(caches.delete('api-cache'))
})
