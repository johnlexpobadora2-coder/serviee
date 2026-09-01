import { db } from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export async function GET({ locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const conversations = await db.messages.listConversationsForUser(locals.user.id);
		return json({ conversations });
	} catch (error) {
		return json({ error: error.message || 'Failed to fetch messages' }, { status: 500 });
	}
}
