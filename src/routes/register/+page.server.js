import { db, hashPassword } from '$lib/server/db.js';
import { createSignedSession } from '$lib/server/session.js';
import { redirect, fail } from '@sveltejs/kit';

export function load({ locals, url }) {
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

		if (!name || !email || !phone || !role || !address || !password) {
			return fail(400, { 
				error: 'Please complete all fields.', 
				name, email, phone, role, address 
			});
		}

		if (password.length < 6) {
			return fail(400, { 
				error: 'Password must be at least 6 characters.', 
				name, email, phone, role, address 
			});
		}

		if (role !== 'customer' && role !== 'worker') {
			return fail(400, { 
				error: 'Invalid role selection.', 
				name, email, phone, role, address 
			});
		}

		try {
			const normalizedEmail = email.toLowerCase().trim();
			const existingUsers = await db.users.findAllByEmail(normalizedEmail);

			const sameRoleUser = existingUsers.find(u => u.role === role);
			if (sameRoleUser) {
				return fail(400, {
					error: `This email is already registered as a ${role === 'customer' ? 'Client' : 'Worker'}.`,
					name, email, phone, role, address
				});
			}

			const passwordHash = hashPassword(password);
			const samePasswordUser = existingUsers.find(u => u.password_hash === passwordHash);
			if (samePasswordUser) {
				return fail(400, {
					error: 'For security, you cannot use the same password as your other account with this email.',
					name, email, phone, role, address
				});
			}

			const newUser = await db.users.create({
				name,
				email: normalizedEmail,
				phone,
				role,
				address,
				password
			});

			const signedToken = createSignedSession(newUser.id);
			cookies.set('session_id', signedToken, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: process.env.NODE_ENV === 'production',
				maxAge: 60 * 60 * 24 * 7
			});

			if (newUser.role === 'customer') {
				throw redirect(303, '/customer');
			} else {
				throw redirect(303, '/worker');
			}
		} catch (error) {
			if (error.status === 303) throw error;
			console.error('❌ Registration failed:', error);
			return fail(400, {
				error: error.message || 'An error occurred while creating your account.',
				name, email, phone, role, address
			});
		}
	}
};
