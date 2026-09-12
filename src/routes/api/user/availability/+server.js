import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';

export async function POST({ request, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const rawStatus = body.availability_status;
		const status = rawStatus === 'busy' ? 'busy' : 'available';

		const updated = await db.users.updateProfile(locals.user.id, {
			availability_status: status
		});

		if (updated) {
			const { password_hash, ...safeUser } = updated;
			locals.user = safeUser;
		}

		return json({
			success: true,
			availability_status: status,
			user: locals.user
		});
	} catch (err) {
		console.error('Error updating availability status:', err);
		return json({ error: err.message || 'Failed to update availability' }, { status: 500 });
	}
}
