const CACHE_NAME = 'green-codex-v10';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo appli.png',
  // On cache les librairies externes pour le mode hors-ligne
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.plot.ly/plotly-2.27.0.min.js',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700;900&display=swap'
];

// 1. Installation : On met en cache les fichiers statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activation : On nettoie les vieux caches si besoin
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// 3. Interception réseau (Stratégie : Cache First, puis Réseau)
self.addEventListener('fetch', (event) => {
  // On ignore les requêtes vers Firebase ou GitHub pour éviter les problèmes d'auth
  if (event.request.url.includes('firebase') || event.request.url.includes('github')) {
    return; 
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Si trouvé dans le cache, on le rend, sinon on va chercher sur le réseau
      return cachedResponse || fetch(event.request);
    })
  );
});
