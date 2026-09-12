import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';

export async function GET({ locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const savedList = await db.savedJobs.listByUser(locals.user.id);
		return json({ savedJobs: savedList });
	} catch (err) {
		console.error('Error fetching saved jobs:', err);
		return json({ error: err.message || 'Failed to fetch saved jobs' }, { status: 500 });
	}
}

export async function POST({ request, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { job } = body;
		if (!job || !job.id) {
			return json({ error: 'Job data with valid ID is required' }, { status: 400 });
		}

		const result = await db.savedJobs.toggle(locals.user.id, job);
		return json({ success: true, isSaved: result.isSaved });
	} catch (err) {
		console.error('Error toggling saved job:', err);
		return json({ error: err.message || 'Failed to toggle saved job' }, { status: 500 });
	}
}

export async function DELETE({ url, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const jobId = url.searchParams.get('jobId');

	try {
		if (jobId) {
			await db.savedJobs.remove(locals.user.id, jobId);
		} else {
			await db.savedJobs.clearByUser(locals.user.id);
		}
		return json({ success: true });
	} catch (err) {
		console.error('Error removing saved job:', err);
		return json({ error: err.message || 'Failed to remove saved job' }, { status: 500 });
	}
}
