import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';

export async function POST({ request, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { jobId, otherUserId } = await request.json();

		if (!jobId || !otherUserId) {
			return json({ error: 'Job ID and Other User ID are required' }, { status: 400 });
		}

		const result = await db.messages.deleteConversationForUser(locals.user.id, jobId, otherUserId);
		return json(result);
	} catch (err) {
		console.error('Error in /api/conversations/delete:', err);
		return json({ error: err.message || 'Failed to delete conversation' }, { status: 500 });
	}
}
