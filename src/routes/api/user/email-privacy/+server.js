import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';

export async function POST({ request, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const maskEmail = Boolean(body.mask_email);

		const updated = await db.users.updateProfile(locals.user.id, {
			mask_email: maskEmail
		});

		if (updated) {
			const { password_hash, ...safeUser } = updated;
			locals.user = safeUser;
		}

		return json({
			success: true,
			mask_email: maskEmail,
			user: locals.user
		});
	} catch (err) {
		console.error('Error updating email privacy:', err);
		return json({ error: err.message || 'Failed to update email privacy' }, { status: 500 });
	}
}
