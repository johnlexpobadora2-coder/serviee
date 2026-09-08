import { db } from '$lib/server/db.js';
import { createAndSendOtp, verifyOtp, createResetSession, verifyResetSession, consumeResetSession } from '$lib/server/otp.js';
import { redirect, fail } from '@sveltejs/kit';

export function load({ locals }) {
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
	requestOtp: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim();

		console.log('--- FORGOT PASSWORD OTP REQUEST ---');
		console.log('Email:', email);

		if (!email) {
			return fail(400, { error: 'Please enter your email address.', email });
		}

		try {
			const accounts = await db.users.findAllByEmail(email);

			if (!accounts || accounts.length === 0) {
				return fail(400, { 
					error: 'No registered account found with this email address.', 
					email 
				});
			}

			const primaryUser = accounts[0];

			// Send OTP via Nodemailer
			await createAndSendOtp({
				email,
				type: 'forgot_password',
				name: primaryUser.name
			});

			return {
				success: true,
				step: 'otp',
				email
			};
		} catch (err) {
			console.error('❌ Forgot password request failed:', err);
			return fail(400, {
				error: err.message || 'Failed to send reset code. Please try again.',
				email
			});
		}
	},

	verifyResetOtp: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim();
		const otp = data.get('otp')?.toString().trim();

		console.log('--- VERIFYING FORGOT PASSWORD OTP ---');
		console.log('Email:', email);
		console.log('Entered OTP:', otp);

		if (!email || !otp) {
			return fail(400, {
				error: 'Please enter the 6-digit verification code.',
				step: 'otp',
				email
			});
		}

		const verification = verifyOtp({ email, otp, type: 'forgot_password' });
		if (!verification.valid) {
			return fail(400, {
				error: verification.error,
				step: 'otp',
				email
			});
		}

		// Find accounts to determine roles
		const accounts = await db.users.findAllByEmail(email);
		const roles = accounts.map(a => a.role);
		const resetToken = createResetSession(email, roles);

		console.log('✅ OTP Verified. Accounts found:', roles.length, 'Roles:', roles.join(', '));

		return {
			success: true,
			step: 'new_password',
			email,
			roles,
			resetToken
		};
	},

	resendResetOtp: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim();

		if (!email) {
			return fail(400, { error: 'Email is required to resend verification code.' });
		}

		try {
			const accounts = await db.users.findAllByEmail(email);
			const name = accounts[0]?.name || '';

			await createAndSendOtp({
				email,
				type: 'forgot_password',
				name
			});

			return {
				success: true,
				resendSuccess: 'A new 6-digit code has been sent to your email.',
				step: 'otp',
				email
			};
		} catch (err) {
			return fail(400, {
				error: err.message || 'Failed to resend code.',
				step: 'otp',
				email
			});
		}
	},

	resetPassword: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim();
		const resetToken = data.get('resetToken')?.toString();
		const customerPassword = data.get('customerPassword')?.toString() || '';
		const workerPassword = data.get('workerPassword')?.toString() || '';
		const singlePassword = data.get('password')?.toString() || '';

		console.log('--- RESETTING PASSWORD ---');
		console.log('Email:', email);

		const sessionValidation = verifyResetSession(resetToken, email);
		if (!sessionValidation.valid) {
			return fail(400, {
				error: sessionValidation.error,
				step: 'email',
				email
			});
		}

		const { roles } = sessionValidation.session;

		try {
			let custPassToUpdate = '';
			let workPassToUpdate = '';

			if (roles.length > 1) {
				// Both Customer and Worker accounts exist
				custPassToUpdate = customerPassword.trim();
				workPassToUpdate = workerPassword.trim();

				if (!custPassToUpdate && !workPassToUpdate) {
					return fail(400, {
						error: 'Please enter a new password for at least one account role.',
						step: 'new_password',
						email,
						roles,
						resetToken
					});
				}

				if (custPassToUpdate && custPassToUpdate.length < 6) {
					return fail(400, {
						error: 'Client password must be at least 6 characters.',
						step: 'new_password',
						email,
						roles,
						resetToken
					});
				}

				if (workPassToUpdate && workPassToUpdate.length < 6) {
					return fail(400, {
						error: 'Worker password must be at least 6 characters.',
						step: 'new_password',
						email,
						roles,
						resetToken
					});
				}

				if (custPassToUpdate && workPassToUpdate && custPassToUpdate === workPassToUpdate) {
					return fail(400, {
						error: 'For security, you cannot use the same password for both your Client and Worker accounts.',
						step: 'new_password',
						email,
						roles,
						resetToken
					});
				}
			} else {
				// Single role account
				const role = roles[0];
				const pass = singlePassword.trim() || (role === 'customer' ? customerPassword.trim() : workerPassword.trim());

				if (!pass || pass.length < 6) {
					return fail(400, {
						error: 'Password must be at least 6 characters.',
						step: 'new_password',
						email,
						roles,
						resetToken
					});
				}

				if (role === 'customer') {
					custPassToUpdate = pass;
				} else {
					workPassToUpdate = pass;
				}
			}

			await db.users.resetPasswordsByEmail(email, {
				customerPassword: custPassToUpdate,
				workerPassword: workPassToUpdate
			});

			// Consume token so it cannot be reused
			consumeResetSession(resetToken);

			return {
				success: true,
				step: 'done',
				email,
				message: 'Your password has been updated successfully!'
			};
		} catch (err) {
			console.error('❌ Error updating password:', err);
			return fail(400, {
				error: err.message || 'Failed to update password. Please try again.',
				step: 'new_password',
				email,
				roles,
				resetToken
			});
		}
	}
};
