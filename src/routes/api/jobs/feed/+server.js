import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';

export async function GET({ url, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)));
	const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));
	const category = url.searchParams.get('category') || '';
	const location = url.searchParams.get('location') || '';
	const minBudget = url.searchParams.get('minBudget');
	const maxBudget = url.searchParams.get('maxBudget');
	const search = url.searchParams.get('search') || '';
	const sortBy = url.searchParams.get('sortBy') || 'newest';

	// Feed only shows 'open' jobs (assigned, in_progress, completed jobs are hidden from feed)
	const isWorker = locals.user.role === 'worker';
	const status = 'open';

	try {
		const result = await db.jobs.listFeedPaginated({
			limit,
			offset,
			status,
			category,
			location,
			minBudget,
			maxBudget,
			search,
			sortBy,
			workerId: isWorker ? locals.user.id : null
		});

		// Fetch available locations if this is the first page
		let availableLocations = [];
		if (offset === 0) {
			availableLocations = await db.jobs.getAvailableLocations(status);
		}

		return json({
			jobs: result.jobs,
			totalCount: result.totalCount,
			hasMore: result.hasMore,
			availableLocations
		});
	} catch (err) {
		console.error('Error in /api/jobs/feed:', err);
		return json({ error: err.message || 'Failed to fetch job feed' }, { status: 500 });
	}
}
