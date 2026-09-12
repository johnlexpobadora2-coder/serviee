// Svelte 5 Rune-based Reactive Saved Jobs Store
import { browser } from '$app/environment';

function getStorageKey(userId) {
	return userId ? `serviee_saved_jobs_${userId}` : 'serviee_saved_jobs_v1';
}

function createSavedJobsStore() {
	let list = $state([]);
	let isDrawerOpen = $state(false);
	let isSyncing = $state(false);
	let isInitialized = $state(false);
	let currentUserId = $state(null);

	// Derived Set of saved job IDs for fast O(1) reactivity
	const savedIds = $derived(new Set(list.map((item) => String(item.id))));
	const count = $derived(list.length);

	function persist() {
		if (!browser) return;
		try {
			const key = getStorageKey(currentUserId);
			localStorage.setItem(key, JSON.stringify(list));
		} catch (e) {
			console.warn('Failed to save jobs to localStorage:', e);
		}
	}

	function loadFromLocalStorage(userId) {
		if (!browser) return [];
		try {
			const key = getStorageKey(userId);
			const stored = localStorage.getItem(key) || localStorage.getItem('serviee_saved_jobs_v1');
			if (stored) {
				const parsed = JSON.parse(stored);
				if (Array.isArray(parsed)) {
					return parsed;
				}
			}
		} catch (e) {
			console.warn('Failed to load saved jobs from localStorage:', e);
		}
		return [];
	}

	async function syncWithServer() {
		if (!browser) return;
		try {
			isSyncing = true;
			const res = await fetch('/api/jobs/saved');
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data.savedJobs)) {
					list = data.savedJobs;
					persist();
				}
			} else {
				console.warn('Server responded with status:', res.status);
			}
		} catch (e) {
			console.warn('Failed to sync saved jobs with server:', e);
		} finally {
			isSyncing = false;
		}
	}

	return {
		get list() {
			return list;
		},
		get count() {
			return count;
		},
		get isDrawerOpen() {
			return isDrawerOpen;
		},
		set isDrawerOpen(val) {
			isDrawerOpen = val;
		},
		get isSyncing() {
			return isSyncing;
		},
		get isInitialized() {
			return isInitialized;
		},
		init(userId = null, initialList = null) {
			if (!browser) return;
			currentUserId = userId;

			if (Array.isArray(initialList) && initialList.length > 0) {
				list = initialList;
				persist();
				isInitialized = true;
				return;
			}

			// Try local storage first
			const local = loadFromLocalStorage(userId);
			if (local.length > 0) {
				list = local;
			} else if (Array.isArray(initialList)) {
				list = initialList;
			}

			isInitialized = true;

			// Sync with server in background
			syncWithServer();
		},
		setInitial(serverList, userId = null) {
			if (!browser) return;
			if (userId) currentUserId = userId;
			if (Array.isArray(serverList)) {
				list = serverList;
				persist();
				isInitialized = true;
			}
		},
		openDrawer() {
			isDrawerOpen = true;
		},
		closeDrawer() {
			isDrawerOpen = false;
		},
		toggleDrawer() {
			isDrawerOpen = !isDrawerOpen;
		},
		isSaved(jobId) {
			if (!jobId) return false;
			return savedIds.has(String(jobId));
		},
		toggle(job) {
			if (!job || !job.id) return false;

			const targetId = String(job.id);
			const exists = savedIds.has(targetId);
			let willBeSaved = false;

			if (exists) {
				list = list.filter((item) => String(item.id) !== targetId);
				willBeSaved = false;
			} else {
				// Store essential fields to keep size light and snappy
				const savedItem = {
					id: job.id,
					title: job.title || 'Untitled Job',
					description: job.description || '',
					category: job.category || 'Others',
					budget: Number(job.budget) || 0,
					location: job.location || 'Unknown Location',
					latitude: job.latitude || null,
					longitude: job.longitude || null,
					customer_id: job.customer_id || null,
					customerName: job.customerName || 'Client',
					target_date: job.target_date || new Date().toISOString(),
					created_at: job.created_at || new Date().toISOString(),
					savedAt: Date.now()
				};
				list = [savedItem, ...list];
				willBeSaved = true;
			}
			persist();

			// Background server sync
			if (browser) {
				fetch('/api/jobs/saved', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ job })
				}).catch((err) => {
					console.warn('Failed to toggle saved job on server:', err);
				});
			}

			return willBeSaved;
		},
		remove(jobId) {
			if (!jobId) return;
			const targetId = String(jobId);
			list = list.filter((item) => String(item.id) !== targetId);
			persist();

			if (browser) {
				fetch(`/api/jobs/saved?jobId=${encodeURIComponent(jobId)}`, {
					method: 'DELETE'
				}).catch((err) => {
					console.warn('Failed to delete saved job on server:', err);
				});
			}
		},
		clear() {
			list = [];
			persist();

			if (browser) {
				fetch('/api/jobs/saved', {
					method: 'DELETE'
				}).catch((err) => {
					console.warn('Failed to clear saved jobs on server:', err);
				});
			}
		},
		refresh() {
			syncWithServer();
		}
	};
}

export const savedJobs = createSavedJobsStore();

