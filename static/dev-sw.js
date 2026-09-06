// Minimal Service Worker for Vite Dev Mode to enable PWA beforeinstallprompt
self.addEventListener('install', (event) => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
	// Call event.respondWith so Chrome recognizes a functional fetch handler for PWA installability
	if (event.request.method !== 'GET') return;
	event.respondWith(fetch(event.request));
});
