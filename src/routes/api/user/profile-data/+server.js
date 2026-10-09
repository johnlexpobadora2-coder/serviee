import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';

export async function GET({ locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = locals.user.id;
	const role = locals.user.role;

	try {
		if (role === 'customer') {
			const [posts, reviews] = await Promise.all([
				db.jobs.listByCustomer(userId),
				db.reviews.listForCustomer(userId)
			]);

			const reviewMap = new Map(reviews.map(r => [r.job_id, r]));
			const workerAndApplicantIds = new Set();
			for (const post of posts) {
				if (post.worker_id) workerAndApplicantIds.add(post.worker_id);
				(post.applicants || []).forEach(id => workerAndApplicantIds.add(id));
			}

			const userMap = await db.users.findByIds(Array.from(workerAndApplicantIds));
			const workerStatsMap = await db.reviews.getStatsForWorkersBatch(Array.from(workerAndApplicantIds));

			const hydratedPosts = posts.map(post => {
				let assignedWorker = null;
				if (post.worker_id) {
					const worker = userMap.get(post.worker_id);
					if (worker) {
						const stats = workerStatsMap.get(worker.id) || { average_rating: 0 };
						assignedWorker = {
							id: worker.id,
							name: worker.name,
							phone: worker.phone,
							mask_phone: worker.mask_phone,
							address: worker.address,
							bio: worker.bio || '',
							skills: worker.skills || [],
							availability_status: worker.availability_status || 'available',
							average_rating: stats.average_rating
						};
					}
				}

				const applicants = (post.applicants || [])
					.map(applicantId => {
						const worker = userMap.get(applicantId);
						if (!worker) return null;
						const stats = workerStatsMap.get(worker.id) || { average_rating: 0, completed_jobs_count: 0 };
						return {
							id: worker.id,
							name: worker.name,
							phone: worker.phone,
							mask_phone: worker.mask_phone,
							address: worker.address,
							bio: worker.bio || '',
							skills: worker.skills || [],
							availability_status: worker.availability_status || 'available',
							average_rating: stats.average_rating,
							completed_jobs_count: stats.completed_jobs_count
						};
					})
					.filter(Boolean);

				const review = reviewMap.get(post.id) || null;

				return {
					...post,
					assignedWorker,
					applicants,
					review
				};
			});

			return json({
				posts: hydratedPosts,
				completedJobs: hydratedPosts.filter(p => p.status === 'completed')
			});
		} else if (role === 'worker') {
			const [stats, workerJobs] = await Promise.all([
				db.reviews.getStatsForWorker(userId),
				db.jobs.listByWorker(userId)
			]);

			const completedJobs = workerJobs.filter(j => j.status === 'completed');
			const customerIds = Array.from(new Set(completedJobs.map(j => j.customer_id).filter(Boolean)));
			const customerMap = await db.users.findByIds(customerIds);

			const hydratedCompletedJobs = completedJobs.map(job => {
				const customer = customerMap.get(job.customer_id);
				return {
					...job,
					customerName: customer ? customer.name : 'Anonymous Client',
					customerPhone: customer ? customer.phone : 'Not available'
				};
			});

			return json({
				stats,
				completedJobs: hydratedCompletedJobs
			});
		}

		return json({});
	} catch (err) {
		console.error('Error in /api/user/profile-data:', err);
		return json({ error: err.message || 'Failed to fetch profile data' }, { status: 500 });
	}
}
