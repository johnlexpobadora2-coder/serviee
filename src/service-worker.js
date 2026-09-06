/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE = `serviee-cache-${version}`;

const ASSETS = [
	...build,
	...files
];

self.addEventListener('install', (event) => {
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) {
				await caches.delete(key);
			}
		}
	}

	event.waitUntil(deleteOldCaches().then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);

	// Skip non-http/https schemes or Supabase / external dynamic API requests
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
	if (url.hostname.includes('supabase.co')) return;

	async function respond() {
		const cache = await caches.open(CACHE);

		// 1. Try cache first for build/static files
		if (ASSETS.includes(url.pathname)) {
			const cachedResponse = await cache.match(event.request);
			if (cachedResponse) return cachedResponse;
		}

		// 2. Network-first strategy for page requests & dynamic content
		try {
			const response = await fetch(event.request);

			if (response.status === 200) {
				cache.put(event.request, response.clone());
			}

			return response;
		} catch (err) {
			// Fallback to cache if network is offline/fails
			const cachedResponse = await cache.match(event.request);
			if (cachedResponse) return cachedResponse;

			// If navigating and offline, return cached index/root if available
			if (event.request.mode === 'navigate') {
				const offlineResponse = await cache.match('/');
				if (offlineResponse) return offlineResponse;
			}

			throw err;
		}
	}

	event.respondWith(respond());
});
