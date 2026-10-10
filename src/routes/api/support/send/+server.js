import { db } from '$lib/server/db.js';
import { json } from '@sveltejs/kit';
import { checkRateLimit } from '$lib/server/security.js';

export async function POST({ request, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Rate limit: 20 messages per minute per user for support
	const rateLimit = checkRateLimit(`support:${locals.user.id}`, { limit: 20, windowMs: 60000 });
	if (!rateLimit.allowed) {
		return json({ 
			error: `Too many support messages sent. Please wait ${rateLimit.retryAfterSeconds}s before sending another.` 
		}, { status: 429 });
	}

	try {
		const body = await request.json();
		const { ticketId, category, subject, content } = body;

		if (!content || !content.trim()) {
			return json({ error: 'Message content cannot be empty.' }, { status: 400 });
		}

		if (content.length > 500000) {
			return json({ error: 'Message exceeds maximum size.' }, { status: 400 });
		}

		let targetTicketId = ticketId;
		let ticket = null;

		if (!targetTicketId) {
			// Create a new support ticket
			ticket = await db.support.createTicket({
				userId: locals.user.id,
				userName: locals.user.name || 'Serviee User',
				userEmail: locals.user.email || '',
				userRole: locals.user.role || 'customer',
				category: category || 'general',
				subject: subject || 'General Inquiry',
				initialMessage: content.trim()
			});
			targetTicketId = ticket.id;

			const messages = await db.support.listMessagesForTicket(targetTicketId);
			return json({
				success: true,
				ticket,
				message: messages[messages.length - 1] || null
			});
		} else {
			ticket = await db.support.getTicketById(targetTicketId);
			if (!ticket) {
				return json({ error: 'Support ticket not found.' }, { status: 404 });
			}

			if (ticket.user_id !== locals.user.id) {
				return json({ error: 'Forbidden' }, { status: 403 });
			}

			const message = await db.support.sendMessage({
				ticketId: targetTicketId,
				senderType: 'user',
				senderId: locals.user.id,
				senderName: locals.user.name || 'User',
				content: content.trim()
			});

			return json({
				success: true,
				ticket,
				message
			});
		}
	} catch (error) {
		console.error('API support send error:', error);
		return json({ error: error.message || 'Failed to send support inquiry.' }, { status: 500 });
	}
}
