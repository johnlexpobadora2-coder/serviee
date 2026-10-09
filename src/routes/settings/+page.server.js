import { db, hashPassword } from '$lib/server/db.js';
import { createSignedSession, parseDeviceInfo } from '$lib/server/session.js';
import { sanitizeInput, getClientIp } from '$lib/server/security.js';
import { redirect, fail } from '@sveltejs/kit';
import { validatePassword, validatePhone } from '$lib/validation.js';
import crypto from 'crypto';

export async function load(event) {
	const { locals, request } = event;
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const complementaryRole = locals.user.role === 'customer' ? 'worker' : 'customer';

	const [freshUser, complementaryAccount] = await Promise.all([
		db.users.findById(locals.user.id),
		db.users.getComplementaryAccount(locals.user.email, locals.user.role)
	]);

	if (freshUser) {
		const { password_hash, ...safeUser } = freshUser;
		locals.user = safeUser;
	}

	const userAgent = request.headers.get('user-agent') || '';
	const clientIp = getClientIp(event);
	const currentDeviceInfo = parseDeviceInfo(userAgent, clientIp);

	// Update last active timestamp for the current session if registered
	if (locals.sessionId) {
		db.sessions.touch(locals.sessionId, clientIp).catch(() => {});
	}

	// Fetch all recorded active sessions from DB
	let sessionsFromDb = [];
	try {
		sessionsFromDb = await db.sessions.findByUserId(locals.user.id);
	} catch (e) {
		sessionsFromDb = [];
	}

	let activeSessions = [];
	if (sessionsFromDb && sessionsFromDb.length > 0) {
		activeSessions = sessionsFromDb.map(s => ({
			id: s.id,
			sessionId: s.session_id,
			deviceType: s.device_type || 'desktop',
			os: s.os || 'Unknown OS',
			browser: s.browser || 'Web Browser',
			ip: (!s.ip_address || s.ip_address === '::1' || s.ip_address === '127.0.0.1' || s.ip_address === '::ffff:127.0.0.1') ? 'Localhost (Dev)' : s.ip_address,
			lastActive: s.last_active_at || s.created_at || new Date().toISOString(),
			isCurrent: locals.sessionId ? s.session_id === locals.sessionId : false
		}));

		// If no session matches isCurrent explicitly, fallback to the top record or currentDeviceInfo
		const hasCurrent = activeSessions.some(s => s.isCurrent);
		if (!hasCurrent && activeSessions.length > 0) {
			activeSessions[0].isCurrent = true;
		}
	} else {
		// Fallback when user_sessions table has no records yet
		activeSessions = [{
			id: 'current',
			sessionId: locals.sessionId || 'current',
			deviceType: currentDeviceInfo.deviceType,
			os: currentDeviceInfo.os,
			browser: currentDeviceInfo.browser,
			ip: currentDeviceInfo.ip,
			lastActive: new Date().toISOString(),
			isCurrent: true
		}];
	}

	return {
		user: locals.user,
		complementaryRole,
		hasComplementaryAccount: Boolean(complementaryAccount),
		complementaryAccountName: complementaryAccount?.name || null,
		currentSession: currentDeviceInfo,
		activeSessions
	};
}

