import { db } from '$lib/server/db.js';
import { redirect, fail } from '@sveltejs/kit';

export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	if (locals.user.role !== 'customer') {
		throw redirect(303, '/worker');
	}

	const [posts, allJobs, conversations, customerReviews] = await Promise.all([
		db.jobs.listByCustomer(locals.user.id),
		db.jobs.listAll(),
		db.messages.listConversationsForUser(locals.user.id, locals.user),
		db.reviews.listForCustomer(locals.user.id)
	]);

	const reviewMap = new Map(customerReviews.map(r => [r.job_id, r]));

	// Collect worker and applicant IDs for bulk user lookups
	const workerAndApplicantIds = new Set();
	for (const post of posts) {
		if (post.worker_id) workerAndApplicantIds.add(post.worker_id);
		(post.applicants || []).forEach(id => workerAndApplicantIds.add(id));
	}

	// Bulk fetch user profiles & stats for workers/applicants
	const userMap = await db.users.findByIds(Array.from(workerAndApplicantIds));
	
	// Cache worker stats to avoid repeating calls for the same worker ID
	const workerStatsMap = new Map();
	await Promise.all(
		Array.from(workerAndApplicantIds).map(async (id) => {
			const stats = await db.reviews.getStatsForWorker(id);
			workerStatsMap.set(id, stats);
		})
	);

	// Hydrate customer's posts
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
					address: worker.address,
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

	hydratedPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

	// Bulk fetch customer profiles for allJobs feed
	const allCustomerIds = Array.from(new Set(allJobs.map(j => j.customer_id)));
	const customerMap = await db.users.findByIds(allCustomerIds);

	const hydratedAllJobs = allJobs.map(job => {
		const customer = customerMap.get(job.customer_id);
		return {
			...job,
			customerName: customer ? customer.name : 'Client'
		};
	});

	hydratedAllJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

	return {
		allJobs: hydratedAllJobs,
		posts: hydratedPosts,
		conversations,
		user: locals.user
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
	},

	sendMessage: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const jobId = data.get('jobId')?.toString();
		const receiverId = data.get('receiverId')?.toString();
		const content = data.get('content')?.toString()?.trim();

		if (!jobId || !receiverId || !content) {
			return fail(400, { error: 'Missing message parameters.' });
		}

		try {
			await db.messages.send({
				job_id: jobId,
				sender_id: locals.user.id,
				receiver_id: receiverId,
				content
			});
			return { success: 'Message sent!' };
		} catch (error) {
			return fail(400, { error: error.message || 'Failed to send message.' });
		}
	}
};

