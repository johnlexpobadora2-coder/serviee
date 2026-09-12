import { db } from '$lib/server/db.js';
import { verifyAdminPasscode, createAdminSessionToken, verifyAdminSessionToken } from '$lib/server/session.js';
import { fail } from '@sveltejs/kit';

export async function load({ cookies }) {
	const adminToken = cookies.get('admin_session');
	const isAuthenticated = verifyAdminSessionToken(adminToken);

	if (!isAuthenticated) {
		return {
			isAuthenticated: false,
			stats: {
				totalUsers: 0,
				totalCustomers: 0,
				totalWorkers: 0,
				totalJobs: 0,
				openJobs: 0,
				assignedJobs: 0,
				inProgressJobs: 0,
				completedJobs: 0,
				totalBudget: 0,
				totalReviews: 0,
				avgRating: '0.0'
			},
			users: [],
			jobs: [],
			reviews: []
		};
	}

	try {
		const [users, jobs, reviews] = await Promise.all([
			db.users.listAll().catch(() => []),
			db.jobs.listAll().catch(() => []),
			db.reviews.listAll().catch(() => [])
		]);

		// Hydrate user lookups for reviews and jobs
		const userIds = new Set();
		users.forEach(u => userIds.add(u.id));
		reviews.forEach(r => {
			if (r.customer_id) userIds.add(r.customer_id);
			if (r.worker_id) userIds.add(r.worker_id);
		});

		const userMap = await db.users.findByIds(Array.from(userIds)).catch(() => new Map());

		// Safe sanitized user lists without password hashes
		const safeUsers = users.map(u => {
			const { password_hash, ...rest } = u;
			return rest;
		});

		// Hydrate reviews with author and worker names
		const hydratedReviews = reviews.map(r => ({
			...r,
			customer_name: userMap.get(r.customer_id)?.name || 'Anonymous Client',
			worker_name: userMap.get(r.worker_id)?.name || 'Unknown Worker'
		}));

		// Platform Statistics
		const totalUsers = safeUsers.length;
		const totalCustomers = safeUsers.filter(u => u.role === 'customer').length;
		const totalWorkers = safeUsers.filter(u => u.role === 'worker').length;

		const totalJobs = jobs.length;
		const openJobs = jobs.filter(j => j.status === 'open').length;
		const assignedJobs = jobs.filter(j => j.status === 'assigned').length;
		const inProgressJobs = jobs.filter(j => j.status === 'in_progress').length;
		const completedJobs = jobs.filter(j => j.status === 'completed').length;
		const totalBudget = jobs.reduce((sum, j) => sum + (parseFloat(j.budget) || 0), 0);

		const totalReviews = hydratedReviews.length;
		const avgRating = totalReviews > 0 
			? (hydratedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews).toFixed(1)
			: '0.0';

		return {
			isAuthenticated: true,
			stats: {
				totalUsers,
				totalCustomers,
				totalWorkers,
				totalJobs,
				openJobs,
				assignedJobs,
				inProgressJobs,
				completedJobs,
				totalBudget,
				totalReviews,
				avgRating
			},
			users: safeUsers,
			jobs,
			reviews: hydratedReviews
		};
	} catch (err) {
		console.error('Error loading admin dataset:', err);
		return {
			isAuthenticated: true,
			stats: {
				totalUsers: 0,
				totalCustomers: 0,
				totalWorkers: 0,
				totalJobs: 0,
				openJobs: 0,
				assignedJobs: 0,
				inProgressJobs: 0,
				completedJobs: 0,
				totalBudget: 0,
				totalReviews: 0,
				avgRating: '0.0'
			},
			users: [],
			jobs: [],
			reviews: []
		};
	}
}

