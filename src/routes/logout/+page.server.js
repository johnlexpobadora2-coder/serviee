import { redirect } from '@sveltejs/kit';

export function load({ cookies }) {
	// Clear the session cookie
	cookies.delete('session_id', { path: '/' });
	
	// Redirect back to landing page
	throw redirect(303, '/');
}
