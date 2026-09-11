import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';

export async function GET({ locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const conversations = await db.messages.listConversationsForUser(locals.user.id, locals.user);
		return json({ conversations });
	} catch (err) {
		console.error('Error in /api/conversations:', err);
		return json({ error: err.message || 'Failed to fetch conversations' }, { status: 500 });
	}
}
