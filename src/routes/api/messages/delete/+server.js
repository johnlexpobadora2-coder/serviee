import { db } from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { messageId } = body;

		if (!messageId) {
			return json({ error: 'Missing messageId parameter.' }, { status: 400 });
		}

		await db.messages.delete(messageId, locals.user.id);
		return json({ success: true });
	} catch (error) {
		console.error('API delete message error:', error);
		return json({ error: error.message || 'Failed to delete message.' }, { status: 500 });
	}
}