export const actions = {
	loginAdmin: async ({ request, cookies }) => {
		const data = await request.formData();
		const passcode = data.get('passcode')?.toString() || '';

		if (!verifyAdminPasscode(passcode)) {
			return fail(401, {
				authError: 'Invalid Secret Passcode. Access denied.'
			});
		}

		const token = createAdminSessionToken();
		cookies.set('admin_session', token, {
			path: '/admin05',
			httpOnly: true,
			sameSite: 'strict',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 // 24 hours
		});

		return { success: true, authSuccess: true };
	},

	logoutAdmin: async ({ cookies }) => {
		cookies.delete('admin_session', { path: '/admin05' });
		return { success: true, loggedOut: true };
	},

	updateUserAddress: async ({ request, cookies }) => {
		if (!verifyAdminSessionToken(cookies.get('admin_session'))) {
			return fail(401, { message: 'Unauthorized. Admin authentication required.' });
		}

		const data = await request.formData();
		const userId = data.get('userId');
		const address = data.get('address');

		if (!userId || typeof userId !== 'string') {
			return fail(400, { message: 'User ID is required' });
		}

		const newAddress = typeof address === 'string' ? address.trim() : '';

		try {
			await db.users.updateProfile(userId, { address: newAddress });
			return { success: true, message: 'User address updated successfully.' };
		} catch (err) {
			console.error('Failed to update user address:', err);
			return fail(500, { message: err.message || 'Failed to update address' });
		}
	},

	resetUserPassword: async ({ request, cookies }) => {
		if (!verifyAdminSessionToken(cookies.get('admin_session'))) {
			return fail(401, { message: 'Unauthorized. Admin authentication required.' });
		}

		const data = await request.formData();
		const userId = data.get('userId');
		const newPassword = data.get('newPassword');

		if (!userId || typeof userId !== 'string') {
			return fail(400, { message: 'User ID is required' });
		}

		if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
			return fail(400, { message: 'New password must be at least 6 characters.' });
		}

		try {
			await db.users.adminResetPassword(userId, newPassword.trim());
			return { success: true, message: 'User password successfully reset/changed.' };
		} catch (err) {
			console.error('Failed to reset user password:', err);
			return fail(500, { message: err.message || 'Failed to reset password' });
		}
	},

	deleteUser: async ({ request, cookies }) => {
		if (!verifyAdminSessionToken(cookies.get('admin_session'))) {
			return fail(401, { message: 'Unauthorized. Admin authentication required.' });
		}

		const data = await request.formData();
		const userId = data.get('userId');

		if (!userId) {
			return fail(400, { message: 'User ID is required' });
		}

		try {
			await db.users.delete(userId);
			return { success: true, message: 'User deleted successfully.' };
		} catch (err) {
			console.error('Failed to delete user:', err);
			return fail(500, { message: err.message || 'Failed to delete user' });
		}
	},

	deleteJob: async ({ request, cookies }) => {
		if (!verifyAdminSessionToken(cookies.get('admin_session'))) {
			return fail(401, { message: 'Unauthorized. Admin authentication required.' });
		}

		const data = await request.formData();
		const jobId = data.get('jobId');

		if (!jobId) {
			return fail(400, { message: 'Job ID is required' });
		}

		try {
			await db.jobs.delete(jobId);
			return { success: true, message: 'Job post deleted successfully.' };
		} catch (err) {
			console.error('Failed to delete job post:', err);
			return fail(500, { message: err.message || 'Failed to delete job post' });
		}
	},

	updateJobStatus: async ({ request, cookies }) => {
		if (!verifyAdminSessionToken(cookies.get('admin_session'))) {
			return fail(401, { message: 'Unauthorized. Admin authentication required.' });
		}

		const data = await request.formData();
		const jobId = data.get('jobId');
		const status = data.get('status');

		if (!jobId || !status) {
			return fail(400, { message: 'Job ID and Status are required' });
		}

		try {
			await db.jobs.updateStatus(jobId, status);
			return { success: true, message: `Job status updated to ${status}.` };
		} catch (err) {
			console.error('Failed to update job status:', err);
			return fail(500, { message: err.message || 'Failed to update status' });
		}
	},

	deleteReview: async ({ request, cookies }) => {
		if (!verifyAdminSessionToken(cookies.get('admin_session'))) {
			return fail(401, { message: 'Unauthorized. Admin authentication required.' });
		}

		const data = await request.formData();
		const reviewId = data.get('reviewId');

		if (!reviewId) {
			return fail(400, { message: 'Review ID is required' });
		}

		try {
			await db.reviews.delete(reviewId);
			return { success: true, message: 'Review removed successfully.' };
		} catch (err) {
			console.error('Failed to delete review:', err);
			return fail(500, { message: err.message || 'Failed to remove review' });
		}
	}
};

