import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';

export async function POST({ request, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const maskPhone = Boolean(body.mask_phone);

		const updated = await db.users.updateProfile(locals.user.id, {
			mask_phone: maskPhone
		});

		if (updated) {
			const { password_hash, ...safeUser } = updated;
			locals.user = safeUser;
		}

		return json({
			success: true,
			mask_phone: maskPhone,
			user: locals.user
		});
	} catch (err) {
		console.error('Error updating phone privacy:', err);
		return json({ error: err.message || 'Failed to update phone privacy' }, { status: 500 });
	}
}
