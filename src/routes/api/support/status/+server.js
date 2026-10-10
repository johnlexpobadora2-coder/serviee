import { db } from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { ticketId, status, markRead } = body;

		if (!ticketId) {
			return json({ error: 'Missing ticketId' }, { status: 400 });
		}

		const ticket = await db.support.getTicketById(ticketId);
		if (!ticket) {
			return json({ error: 'Ticket not found' }, { status: 404 });
		}

		if (ticket.user_id !== locals.user.id) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		if (markRead) {
			await db.support.markAsRead(ticketId, 'user');
		}

		if (status && ['open', 'resolved', 'closed'].includes(status)) {
			await db.support.updateTicketStatus(ticketId, status);
		}

		return json({ success: true });
	} catch (error) {
		console.error('API support status error:', error);
		return json({ error: error.message || 'Failed to update support status' }, { status: 500 });
	}
}
