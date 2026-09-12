import { db, hashPassword } from '$lib/server/db.js';
import { createSignedSession } from '$lib/server/session.js';
import { redirect, fail } from '@sveltejs/kit';

export function load({ locals }) {
	// If already logged in, redirect to appropriate page
	if (locals.user) {
		if (locals.user.role === 'customer') {
			throw redirect(303, '/customer');
		} else {
			throw redirect(303, '/worker');
		}
	}
	return {};
}

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim();
		const password = data.get('password')?.toString();

		console.log('--- LOGIN SUBMISSION ---');
		console.log('Email:', email);

		if (!email || !password) {
			console.warn('⚠️ Validation failed: Missing email or password.');
			return fail(400, { error: 'Please enter your email and password.', email });
		}

		try {
			console.log('Calling db.users.findAllByEmail...');
			const users = await db.users.findAllByEmail(email);

			if (!users || users.length === 0) {
				console.warn('⚠️ User not found in database:', email);
				return fail(400, { error: 'Incorrect email or password. Please try again.', email });
			}

			console.log('Users found for email:', users.length, 'Comparing password hashes...');
			const inputHash = hashPassword(password);
			const matchingUser = users.find(u => u.password_hash === inputHash);

			if (!matchingUser) {
				console.warn('⚠️ Password hash mismatch for user accounts under email:', email);
				return fail(400, { error: 'Incorrect email or password. Please try again.', email });
			}

			console.log('✅ Authentication successful! User ID:', matchingUser.id, 'Role:', matchingUser.role);

			// Set cryptographically signed session cookie (expires in 7 days)
			const signedToken = createSignedSession(matchingUser.id);
			cookies.set('session_id', signedToken, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: process.env.NODE_ENV === 'production',
				maxAge: 60 * 60 * 24 * 7
			});

			console.log('Session cookie set. Redirecting to dashboard...');
			// Redirect based on role
			if (matchingUser.role === 'customer') {
				throw redirect(303, '/customer');
			} else {
				throw redirect(303, '/worker');
			}
		} catch (error) {
			// Catch SvelteKit redirect exceptions to propagate them
			if (error.status === 303) {
				console.log('Redirecting user...');
				throw error;
			}
			
			console.error('❌ Login failed with error:', error);
			return fail(400, { 
				error: error.message || 'An error occurred during log in.', 
				email 
			});
		}
	}
};
