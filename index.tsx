
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- PWA Service Worker Registration ---
if ('serviceWorker' in navigator) {
  // The service worker code is created dynamically from a string.
  const swCode = `
    const CACHE_NAME = 'fitforge-ai-cache-v1';

    // On install, cache the main app shell files.
    self.addEventListener('install', event => {
      event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
          console.log('Opened cache');
          // Add core files to cache. Others will be cached on fetch.
          return cache.addAll([
            '/', 
            '/index.tsx', 
            'https://cdn.tailwindcss.com'
          ]);
        })
      );
    });

    // On fetch, serve from cache if available, otherwise fetch from network and cache the result.
    self.addEventListener('fetch', event => {
      // We only want to cache GET requests.
      if (event.request.method !== 'GET') {
          return;
      }
    
      // For requests to the Gemini API, always go to the network and do not cache.
      if (event.request.url.includes('generativelanguage.googleapis.com')) {
          event.respondWith(fetch(event.request));
          return;
      }

      event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
          return cache.match(event.request).then(response => {
            // Return from cache if available.
            const fetchPromise = fetch(event.request).then(networkResponse => {
              // If we get a valid response, clone it and put it in the cache.
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            });

            // Return cached response immediately if available, and update cache in background.
            // Or, for offline-first, just return cache response, then network.
            return response || fetchPromise;
          });
        })
      );
    });

    // On activate, clean up old caches.
    self.addEventListener('activate', event => {
      const cacheWhitelist = [CACHE_NAME];
      event.waitUntil(
        caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              if (cacheWhitelist.indexOf(cacheName) === -1) {
                return caches.delete(cacheName);
              }
            })
          );
        })
      );
    });
  `;
  
  const blob = new Blob([swCode], { type: 'application/javascript' });
  const swUrl = URL.createObjectURL(blob);

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swUrl)
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}
// --- End PWA Code ---

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);