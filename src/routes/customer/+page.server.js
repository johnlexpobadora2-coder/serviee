import { db } from '$lib/server/db.js';
import { redirect, fail } from '@sveltejs/kit';

export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	if (locals.user.role !== 'customer') {
		throw redirect(303, '/worker');
	}

	const userLocation = locals.user.address || '';
	const [initialFeed, availableLocations] = await Promise.all([
		db.jobs.listFeedPaginated({ limit: 10, offset: 0, status: 'open', location: userLocation }),
		db.jobs.getAvailableLocations('open')
	]);

	return {
		initialFeedJobs: initialFeed.jobs,
		initialFeedTotalCount: initialFeed.totalCount,
		initialFeedHasMore: initialFeed.hasMore,
		availableLocations,
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
			const job = await db.jobs.findById(jobId);
			if (!job) {
				return fail(404, { error: 'Job post not found.' });
			}
			if (job.customer_id !== locals.user.id) {
				return fail(403, { error: 'You are not authorized to assign workers for this job.' });
			}

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
			const job = await db.jobs.findById(jobId);
			if (!job) {
				return fail(404, { error: 'Job post not found.' });
			}
			if (job.customer_id !== locals.user.id) {
				return fail(403, { error: 'You are not authorized to start this job.' });
			}

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
			const job = await db.jobs.findById(jobId);
			if (!job) {
				return fail(404, { error: 'Job post not found.' });
			}
			if (job.customer_id !== locals.user.id) {
				return fail(403, { error: 'You are not authorized to complete or rate this job.' });
			}

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
	},

	deleteJob: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'customer') {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const jobId = data.get('jobId')?.toString();

		if (!jobId) {
			return fail(400, { error: 'Missing jobId' });
		}

		try {
			const job = await db.jobs.findById(jobId);
			if (!job) {
				return fail(404, { error: 'Job post not found.' });
			}

			// Security check: Only the customer who posted this job can delete it
			if (job.customer_id !== locals.user.id) {
				return fail(403, { error: 'You can only delete your own job posts.' });
			}

			await db.jobs.delete(jobId);
			return { success: 'Job post deleted successfully!' };
		} catch (error) {
			return fail(400, { error: error.message || 'Could not delete job post.' });
		}
	},

	updateJob: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'customer') {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const jobId = data.get('jobId')?.toString();
		const title = data.get('title')?.toString()?.trim();
		const category = data.get('category')?.toString();
		const description = data.get('description')?.toString()?.trim();
		const location = data.get('location')?.toString()?.trim();
		const budget = data.get('budget')?.toString();
		const target_date = data.get('target_date')?.toString();
		const lat = parseFloat(data.get('latitude')?.toString() || '');
		const lng = parseFloat(data.get('longitude')?.toString() || '');

		if (!jobId || !title || !category || !description || !location || !budget || !target_date) {
			return fail(400, { error: 'All required fields must be filled out.' });
		}

		try {
			const job = await db.jobs.findById(jobId);
			if (!job) {
				return fail(404, { error: 'Job post not found.' });
			}

			if (job.customer_id !== locals.user.id) {
				return fail(403, { error: 'You can only edit your own job posts.' });
			}

			const updates = {
				title,
				category,
				description,
				location,
				budget: parseFloat(budget),
				target_date,
				latitude: isNaN(lat) ? job.latitude : lat,
				longitude: isNaN(lng) ? job.longitude : lng
			};

			await db.jobs.update(jobId, updates);
			return { success: 'Job post updated successfully!' };
		} catch (error) {
			return fail(400, { error: error.message || 'Could not update job post.' });
		}
	}
};

