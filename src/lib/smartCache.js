// Smart Local Storage Caching Utility with TTL and Stale-While-Revalidate support

const DEFAULT_TTL = 3 * 60 * 1000; // 3 minutes default TTL

export function getSmartCache(key, maxAgeMs = DEFAULT_TTL) {
	if (typeof window === 'undefined') return { data: null, isStale: true, exists: false };

	try {
		const raw = localStorage.getItem(`serviee_sc_${key}`);
		if (!raw) return { data: null, isStale: true, exists: false };

		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed.timestamp !== 'number') {
			return { data: null, isStale: true, exists: false };
		}

		const age = Date.now() - parsed.timestamp;
		const isStale = age > maxAgeMs;

		return {
			data: parsed.data,
			isStale,
			exists: true,
			age
		};
	} catch (e) {
		console.warn('SmartCache get error:', e);
		return { data: null, isStale: true, exists: false };
	}
}

export function setSmartCache(key, data) {
	if (typeof window === 'undefined') return;

	try {
		const payload = {
			data,
			timestamp: Date.now()
		};
		localStorage.setItem(`serviee_sc_${key}`, JSON.stringify(payload));
	} catch (e) {
		console.warn('SmartCache set error (storage full or quota exceeded):', e);
	}
}

export function removeSmartCache(key) {
	if (typeof window === 'undefined') return;

	try {
		localStorage.removeItem(`serviee_sc_${key}`);
	} catch (e) {
		console.warn('SmartCache remove error:', e);
	}
}

export function clearUserSmartCache(userId) {
	if (typeof window === 'undefined') return;

	try {
		const prefix = `serviee_sc_${userId ? `${userId}_` : ''}`;
		const keysToRemove = [];
		for (let i = 0; i < localStorage.length; i++) {
			const k = localStorage.key(i);
			if (k && k.startsWith(prefix)) {
				keysToRemove.push(k);
			}
		}
		for (const k of keysToRemove) {
			localStorage.removeItem(k);
		}
	} catch (e) {
		console.warn('SmartCache clear error:', e);
	}
}
