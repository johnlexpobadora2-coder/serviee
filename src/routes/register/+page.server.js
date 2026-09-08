import { db, hashPassword } from '$lib/server/db.js';
import { createAndSendOtp, verifyOtp } from '$lib/server/otp.js';
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
	sendOtp: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const email = data.get('email')?.toString().trim();
		const phone = data.get('phone')?.toString().trim();
		const role = data.get('role')?.toString().trim();
		const address = data.get('address')?.toString().trim();
		const password = data.get('password')?.toString();

		console.log('--- REGISTRATION OTP REQUEST ---');
		console.log('Name:', name);
		console.log('Email:', email);
		console.log('Role:', role);

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
			// Check if account already exists with same role
			const normalizedEmail = email.toLowerCase().trim();
			const existingUsers = await db.users.findAllByEmail(normalizedEmail);

			const sameRoleUser = existingUsers.find(u => u.role === role);
			if (sameRoleUser) {
				return fail(400, {
					error: `This email is already registered as a ${role === 'customer' ? 'Client' : 'Worker'}.`,
					name, email, phone, role, address
				});
			}

			// Check password against other role accounts for the same email
			const passwordHash = hashPassword(password);
			const samePasswordUser = existingUsers.find(u => u.password_hash === passwordHash);
			if (samePasswordUser) {
				return fail(400, {
					error: 'For security, you cannot use the same password as your other account with this email.',
					name, email, phone, role, address
				});
			}

			// Generate and send OTP via Nodemailer
			await createAndSendOtp({
				email: normalizedEmail,
				type: 'registration',
				metadata: { name, email: normalizedEmail, phone, role, address, password },
				name
			});

			return {
				success: true,
				step: 'otp',
				email: normalizedEmail,
				name,
				phone,
				role,
				address
			};
		} catch (err) {
			console.error('❌ Failed to send registration OTP:', err);
			return fail(400, {
				error: err.message || 'Failed to send verification code. Please try again.',
				name, email, phone, role, address
			});
		}
	},

	verifyOtp: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim();
		const otp = data.get('otp')?.toString().trim();
		const name = data.get('name')?.toString().trim();
		const phone = data.get('phone')?.toString().trim();
		const role = data.get('role')?.toString().trim();
		const address = data.get('address')?.toString().trim();
		const password = data.get('password')?.toString();

		console.log('--- VERIFYING REGISTRATION OTP ---');
		console.log('Email:', email);
		console.log('Entered OTP:', otp);

		if (!email || !otp) {
			return fail(400, {
				error: 'Please enter the 6-digit verification code.',
				step: 'otp',
				email, name, phone, role, address
			});
		}

		const verification = verifyOtp({ email, otp, type: 'registration' });
		if (!verification.valid) {
			return fail(400, {
				error: verification.error,
				step: 'otp',
				email, name, phone, role, address
			});
		}

		// Pull data from metadata or form payload
		const regData = verification.metadata || { name, email, phone, role, address, password };

		try {
			console.log('Creating user in DB...');
			const newUser = await db.users.create({
				name: regData.name,
				email: regData.email,
				phone: regData.phone,
				role: regData.role,
				address: regData.address,
				password: regData.password
			});

			console.log('✅ User created! ID:', newUser.id);

			cookies.set('session_id', newUser.id, {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				maxAge: 60 * 60 * 24 * 7
			});

			if (newUser.role === 'customer') {
				throw redirect(303, '/customer');
			} else {
				throw redirect(303, '/worker');
			}
		} catch (error) {
			if (error.status === 303) throw error;
			console.error('❌ Registration finalization failed:', error);
			return fail(400, {
				error: error.message || 'An error occurred while creating your account.',
				step: 'otp',
				email, name, phone, role, address
			});
		}
	},

	resendOtp: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim();
		const name = data.get('name')?.toString().trim();
		const phone = data.get('phone')?.toString().trim();
		const role = data.get('role')?.toString().trim();
		const address = data.get('address')?.toString().trim();
		const password = data.get('password')?.toString();

		if (!email) {
			return fail(400, { error: 'Email is required to resend verification code.' });
		}

		try {
			await createAndSendOtp({
				email,
				type: 'registration',
				metadata: { name, email, phone, role, address, password },
				name
			});

			return {
				success: true,
				resendSuccess: 'A new 6-digit code has been sent to your email.',
				step: 'otp',
				email, name, phone, role, address
			};
		} catch (err) {
			return fail(400, {
				error: err.message || 'Failed to resend code.',
				step: 'otp',
				email, name, phone, role, address
			});
		}
	}
};
