import { db } from '$lib/server/db.js';
import { verifySignedSession } from '$lib/server/session.js';

export async function handle({ event, resolve }) {
	const sessionToken = event.cookies.get('session_id');
	
	if (sessionToken) {
		const sessionInfo = verifySignedSession(sessionToken);
		if (sessionInfo && sessionInfo.userId) {
			const user = await db.users.findById(sessionInfo.userId);
			const expectedVersion = user?.token_version || 1;
			if (user && sessionInfo.tokenVersion === expectedVersion) {
				// Strip password hash for security before attaching it to locals
				const { password_hash, ...safeUser } = user;
				event.locals.user = safeUser;
			} else {
				// Version mismatch (revoked session) or user deleted
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

