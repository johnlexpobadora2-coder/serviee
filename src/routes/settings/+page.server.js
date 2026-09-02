import { db } from '$lib/server/db.js';
import { redirect, fail } from '@sveltejs/kit';

export function load({ locals }) {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	return {
		user: locals.user
	};
}

export const actions = {
	updateProfile: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const phone = data.get('phone')?.toString().trim();
		const address = data.get('address')?.toString().trim();

		if (!name) {
			return fail(400, {
				profileError: 'Full Name is required.',
				profileSuccess: false
			});
		}

		try {
			await db.users.updateProfile(locals.user.id, {
				name,
				phone: phone || '',
				address: address || ''
			});

			return {
				profileSuccess: 'Profile updated successfully!',
				profileError: null
			};
		} catch (error) {
			console.error('Error updating profile:', error);
			return fail(400, {
				profileError: error.message || 'Failed to update profile. Please try again.',
				profileSuccess: false
			});
		}
	},

	updatePassword: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const currentPassword = data.get('currentPassword')?.toString();
		const newPassword = data.get('newPassword')?.toString();
		const confirmPassword = data.get('confirmPassword')?.toString();

		if (!currentPassword || !newPassword || !confirmPassword) {
			return fail(400, {
				passwordError: 'All password fields are required.',
				passwordSuccess: false
			});
		}

		if (newPassword.length < 6) {
			return fail(400, {
				passwordError: 'New password must be at least 6 characters long.',
				passwordSuccess: false
			});
		}

		if (newPassword !== confirmPassword) {
			return fail(400, {
				passwordError: 'New password and confirmation do not match.',
				passwordSuccess: false
			});
		}

		try {
			await db.users.updatePassword(locals.user.id, {
				currentPassword,
				newPassword
			});

			return {
				passwordSuccess: 'Password changed successfully!',
				passwordError: null
			};
		} catch (error) {
			console.error('Error updating password:', error);
			return fail(400, {
				passwordError: error.message || 'Failed to update password. Check your current password.',
				passwordSuccess: false
			});
		}
	}
};