export const actions = {
	updateProfile: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const rawName = data.get('name')?.toString().trim();
		const rawPhone = data.get('phone')?.toString().trim();
		const rawAddress = data.get('address')?.toString().trim();
		const rawBio = data.get('bio')?.toString().trim() || '';
		const availability_status = data.get('availability_status')?.toString().trim() || 'available';
		const rawAvatar = data.get('avatar');

		const name = sanitizeInput(rawName);
		const phone = sanitizeInput(rawPhone);
		const address = sanitizeInput(rawAddress);
		const bio = sanitizeInput(rawBio);

		let avatar = undefined;
		if (rawAvatar !== null && rawAvatar !== undefined) {
			const avatarStr = rawAvatar.toString().trim();
			if (avatarStr) {
				// Security guard: Ensure it is a valid data URL
				if (!avatarStr.startsWith('data:image/')) {
					return fail(400, {
						profileError: 'Invalid image format for avatar.',
						profileSuccess: false
					});
				}
				// Security guard: Strict payload size threshold (compressed 256x256 WebP is ~10-30KB; cap at 150KB)
				if (avatarStr.length > 150 * 1024) {
					return fail(400, {
						profileError: 'Avatar image is too large. Please upload a standard photo.',
						profileSuccess: false
					});
				}
				avatar = avatarStr;
			} else {
				avatar = null;
			}
		}

		let skills = [];
		const skillsRaw = data.get('skills')?.toString();
		if (skillsRaw) {
			try {
				const parsed = JSON.parse(skillsRaw);
				if (Array.isArray(parsed)) {
					skills = parsed.map(s => sanitizeInput(String(s).trim())).filter(Boolean);
				} else {
					skills = skillsRaw.split(',').map(s => sanitizeInput(s.trim())).filter(Boolean);
				}
			} catch {
				skills = skillsRaw.split(',').map(s => sanitizeInput(s.trim())).filter(Boolean);
			}
		} else {
			skills = data.getAll('skills').map(s => sanitizeInput(String(s).trim())).filter(Boolean);
		}

		if (!name) {
			return fail(400, {
				profileError: 'Full Name is required.',
				profileSuccess: false
			});
		}

		if (phone) {
			const phoneValidation = validatePhone(phone);
			if (!phoneValidation.isValid) {
				return fail(400, {
					profileError: phoneValidation.error,
					profileSuccess: false
				});
			}
		}

		try {
			const updated = await db.users.updateProfile(locals.user.id, {
				name,
				phone: phone || '',
				address: address || '',
				bio,
				skills,
				availability_status,
				avatar
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

	updatePassword: async (event) => {
		const { request, cookies, locals } = event;
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

		const passwordValidation = validatePassword(newPassword);
		if (!passwordValidation.isValid) {
			return fail(400, {
				passwordError: passwordValidation.error,
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
			const updateResult = await db.users.updatePassword(locals.user.id, {
				currentPassword,
				newPassword
			});

			// Re-sign session cookie with the new token version for this device
			const newVersion = updateResult?.tokenVersion || 1;
			const newSessionId = crypto.randomUUID();
			const userAgent = request.headers.get('user-agent') || '';
			const clientIp = getClientIp(event);
			const deviceInfo = parseDeviceInfo(userAgent, clientIp);

			// Delete all other recorded sessions for user in DB and register new one
			await db.sessions.deleteAllForUser(locals.user.id);
			await db.sessions.create({
				userId: locals.user.id,
				sessionId: newSessionId,
				deviceType: deviceInfo.deviceType,
				os: deviceInfo.os,
				browser: deviceInfo.browser,
				ip: clientIp,
				userAgent
			});

			const signedToken = createSignedSession(locals.user.id, newVersion, newSessionId);
			cookies.set('session_id', signedToken, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: process.env.NODE_ENV === 'production',
				maxAge: 60 * 60 * 24 * 7
			});

			return {
				passwordSuccess: 'Password changed successfully! All other devices have been signed out.',
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

	switchRole: async (event) => {
		const { request, cookies, locals } = event;
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
			const newSessionId = crypto.randomUUID();
			const userAgent = request.headers.get('user-agent') || '';
			const clientIp = getClientIp(event);
			const deviceInfo = parseDeviceInfo(userAgent, clientIp);

			await db.sessions.create({
				userId: targetUser.id,
				sessionId: newSessionId,
				deviceType: deviceInfo.deviceType,
				os: deviceInfo.os,
				browser: deviceInfo.browser,
				ip: clientIp,
				userAgent
			});

			const signedToken = createSignedSession(targetUser.id, targetUser.token_version || 1, newSessionId);
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

	createComplementaryRole: async (event) => {
		const { request, cookies, locals } = event;
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

		if (!password) {
			return fail(400, { createRoleError: 'Password is required.' });
		}

		if (phone) {
			const phoneValidation = validatePhone(phone);
			if (!phoneValidation.isValid) {
				return fail(400, { createRoleError: phoneValidation.error });
			}
		}

		const passwordValidation = validatePassword(password);
		if (!passwordValidation.isValid) {
			return fail(400, { createRoleError: passwordValidation.error });
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
			const newSessionId = crypto.randomUUID();
			const userAgent = request.headers.get('user-agent') || '';
			const clientIp = getClientIp(event);
			const deviceInfo = parseDeviceInfo(userAgent, clientIp);

			await db.sessions.create({
				userId: newUser.id,
				sessionId: newSessionId,
				deviceType: deviceInfo.deviceType,
				os: deviceInfo.os,
				browser: deviceInfo.browser,
				ip: clientIp,
				userAgent
			});

			const signedToken = createSignedSession(newUser.id, newUser.token_version || 1, newSessionId);
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

			// Delete all sessions
			await db.sessions.deleteAllForUser(locals.user.id);

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
	},

	revokeSession: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = await request.formData();
		const targetSessionId = data.get('sessionId')?.toString();

		if (!targetSessionId) {
			return fail(400, { revokeError: 'Invalid session ID provided.' });
		}

		try {
			await db.sessions.deleteBySessionId(targetSessionId);
			return {
				revokeSuccess: 'Device session has been signed out and revoked successfully!'
			};
		} catch (error) {
			console.error('Error revoking device session:', error);
			return fail(500, {
				revokeError: error.message || 'Failed to revoke device session.'
			});
		}
	},

	logoutAllDevices: async ({ cookies, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		try {
			// Increment token_version to invalidate all active session tokens in all devices
			await db.users.incrementTokenVersion(locals.user.id);

			// Delete all recorded sessions for this user from DB
			await db.sessions.deleteAllForUser(locals.user.id);

			// Clear current session cookie
			cookies.delete('session_id', { path: '/' });

			throw redirect(303, '/login?logged_out_all=true');
		} catch (error) {
			if (error.status === 303) throw error;
			console.error('Error logging out all devices:', error);
			return fail(500, {
				logoutAllError: 'Failed to log out all devices. Please try again.',
				logoutAllSuccess: false
			});
		}
	}
};

