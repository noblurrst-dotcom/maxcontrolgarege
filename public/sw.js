/*
 * Service Worker — A.T.A Gestão
 *
 * Estratégia:
 * - HTML/navegacionais: NETWORK-FIRST (sempre busca a versão nova; cai no cache só offline).
 *   Evita usuários ficarem presos em HTML antigo após novos deploys.
 * - Assets versionados com hash (/assets/*): CACHE-FIRST (imutáveis por hash, então cache é seguro).
 * - skipWaiting + clients.claim: nova versão assume controle imediato.
 * - activate: remove TODOS os caches que não são o atual (limpa v1, v2, estetica-automotiva-v1 etc).
 */
const CACHE_NAME = 'ata-gestao-v4';
const PRECACHE_URLS = [
  '/',
  '/manifest.json'
];

// Install: pre-cache mínimo e ativa imediatamente
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// Activate: limpa caches antigos e assume controle de todas as páginas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first para HTML; cache-first para assets versionados
self.addEventListener('fetch', event => {
  const { request } = event;

  // Só interceptar GETs mesmo protocolo
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegacionais / HTML → network-first
  const isNavigate = request.mode === 'navigate' || request.destination === 'document';
  if (isNavigate) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('/')))
    );
    return;
  }

  // Assets versionados (com hash no filename) → cache-first
  const isHashedAsset = /\/assets\/.+-[a-zA-Z0-9_-]{6,}\.(js|css|woff2?|ttf|otf|svg|png|jpg|jpeg|webp|gif|ico)$/.test(url.pathname);
  if (isHashedAsset) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, copy)).catch(() => {});
          return response;
        });
      })
    );
    return;
  }

  // Resto (imagens avulsas, manifest, etc): stale-while-revalidate leve
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, copy)).catch(() => {});
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

// Permite que a app dispare skipWaiting manualmente (ex: botão 'Nova versão disponível')
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
