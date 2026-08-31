import { db } from '$lib/server/db.js';
import { redirect, fail } from '@sveltejs/kit';

export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	if (locals.user.role !== 'customer') {
		throw redirect(303, '/worker');
	}

	const posts = await db.jobs.listByCustomer(locals.user.id);
	
	// Hydrate posts with worker details and applicant profiles
	const hydratedPosts = [];
	
	for (const post of posts) {
		let assignedWorker = null;
		if (post.worker_id) {
			const worker = await db.users.findById(post.worker_id);
			if (worker) {
				const stats = await db.reviews.getStatsForWorker(worker.id);
				assignedWorker = {
					id: worker.id,
					name: worker.name,
					phone: worker.phone,
					average_rating: stats.average_rating
				};
			}
		}

		const applicants = [];
		for (const applicantId of (post.applicants || [])) {
			const worker = await db.users.findById(applicantId);
			if (worker) {
				const stats = await db.reviews.getStatsForWorker(worker.id);
				applicants.push({
					id: worker.id,
					name: worker.name,
					phone: worker.phone,
					address: worker.address,
					average_rating: stats.average_rating,
					completed_jobs_count: stats.completed_jobs_count
				});
			}
		}

		hydratedPosts.push({
			...post,
			assignedWorker,
			applicants
		});
	}

	// Sort posts: newest first
	hydratedPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

	return {
		posts: hydratedPosts
	};
}

export const actions = {
	assignWorker: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'customer') {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const jobId = data.get('jobId')?.toString();
		const workerId = data.get('workerId')?.toString();

		if (!jobId || !workerId) {
			return fail(400, { error: 'Missing jobId or workerId' });
		}

		try {
			await db.jobs.assign(jobId, workerId);
			return { success: 'Worker assigned successfully!' };
		} catch (error) {
			return fail(400, { error: error.message || 'Could not assign worker.' });
		}
	},

	startJob: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'customer') {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const jobId = data.get('jobId')?.toString();

		if (!jobId) {
			return fail(400, { error: 'Missing jobId' });
		}

		try {
			await db.jobs.updateStatus(jobId, 'in_progress');
			return { success: 'Job started successfully!' };
		} catch (error) {
			return fail(400, { error: error.message || 'Could not start the job.' });
		}
	},

	completeAndRateJob: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'customer') {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const jobId = data.get('jobId')?.toString();
		const workerId = data.get('workerId')?.toString();
		const rating = data.get('rating')?.toString();
		const reviewText = data.get('reviewText')?.toString().trim();

		if (!jobId || !workerId || !rating || !reviewText) {
			return fail(400, { error: 'Please enter a rating and review.', jobId, workerId, rating, reviewText });
		}

		try {
			// Update status to completed
			await db.jobs.updateStatus(jobId, 'completed');

			// Save rating & review
			await db.reviews.create({
				job_id: jobId,
				customer_id: locals.user.id,
				worker_id: workerId,
				rating,
				review_text: reviewText
			});

			return { success: 'Job completed and review submitted successfully!' };
		} catch (error) {
			return fail(400, { error: error.message || 'Could not complete the job.' });
		}
	}
};
