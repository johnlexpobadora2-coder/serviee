import { db, hashPassword } from '$lib/server/db.js';
import { createSignedSession } from '$lib/server/session.js';
import { redirect, fail } from '@sveltejs/kit';

export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	const freshUser = await db.users.findById(locals.user.id);
	if (freshUser) {
		const { password_hash, ...safeUser } = freshUser;
		locals.user = safeUser;
	}

	const complementaryRole = locals.user.role === 'customer' ? 'worker' : 'customer';
	const complementaryAccount = await db.users.getComplementaryAccount(locals.user.email, locals.user.role);

	return {
		user: locals.user,
		complementaryRole,
		hasComplementaryAccount: Boolean(complementaryAccount),
		complementaryAccountName: complementaryAccount?.name || null
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
		const bio = data.get('bio')?.toString().trim() || '';
		const availability_status = data.get('availability_status')?.toString().trim() || 'available';

		let skills = [];
		const skillsRaw = data.get('skills')?.toString();
		if (skillsRaw) {
			try {
				const parsed = JSON.parse(skillsRaw);
				if (Array.isArray(parsed)) {
					skills = parsed.map(s => String(s).trim()).filter(Boolean);
				} else {
					skills = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);
				}
			} catch {
				skills = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);
			}
		} else {
			skills = data.getAll('skills').map(s => String(s).trim()).filter(Boolean);
		}

		if (!name) {
			return fail(400, {
				profileError: 'Full Name is required.',
				profileSuccess: false
			});
		}

		try {
			const updated = await db.users.updateProfile(locals.user.id, {
				name,
				phone: phone || '',
				address: address || '',
				bio,
				skills,
				availability_status
			});

			if (updated) {
				const { password_hash, ...safeUser } = updated;
				locals.user = safeUser;
			}

			return {
				profileSuccess: 'Profile updated successfully!',
				profileError: null,
				user: locals.user
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
	},

	switchRole: async ({ request, cookies, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const targetRole = data.get('targetRole')?.toString();
		const password = data.get('password')?.toString();

		if (!targetRole || (targetRole !== 'customer' && targetRole !== 'worker')) {
			return fail(400, { switchError: 'Invalid target role.' });
		}

		if (!password) {
			return fail(400, { switchError: `Please enter the password for your ${targetRole === 'customer' ? 'Client' : 'Worker'} account.` });
		}

		try {
			const targetUser = await db.users.findByEmailAndRole(locals.user.email, targetRole);
			if (!targetUser) {
				return fail(404, { switchError: `No ${targetRole === 'customer' ? 'Client' : 'Worker'} account found under this email.` });
			}

			if (targetUser.password_hash !== hashPassword(password)) {
				return fail(400, { switchError: `Incorrect password for your ${targetRole === 'customer' ? 'Client' : 'Worker'} account.` });
			}

			// Switch session to the target role account
			const signedToken = createSignedSession(targetUser.id, targetUser.token_version || 1);
			cookies.set('session_id', signedToken, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: process.env.NODE_ENV === 'production',
				maxAge: 60 * 60 * 24 * 7
			});

			if (targetRole === 'customer') {
				throw redirect(303, '/customer');
			} else {
				throw redirect(303, '/worker');
			}
		} catch (error) {
			if (error.status === 303) throw error;
			console.error('Error switching role:', error);
			return fail(400, { switchError: error.message || 'Failed to switch role.' });
		}
	},

	createComplementaryRole: async ({ request, cookies, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const role = data.get('role')?.toString();
		const password = data.get('password')?.toString();
		const name = data.get('name')?.toString().trim() || locals.user.name;
		const phone = data.get('phone')?.toString().trim() || locals.user.phone;
		const address = data.get('address')?.toString().trim() || locals.user.address;

		if (!role || (role !== 'customer' && role !== 'worker')) {
			return fail(400, { createRoleError: 'Invalid role selection.' });
		}

		if (!password || password.length < 6) {
			return fail(400, { createRoleError: 'Password must be at least 6 characters.' });
		}

		try {
			const existingRole = await db.users.findByEmailAndRole(locals.user.email, role);
			if (existingRole) {
				return fail(400, { createRoleError: `A ${role === 'customer' ? 'Client' : 'Worker'} account already exists for this email.` });
			}

			const currentUserRecord = await db.users.findById(locals.user.id);
			if (currentUserRecord && currentUserRecord.password_hash === hashPassword(password)) {
				return fail(400, { createRoleError: 'For security, your new role account cannot use the same password as your existing account.' });
			}

			const newUser = await db.users.create({
				name,
				email: locals.user.email,
				phone,
				role,
				address,
				password
			});

			// Switch to the newly created role account
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
			console.error('Error creating complementary role:', error);
			return fail(400, { createRoleError: error.message || 'Failed to create account.' });
		}
	},

	deleteAccount: async ({ request, cookies, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const password = data.get('password')?.toString();
		const confirmation = data.get('confirmation')?.toString().trim();

		if (confirmation !== 'DELETE') {
			return fail(400, {
				deleteError: 'Please type "DELETE" exactly to confirm account deletion.',
				deleteSuccess: false
			});
		}

		if (!password) {
			return fail(400, {
				deleteError: 'Please enter your password to delete your account.',
				deleteSuccess: false
			});
		}

		try {
			const user = await db.users.findById(locals.user.id);
			if (!user || user.password_hash !== hashPassword(password)) {
				return fail(400, {
					deleteError: 'Incorrect password. Account deletion cancelled.',
					deleteSuccess: false
				});
			}

			// Delete user from database
			await db.users.delete(locals.user.id);

			// Clear session cookie
			cookies.delete('session_id', { path: '/' });

			throw redirect(303, '/register?deleted=true');
		} catch (error) {
			if (error.status === 303) throw error;
			console.error('Error deleting account:', error);
			return fail(400, {
				deleteError: error.message || 'Failed to delete account. Please try again.',
				deleteSuccess: false
			});
		}
	}
};

