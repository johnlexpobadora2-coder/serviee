import { db } from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { jobId, receiverId, content } = body;

		if (!jobId || !receiverId || !content || !content.trim()) {
			return json({ error: 'Missing message parameters.' }, { status: 400 });
		}

		const message = await db.messages.send({
			job_id: jobId,
			sender_id: locals.user.id,
			receiver_id: receiverId,
			content: content.trim()
		});

		return json({ success: true, message });
	} catch (error) {
		console.error('API send message error:', error);
		return json({ error: error.message || 'Failed to send message.' }, { status: 500 });
	}
}
