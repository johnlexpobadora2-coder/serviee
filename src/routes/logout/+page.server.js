import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';

/** @param {{ cookies: import('@sveltejs/kit').Cookies, locals: App.Locals }} event */
async function logout({ cookies, locals }) {
	if (locals?.sessionId) {
		await db.sessions.deleteBySessionId(locals.sessionId).catch(() => {});
	}
	cookies.delete('session_id', { path: '/' });
	throw redirect(303, '/login');
}

export const actions = {
	default: async ({ cookies, locals }) => {
		await logout({ cookies, locals });
	}
};

export async function load({ cookies, locals }) {
	await logout({ cookies, locals });
}

