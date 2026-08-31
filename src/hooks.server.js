import { db } from '$lib/server/db.js';

export async function handle({ event, resolve }) {
	const sessionId = event.cookies.get('session_id');
	
	if (sessionId) {
		const user = await db.users.findById(sessionId);
		if (user) {
			// Strip password hash for security before attaching it to locals
			const { password_hash, ...safeUser } = user;
			event.locals.user = safeUser;
		} else {
			event.locals.user = null;
		}
	} else {
		event.locals.user = null;
	}

	return await resolve(event);
}
