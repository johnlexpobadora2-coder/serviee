import { db } from '$lib/server/db.js';
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
	const role = url.searchParams.get('role') || '';
	return { role };
}

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const email = data.get('email')?.toString().trim();
		const phone = data.get('phone')?.toString().trim();
		const role = data.get('role')?.toString().trim();
		const address = data.get('address')?.toString().trim();
		const password = data.get('password')?.toString();

		console.log('--- REGISTRATION SUBMISSION ---');
		console.log('Name:', name);
		console.log('Email:', email);
		console.log('Role:', role);
		console.log('Phone:', phone);
		console.log('Address:', address);

		// Basic validation
		if (!name || !email || !phone || !role || !address || !password) {
			console.warn('⚠️ Validation failed: Missing fields.');
			return fail(400, { error: 'Please complete all fields.', name, email, phone, role, address });
		}

		if (password.length < 6) {
			console.warn('⚠️ Validation failed: Password too short.');
			return fail(400, { error: 'Password must be at least 6 characters.', name, email, phone, role, address });
		}

		if (role !== 'customer' && role !== 'worker') {
			console.warn('⚠️ Validation failed: Invalid role.');
			return fail(400, { error: 'Invalid role selection.', name, email, phone, role, address });
		}

		try {
			console.log('Calling db.users.create...');
			const newUser = await db.users.create({
				name,
				email,
				phone,
				role,
				address,
				password
			});
			console.log('✅ User successfully created with ID:', newUser.id);

			// Set session cookie (expires in 7 days)
			cookies.set('session_id', newUser.id, {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				maxAge: 60 * 60 * 24 * 7
			});

			console.log('Session cookie set. Redirecting to dashboard...');
			// Redirect based on role
			if (role === 'customer') {
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
			
			console.error('❌ Registration failed with DB error:', error);
			return fail(400, { 
				error: error.message || 'An error occurred during registration.', 
				name, email, phone, role, address 
			});
		}
	}
};
