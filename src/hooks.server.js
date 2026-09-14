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

	const response = await resolve(event);

	// Security Hardening Headers
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
	
	// Content Security Policy tailored for SvelteKit, Leaflet OpenStreetMap tiles & embeds, Google Fonts, and Supabase Realtime
	const csp = [
		"default-src 'self'",
		"connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org https://unpkg.com",
		"img-src 'self' data: blob: https://*.supabase.co https://*.tile.openstreetmap.org https://*.openstreetmap.org https://images.unsplash.com https://unpkg.com",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
		"font-src 'self' https://fonts.gstatic.com data:",
		"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
		"frame-src 'self' https://www.openstreetmap.org https://*.openstreetmap.org",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'"
	].join('; ');

	response.headers.set('Content-Security-Policy', csp);

	return response;
}

