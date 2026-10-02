import { db, hashPassword } from '$lib/server/db.js';
import { createSignedSession } from '$lib/server/session.js';
import { checkRateLimit, resetRateLimit, getClientIp, sanitizeInput } from '$lib/server/security.js';
import { redirect, fail } from '@sveltejs/kit';
import { validateGmail, validatePassword, validatePhone } from '$lib/validation.js';

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
	default: async (event) => {
		const { request, cookies } = event;
		const clientIp = getClientIp(event);

		// Rate Limiter: Max 5 registration attempts per 2 minutes per IP
		const rateCheck = checkRateLimit(`register:${clientIp}`, { limit: 5, windowMs: 120 * 1000 });
		if (!rateCheck.allowed) {
			console.warn(`[RATE LIMIT] Rate limit exceeded for IP: ${clientIp} on register.`);
			return fail(429, {
				error: `Too many registration attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
				name: '', email: '', phone: '', role: '', address: ''
			});
		}

		const data = await request.formData();
		const rawName = data.get('name')?.toString().trim();
		const rawEmail = data.get('email')?.toString().trim();
		const rawPhone = data.get('phone')?.toString().trim();
		const rawRole = data.get('role')?.toString().trim();
		const rawAddress = data.get('address')?.toString().trim();
		const password = data.get('password')?.toString();

		const name = sanitizeInput(rawName);
		const email = sanitizeInput(rawEmail);
		const phone = sanitizeInput(rawPhone);
		const role = sanitizeInput(rawRole);
		const address = sanitizeInput(rawAddress);

		if (!name || !email || !phone || !role || !address || !password) {
			return fail(400, { 
				error: 'Please complete all fields.', 
				name, email, phone, role, address 
			});
		}

		const emailValidation = validateGmail(email);
		if (!emailValidation.isValid) {
			return fail(400, {
				error: emailValidation.error,
				name, email, phone, role, address
			});
		}

		const phoneValidation = validatePhone(phone);
		if (!phoneValidation.isValid) {
			return fail(400, {
				error: phoneValidation.error,
				name, email, phone, role, address
			});
		}

		const passwordValidation = validatePassword(password);
		if (!passwordValidation.isValid) {
			return fail(400, { 
				error: passwordValidation.error, 
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

			resetRateLimit(`register:${clientIp}`);

			const signedToken = createSignedSession(newUser.id, newUser.token_version || 1);
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
			console.error('[ERROR] Registration failed:', error);
			return fail(400, {
				error: error.message || 'An error occurred while creating your account.',
				name, email, phone, role, address
			});
		}
	}
};

