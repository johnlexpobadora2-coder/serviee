import { db } from '$lib/server/db.js';
import { redirect, fail } from '@sveltejs/kit';

export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	if (locals.user.role !== 'worker') {
		throw redirect(303, '/customer');
	}

	const workerId = locals.user.id;

	const [allJobs, stats, conversations] = await Promise.all([
		db.jobs.listAll(),
		db.reviews.getStatsForWorker(workerId),
		db.messages.listConversationsForUser(workerId)
	]);

	// Filter available jobs, assigned jobs, and completed jobs
	const availableJobs = allJobs.filter(j => j.status === 'open');
	const assignedJobs = allJobs.filter(j => j.worker_id === workerId && (j.status === 'assigned' || j.status === 'in_progress'));
	const completedJobs = allJobs.filter(j => j.worker_id === workerId && j.status === 'completed');

	// Bulk fetch all relevant customers in a single IN query
	const relevantCustomerIds = Array.from(new Set([...availableJobs, ...assignedJobs, ...completedJobs].map(j => j.customer_id)));
	const customerMap = await db.users.findByIds(relevantCustomerIds);

	const hydratedAvailableJobs = availableJobs.map(job => {
		const customer = customerMap.get(job.customer_id);
		return {
			...job,
			customerName: customer ? customer.name : 'Anonymous Client',
			hasApplied: job.applicants.includes(workerId)
		};
	});

	const myAssignedJobs = assignedJobs.map(job => {
		const customer = customerMap.get(job.customer_id);
		return {
			...job,
			customerName: customer ? customer.name : 'Anonymous Client',
			customerPhone: customer ? customer.phone : 'Not available'
		};
	});

	const myCompletedJobs = completedJobs.map(job => {
		const customer = customerMap.get(job.customer_id);
		return {
			...job,
			customerName: customer ? customer.name : 'Anonymous Client',
			customerPhone: customer ? customer.phone : 'Not available'
		};
	});

	hydratedAvailableJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
	myCompletedJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

	return {
		availableJobs: hydratedAvailableJobs,
		myJobs: myAssignedJobs,
		completedJobs: myCompletedJobs,
		conversations,
		stats
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
			await db.messages.send({
				job_id: jobId,
				sender_id: locals.user.id,
				receiver_id: customerId,
				content: initialMessage
			});

			return { success: 'Inquiry sent! Opened chat thread with client.', activeTab: 'chat', activeConvId: `${jobId}_${customerId}` };
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

