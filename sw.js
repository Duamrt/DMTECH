const CACHE = 'dmtech-v04141854';
const STATIC = [
  '/dmtechapp/',
  '/dmtechapp/dashboard.html',
  '/dmtechapp/kanban.html',
  '/dmtechapp/minha-fila.html',
  '/dmtechapp/clientes.html',
  '/dmtechapp/os.html',
  '/dmtechapp/orcamentos.html',
  '/dmtechapp/catalogo.html',
  '/dmtechapp/financeiro.html',
  '/dmtechapp/folha.html',
  '/dmtechapp/config.html',
  '/dmtechapp/js/config.js',
  '/dmtechapp/js/auth.js',
  '/dmtechapp/css/styles.css',
  '/dmtechapp/favicon.svg',
  '/dmtechapp/icons/icon-192.png',
  '/dmtechapp/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Supabase e APIs externas: sempre rede
  if (e.request.url.includes('supabase.co') || e.request.url.includes('fonts.googleapis')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
