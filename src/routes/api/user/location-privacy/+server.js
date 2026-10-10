import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';

export async function POST({ request, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const hideLocation = Boolean(body.hide_location);

		const updated = await db.users.updateProfile(locals.user.id, {
			hide_location: hideLocation
		});

		if (updated) {
			const { password_hash, ...safeUser } = updated;
			locals.user = safeUser;
		}

		return json({
			success: true,
			hide_location: hideLocation,
			user: locals.user
		});
	} catch (err) {
		console.error('Error updating location privacy:', err);
		return json({ error: err.message || 'Failed to update location privacy' }, { status: 500 });
	}
}
