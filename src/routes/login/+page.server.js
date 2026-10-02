import { db, hashPassword } from '$lib/server/db.js';
import { createSignedSession } from '$lib/server/session.js';
import { checkRateLimit, resetRateLimit, getClientIp, sanitizeInput } from '$lib/server/security.js';
import { redirect, fail } from '@sveltejs/kit';

export function load({ locals, url }) {
	// If already logged in, redirect to appropriate page
	if (locals.user) {
		if (locals.user.role === 'customer') {
			throw redirect(303, '/customer');
		} else {
			throw redirect(303, '/worker');
		}
	}
	const deleted = url.searchParams.get('deleted') === 'true';
	return { deleted };
}

export const actions = {
	default: async (event) => {
		const { request, cookies } = event;
		const clientIp = getClientIp(event);

		// 1. Check Rate Limit (Max 10 login attempts per minute per IP)
		const rateCheck = checkRateLimit(`login:${clientIp}`, { limit: 10, windowMs: 60 * 1000 });
		if (!rateCheck.allowed) {
			console.warn(`[RATE LIMIT] Rate limit exceeded for IP: ${clientIp} on login.`);
			return fail(429, {
				error: `Too many login attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
				email: ''
			});
		}

		const data = await request.formData();
		const rawEmail = data.get('email')?.toString().trim();
		const email = sanitizeInput(rawEmail);
		const password = data.get('password')?.toString();

		console.log('--- LOGIN SUBMISSION ---');
		console.log('Email:', email, '| IP:', clientIp);

		if (!email || !password) {
			console.warn('[WARN] Validation failed: Missing email or password.');
			return fail(400, { error: 'Please enter your email and password.', email });
		}

		try {
			console.log('Calling db.users.findAllByEmail...');
			const users = await db.users.findAllByEmail(email);

			if (!users || users.length === 0) {
				console.warn('[WARN] User not found in database:', email);
				return fail(400, { error: 'Incorrect email or password. Please try again.', email });
			}

			console.log('Users found for email:', users.length, 'Comparing password hashes...');
			const inputHash = hashPassword(password);
			const matchingUser = users.find(u => u.password_hash === inputHash);

			if (!matchingUser) {
				console.warn('[WARN] Password hash mismatch for user accounts under email:', email);
				return fail(400, { error: 'Incorrect email or password. Please try again.', email });
			}

			// Successful authentication: Reset rate limit
			resetRateLimit(`login:${clientIp}`);

			console.log('[SUCCESS] Authentication successful! User ID:', matchingUser.id, 'Role:', matchingUser.role);

			// Set cryptographically signed session cookie (expires in 7 days)
			const signedToken = createSignedSession(matchingUser.id, matchingUser.token_version || 1);
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
			
			console.error('[ERROR] Login failed with error:', error);
			return fail(400, { 
				error: error.message || 'An error occurred during log in.', 
				email 
			});
		}
	}
};

