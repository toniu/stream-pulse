/**
 * pyAux Service Worker
 * Handles offline caching and background sync
 * Version: 2.0.1
 */

const CACHE_NAME = 'pyaux-v2.0.1';
const RUNTIME_CACHE = 'pyaux-runtime-v2.0.1';
const IMAGE_CACHE = 'pyaux-images-v2.0.1';

// Assets to cache on install
const PRECACHE_URLS = [
    '/',
    '/static/css/style.css',
    '/static/js/main.js',
    '/static/js/results.js',
    '/static/manifest.json'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching app shell');
                return cache.addAll(PRECACHE_URLS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => {
                        return cacheName !== CACHE_NAME && 
                               cacheName !== RUNTIME_CACHE &&
                               cacheName !== IMAGE_CACHE;
                    })
                    .map((cacheName) => {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip external requests (except for CDN resources)
    if (url.origin !== location.origin && 
        !url.hostname.includes('cdn.jsdelivr.net') &&
        !url.hostname.includes('i.scdn.co')) {
        return;
    }
    
    // Handle different types of requests
    if (request.destination === 'image') {
        event.respondWith(handleImageRequest(request));
    } else if (url.pathname.startsWith('/api/') || url.pathname.includes('/analyze')) {
        // Network-first for API requests
        event.respondWith(handleApiRequest(request));
    } else {
        // Cache-first for static assets
        event.respondWith(handleStaticRequest(request));
    }
});

/**
 * Handle image requests with image cache
 */
async function handleImageRequest(request) {
    const cache = await caches.open(IMAGE_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
        return cached;
    }
    
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('[Service Worker] Image fetch failed:', error);
        // Return placeholder image
        return new Response('', { status: 404 });
    }
}

/**
 * Handle API requests (network-first)
 */
async function handleApiRequest(request) {
    try {
        const response = await fetch(request);
        
        if (response.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.error('[Service Worker] Network request failed, trying cache:', error);
        
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        
        // Return offline response
        return new Response(JSON.stringify({
            success: false,
            error: 'You are offline. Please check your connection and try again.',
            offline: true
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Handle static requests (cache-first)
 */
async function handleStaticRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
        // Return cached version and update in background
        fetchAndUpdateCache(request, cache);
        return cached;
    }
    
    try {
        const response = await fetch(request);
        
        if (response.ok) {
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.error('[Service Worker] Fetch failed:', error);
        
        // Try to return offline page
        const offlinePage = await cache.match('/');
        if (offlinePage) {
            return offlinePage;
        }
        
        // Return basic offline response
        return new Response('You are offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

/**
 * Fetch and update cache in background
 */
async function fetchAndUpdateCache(request, cache) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
    } catch (error) {
        // Silently fail - we already have cached version
    }
}

// Background sync for form submissions
self.addEventListener('sync', (event) => {
    console.log('[Service Worker] Background sync:', event.tag);
    
    if (event.tag === 'sync-analytics') {
        event.waitUntil(syncAnalytics());
    }
});

/**
 * Sync analytics data
 */
async function syncAnalytics() {
    // Implement analytics sync if needed
    console.log('[Service Worker] Syncing analytics...');
}

// Push notifications (for future features)
self.addEventListener('push', (event) => {
    if (!event.data) {
        return;
    }
    
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/static/images/icon-192.png',
        badge: '/static/images/badge-72.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/'
        }
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});

// Message event for communication with clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            })
        );
    }
});

console.log('[Service Worker] Loaded successfully');
