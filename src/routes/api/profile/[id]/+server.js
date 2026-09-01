import { db } from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export async function GET({ params, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = params.id;
	if (!userId) {
		return json({ error: 'User ID is required' }, { status: 400 });
	}

	try {
		const targetUser = await db.users.findById(userId);
		if (!targetUser) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		// Omit password hash for safety
		const { password_hash, ...safeUser } = targetUser;

		let stats = {
			average_rating: 0,
			total_reviews: 0,
			completed_jobs_count: 0,
			total_posts_count: 0,
			reviews: []
		};
		let completedJobs = [];
		let allPosts = [];

		if (targetUser.role === 'worker') {
			const workerStats = await db.reviews.getStatsForWorker(userId);
			stats = {
				...stats,
				...workerStats
			};
			const allWorkerJobs = await db.jobs.listByWorker(userId);
			completedJobs = allWorkerJobs.filter(j => j.status === 'completed');
		} else if (targetUser.role === 'customer') {
			const [customerJobs, customerReviews] = await Promise.all([
				db.jobs.listByCustomer(userId),
				db.reviews.listForCustomer(userId)
			]);
			
			const reviewMap = new Map(customerReviews.map(r => [r.job_id, r]));

			// Gather worker IDs
			const workerIds = Array.from(new Set(customerJobs.map(j => j.worker_id).filter(Boolean)));
			const userMap = await db.users.findByIds(workerIds);

			allPosts = customerJobs.map(j => {
				const worker = j.worker_id ? userMap.get(j.worker_id) : null;
				const review = reviewMap.get(j.id) || null;
				return {
					...j,
					assignedWorker: worker ? { id: worker.id, name: worker.name, phone: worker.phone } : null,
					review
				};
			});

			completedJobs = allPosts.filter(j => j.status === 'completed');
			stats = {
				average_rating: 0,
				total_reviews: 0,
				completed_jobs_count: completedJobs.length,
				total_posts_count: customerJobs.length,
				reviews: []
			};
		}

		return json({
			user: safeUser,
			stats,
			completedJobs,
			allPosts
		});
	} catch (error) {
		console.error('Error fetching user profile:', error);
		return json({ error: error.message || 'Failed to fetch user profile' }, { status: 500 });
	}
}
