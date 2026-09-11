import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';

export async function GET({ url, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)));
	const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));

	try {
		if (locals.user.role === 'customer') {
			const result = await db.jobs.listCustomerActivePaginated({
				customerId: locals.user.id,
				limit,
				offset
			});
			return json(result);
		} else if (locals.user.role === 'worker') {
			const result = await db.jobs.listWorkerActivePaginated({
				workerId: locals.user.id,
				limit,
				offset
			});
			return json(result);
		} else {
			return json({ jobs: [], totalCount: 0, hasMore: false });
		}
	} catch (err) {
		console.error('Error in /api/jobs/active:', err);
		return json({ error: err.message || 'Failed to fetch active jobs' }, { status: 500 });
	}
}
