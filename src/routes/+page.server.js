import { db } from '$lib/server/db.js';

export async function load({ locals }) {
	const stats = await db.stats.getHomepageStats();

	return {
		stats
	};
}

