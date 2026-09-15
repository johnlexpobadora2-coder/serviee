import { db } from '$lib/server/db.js';
import { json } from '@sveltejs/kit';
import { checkRateLimit } from '$lib/server/security.js';

export async function POST({ request, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// 1. Anti-Spam Rate Limit (30 messages per minute per user)
	const rateLimit = checkRateLimit(`chat:${locals.user.id}`, { limit: 30, windowMs: 60000 });
	if (!rateLimit.allowed) {
		return json({ 
			error: `Too many messages sent. Please wait ${rateLimit.retryAfterSeconds}s before sending another message.` 
		}, { status: 429 });
	}

	try {
		const body = await request.json();
		const { jobId, receiverId, content } = body;

		if (!jobId || !receiverId || !content || !content.trim()) {
			return json({ error: 'Missing message parameters.' }, { status: 400 });
		}

		// 2. Self-Messaging Guard
		if (locals.user.id === receiverId) {
			return json({ error: 'You cannot send a message to yourself.' }, { status: 400 });
		}

		// 3. Payload Size Guard (Max 65KB string, sufficient for compressed image payload while preventing abuse)
		if (content.length > 65000) {
			return json({ error: 'Message content exceeds maximum allowed size.' }, { status: 400 });
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
