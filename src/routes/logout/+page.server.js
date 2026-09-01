import { redirect } from '@sveltejs/kit';

/** @param {{ cookies: import('@sveltejs/kit').Cookies }} event */
function logout({ cookies }) {
	cookies.delete('session_id', { path: '/' });
	throw redirect(303, '/login');
}

export const actions = {
	default: async ({ cookies }) => {
		logout({ cookies });
	}
};

export function load({ cookies }) {
	logout({ cookies });
}

