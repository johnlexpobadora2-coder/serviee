import { db } from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export async function GET({ url, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const ticketId = url.searchParams.get('ticketId');

	try {
		if (ticketId) {
			const ticket = await db.support.getTicketById(ticketId);
			if (!ticket) {
				return json({ error: 'Ticket not found' }, { status: 404 });
			}

			// Verify user ownership
			if (ticket.user_id !== locals.user.id) {
				return json({ error: 'Forbidden' }, { status: 403 });
			}

			// Mark unread_user as false when user views thread
			await db.support.markAsRead(ticketId, 'user');

			const messages = await db.support.listMessagesForTicket(ticketId);
			return json({ success: true, ticket, messages });
		}

		// List all tickets for current user
		const tickets = await db.support.listTicketsForUser(locals.user.id);
		return json({ success: true, tickets });
	} catch (error) {
		console.error('Error fetching support tickets:', error);
		return json({ error: error.message || 'Failed to fetch support data' }, { status: 500 });
	}
}
