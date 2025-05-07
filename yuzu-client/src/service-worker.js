import { precacheAndRoute } from 'workbox-precaching';

// self.__WB_MANIFEST is injected by Workbox (via vite-plugin-pwa)
// and contains a list of URLs to precache.
precacheAndRoute(self.__WB_MANIFEST || []);

// --- Push Notification Logic ---

self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event');
  // self.skipWaiting() is often used to ensure the new service worker activates
  // immediately after install, especially if you want new features (like push)
  // to be available without waiting for all clients to close.
  // Workbox's precaching might handle this implicitly, but it's good to be explicit.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event');
  // event.waitUntil() ensures that the activate event doesn't complete
  // until all promises within it are resolved.

  const cacheWhitelist = ["my-pwa-cache"]; // Your custom cache name
  // Add Workbox's cache names to the whitelist if you want to preserve them,
  // though Workbox typically manages its own caches.
  // For simplicity, we'll focus on your custom cache and Workbox's default behavior.

  event.waitUntil(
    Promise.all([
      // Claim clients immediately so the new SW controls existing pages.
      self.clients.claim(),
      // Clean up old non-Workbox caches.
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete caches that are not in the whitelist and not Workbox's internal caches.
            if (cacheWhitelist.indexOf(cacheName) === -1 && !cacheName.startsWith('workbox-')) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received.', event.data.text());
  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error('Service Worker: Failed to parse push data as JSON.', e);
    // Fallback if data is not JSON or parsing fails
    data = {
      title: 'New Notification',
      body: event.data.text() || 'You have a new message.',
      url: '/'
    };
  }

  const title = data.title || 'YuzuPay Notification'; // Default title
  const options = {
    body: data.body || 'You have a new update.', // Default body
    icon: '/icons/icon-192x192.png', // Ensure this icon exists in your public/icons folder
    badge: '/icons/icon-96x96.png',   // Ensure this icon exists
    vibrate: [100, 50, 100], // Optional: vibration pattern
    data: {
      url: data.url || '/' // URL to open on notification click
    },
    // actions: [ // Optional: add action buttons
    //   { action: 'explore', title: 'Explore', icon: '/icons/explore.png' },
    //   { action: 'close', title: 'Close', icon: '/icons/close.png' },
    // ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received.', event.notification);
  event.notification.close(); // Close the notification

  const urlToOpen = event.notification.data.url || '/';

  // This code attempts to focus an existing window/tab or open a new one.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a tab open with the target URL
      for (const client of clientList) {
        // If client.url is just the origin, and urlToOpen is a path, this might need adjustment
        // For simplicity, let's assume we're looking for an exact match or a base match
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no tab is found, or focusing fails, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});


// --- Your existing fetch listener for cache-first strategy (optional with Workbox) ---
// Workbox's precacheAndRoute handles caching of specified assets.
// If you need a different strategy for other requests (e.g., API calls),
// you can use Workbox strategies or keep your custom fetch listener.
// For simplicity, if precacheAndRoute covers your needs, this might be redundant
// or could be replaced with more specific Workbox routing rules.

self.addEventListener("fetch", (event) => {
  // Example: Cache-first for navigation requests, network-first for others
  // This is a simple example; Workbox offers more robust routing.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
  // For other requests, you might let them go to the network,
  // or apply other caching strategies.
  // If not handled here, they will go to the network by default.
});