import { db } from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export async function GET({ locals, url }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const jobId = url.searchParams.get('jobId');
		const otherUserId = url.searchParams.get('otherUserId');
		const limit = parseInt(url.searchParams.get('limit') || '10', 10);
		const before = url.searchParams.get('before') || null;

		if (jobId && otherUserId) {
			const threadResult = await db.messages.listForThread(jobId, locals.user.id, otherUserId, limit, before);
			return json(threadResult);
		}

		const conversations = await db.messages.listConversationsForUser(locals.user.id);
		return json({ conversations });
	} catch (error) {
		return json({ error: error.message || 'Failed to fetch messages' }, { status: 500 });
	}
}
