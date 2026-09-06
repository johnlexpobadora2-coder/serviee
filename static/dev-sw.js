// Minimal Service Worker for Vite Dev Mode to enable PWA beforeinstallprompt
self.addEventListener('install', (event) => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
	// Pass through all requests to Vite dev server
	return;
});
