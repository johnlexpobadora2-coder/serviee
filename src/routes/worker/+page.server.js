import { db } from '$lib/server/db.js';
import { redirect, fail } from '@sveltejs/kit';

export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	if (locals.user.role !== 'worker') {
		throw redirect(303, '/customer');
	}

	const userLocation = locals.user.address || '';
	const [initialFeed, availableLocations] = await Promise.all([
		db.jobs.listFeedPaginated({ limit: 10, offset: 0, status: 'open', workerId: locals.user.id, location: userLocation }),
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
	applyJob: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'worker') {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const jobId = data.get('jobId')?.toString();

		if (!jobId) {
			return fail(400, { error: 'Missing jobId' });
		}

		try {
			await db.jobs.apply(jobId, locals.user.id);
			return { success: 'Successfully applied! Wait for customer approval.' };
		} catch (error) {
			return fail(400, { error: error.message || 'Could not apply to this job.' });
		}
	},

	inquireJob: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'worker') {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const jobId = data.get('jobId')?.toString();
		const customerId = data.get('customerId')?.toString();
		const initialMessage = data.get('initialMessage')?.toString()?.trim() || 'Hello! Inquiring po ako sa job post na ito.';

		if (!jobId || !customerId) {
			return fail(400, { error: 'Missing jobId or customerId' });
		}

		try {
			// Automatically apply worker to post
			await db.jobs.apply(jobId, locals.user.id);
			
			// Send initial message
			const sentMessage = await db.messages.send({
				job_id: jobId,
				sender_id: locals.user.id,
				receiver_id: customerId,
				content: initialMessage
			});

			return { 
				success: 'Inquiry sent! Opened chat thread with client.', 
				activeTab: 'chat', 
				activeConvId: `${jobId}_${customerId}`,
				sentMessage 
			};
		} catch (error) {
			return fail(400, { error: error.message || 'Could not send inquiry.' });
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

