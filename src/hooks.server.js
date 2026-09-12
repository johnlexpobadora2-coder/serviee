import { db } from '$lib/server/db.js';
import { verifySignedSession } from '$lib/server/session.js';

export async function handle({ event, resolve }) {
	const sessionToken = event.cookies.get('session_id');
	
	if (sessionToken) {
		const userId = verifySignedSession(sessionToken);
		if (userId) {
			const user = await db.users.findById(userId);
			if (user) {
				// Strip password hash for security before attaching it to locals
				const { password_hash, ...safeUser } = user;
				event.locals.user = safeUser;
			} else {
				event.locals.user = null;
			}
		} else {
			// Invalid or forged token
			event.locals.user = null;
		}
	} else {
		event.locals.user = null;
	}

	return await resolve(event);
}

