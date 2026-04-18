const VERSION = 'v04181124';
const CACHE = 'dmtech-' + VERSION;

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim().catch(() => {}))
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Só http/https: ignora chrome-extension://, data:, blob:, etc
  if (!url.startsWith('http')) return;
  // Só GET pode ser cacheado
  if (e.request.method !== 'GET') return;
  // Supabase, APIs externas e fontes: sempre rede, sem cache
  if (url.includes('supabase.co') || url.includes('googleapis') || url.includes('gstatic') || url.includes('jsdelivr')) {
    return;
  }
  // Arquivos locais: cache-first, atualiza em background
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const network = fetch(e.request).then(res => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    )
  );
});
