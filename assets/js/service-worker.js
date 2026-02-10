// Service Worker for Smart Roads PWA

const CACHE_NAME = 'smart-roads-v1.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/css/style.css',
    '/assets/css/pwa.css',
    '/assets/js/app.js',
    '/assets/js/maps.js',
    '/modules/commuters.html',
    '/modules/delivery.html',
    '/modules/cab-drivers.html',
    '/modules/emergency.html',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache opened');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Strategy: Network First with Cache Fallback
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) return;

    // Handle API requests differently
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // Return offline data for API requests
                    return new Response(JSON.stringify({
                        status: 'offline',
                        message: 'You are offline. Data may be outdated.',
                        timestamp: new Date().toISOString()
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
        return;
    }

    // For page navigation, try network first
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Clone the response
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => cache.put(event.request, responseClone));
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request)
                        .then(cachedResponse => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            // Return offline page for HTML requests
                            return caches.match('/offline.html')
                                .then(offlinePage => offlinePage || new Response('Offline'));
                        });
                })
        );
        return;
    }

    // For static assets, try cache first
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Update cache in background
                    fetch(event.request)
                        .then(response => {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(event.request, responseClone));
                        })
                        .catch(() => {
                            console.log('Failed to update cache for:', event.request.url);
                        });
                    return cachedResponse;
                }

                // Not in cache, try network
                return fetch(event.request)
                    .then(response => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => cache.put(event.request, responseClone));

                        return response;
                    })
                    .catch(() => {
                        // Network failed, return offline response for images
                        if (event.request.headers.get('Accept').includes('image')) {
                            return new Response(
                                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="#f0f0f0"/><text x="100" y="75" text-anchor="middle" fill="#666" font-family="Arial" font-size="14">Image not available offline</text></svg>',
                                { headers: { 'Content-Type': 'image/svg+xml' } }
                            );
                        }
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});

// Background Sync for offline actions
self.addEventListener('sync', event => {
    if (event.tag === 'sync-traffic-data') {
        event.waitUntil(syncTrafficData());
    }
});

async function syncTrafficData() {
    try {
        // Get offline traffic updates
        const offlineUpdates = await getOfflineUpdates();
        
        // Send to server
        for (const update of offlineUpdates) {
            await fetch('/api/traffic/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(update)
            });
        }
        
        // Clear offline updates
        await clearOfflineUpdates();
        
        console.log('Traffic data synced successfully');
    } catch (error) {
        console.error('Sync failed:', error);
        throw error;
    }
}

async function getOfflineUpdates() {
    // This would get data from IndexedDB
    // For now, return empty array
    return [];
}

async function clearOfflineUpdates() {
    // Clear from IndexedDB
    console.log('Clearing offline updates');
}

// Push Notifications
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    
    const options = {
        body: data.body || 'Smart Roads Notification',
        icon: '/assets/icons/icon-192.png',
        badge: '/assets/icons/icon-72.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        },
        actions: [
            {
                action: 'open',
                title: 'Open App'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Smart Roads', options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});

// Periodic Background Sync
self.addEventListener('periodicsync', event => {
    if (event.tag === 'update-traffic') {
        event.waitUntil(updateTrafficCache());
    }
});

async function updateTrafficCache() {
    try {
        const response = await fetch('/api/traffic/latest');
        const trafficData = await response.json();
        
        // Store in cache
        const cache = await caches.open(CACHE_NAME);
        await cache.put(
            new Request('/api/traffic/latest'),
            new Response(JSON.stringify(trafficData))
        );
        
        console.log('Traffic cache updated');
    } catch (error) {
        console.error('Failed to update traffic cache:', error);
    }
}

// Handle messages from the client
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});