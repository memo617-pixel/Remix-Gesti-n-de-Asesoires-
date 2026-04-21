const CACHE_NAME = 'asesor-tecnico-lacteo-v8';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-512x512.png',
  '/farm-management-1.png',
  '/nestle-logo.png'
];

// Estrategia Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchedResponse = fetch(event.request).then((networkResponse) => {
          // Guardar en caché la nueva respuesta (si es válida)
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Ignoramos errores de red ya que depende de la caché local cuando está offline
        });

        // Devolvemos la caché si existe inmediatamente; si no, esperamos la red
        return cachedResponse || fetchedResponse;
      });
    })
  );
});

// Instalar y Precargar Recursos Vitales (incluyendo el icono)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Precargando archivos en caché...');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Al activarse, reclamamos el control y limpiamos cachés viejas si es necesario
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
