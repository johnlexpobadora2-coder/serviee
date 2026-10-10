import { db } from '$lib/server/db.js';
import { verifyAdminSessionToken } from '$lib/server/session.js';
import { json } from '@sveltejs/kit';

export async function GET({ url, cookies }) {
	const adminToken = cookies.get('admin_session');
	if (!verifyAdminSessionToken(adminToken)) {
		return json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
	}

	const ticketId = url.searchParams.get('ticketId');

	try {
		if (ticketId) {
			// Mark ticket as read by admin
			await db.support.markAsRead(ticketId, 'admin');

			const ticket = await db.support.getTicketById(ticketId);
			const messages = await db.support.listMessagesForTicket(ticketId);

			return json({ success: true, ticket, messages });
		}

		// If no ticketId, fetch all tickets with hydrated user info for admin
		const supportTickets = await db.support.listAllTickets();

		const userIds = new Set();
		supportTickets.forEach(t => {
			if (t.user_id) userIds.add(t.user_id);
		});

		const userMap = await db.users.findByIds(Array.from(userIds)).catch(() => new Map());

		const hydratedSupportTickets = supportTickets.map(t => {
			const u = userMap.get(t.user_id);
			return {
				...t,
				user_avatar: u?.avatar || null,
				user_name: u?.name || t.user_name || 'Serviee User',
				user_email: u?.email || t.user_email || '',
				user_phone: u?.phone || '',
				user_role: u?.role || t.user_role || 'customer'
			};
		});

		return json({ success: true, tickets: hydratedSupportTickets });
	} catch (error) {
		console.error('Error in admin support API GET (/admin05/api/support):', error);
		return json({ error: error.message || 'Failed to fetch support data' }, { status: 500 });
	}
}

export async function POST({ request, cookies }) {
	const adminToken = cookies.get('admin_session');
	if (!verifyAdminSessionToken(adminToken)) {
		return json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { action, ticketId, content, status } = body;

		if (!ticketId) {
			return json({ error: 'Ticket ID is required.' }, { status: 400 });
		}

		if (action === 'reply') {
			if (!content || !content.trim()) {
				return json({ error: 'Reply content cannot be empty.' }, { status: 400 });
			}

			const sentMessage = await db.support.sendMessage({
				ticketId,
				senderType: 'admin',
				senderId: 'admin_master',
				senderName: 'Serviee Support Team',
				content: content.trim()
			});

			return json({ success: true, message: sentMessage });
		}

		if (action === 'status') {
			if (!status) {
				return json({ error: 'Status is required.' }, { status: 400 });
			}

			await db.support.updateTicketStatus(ticketId, status);
			return json({ success: true, status });
		}

		if (action === 'delete') {
			await db.support.deleteTicket(ticketId);
			return json({ success: true, deletedId: ticketId });
		}

		return json({ error: 'Invalid action.' }, { status: 400 });
	} catch (error) {
		console.error('Error in admin support API POST (/admin05/api/support):', error);
		return json({ error: error.message || 'Failed to perform support action.' }, { status: 500 });
	}
}
