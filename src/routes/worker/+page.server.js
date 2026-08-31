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

	// Load feed jobs (available posts)
	const allJobs = await db.jobs.listAll();
	
	// Available jobs are open posts where the worker has NOT yet been assigned
	const availableJobs = allJobs.filter(j => j.status === 'open');

	// Hydrate available jobs with customer details
	const hydratedAvailableJobs = [];
	for (const job of availableJobs) {
		const customer = await db.users.findById(job.customer_id);
		hydratedAvailableJobs.push({
			...job,
			customerName: customer ? customer.name : 'Anonymous Client',
			hasApplied: job.applicants.includes(workerId)
		});
	}

	// Load jobs currently assigned/in-progress to this worker
	const assignedJobs = allJobs.filter(j => j.worker_id === workerId && (j.status === 'assigned' || j.status === 'in_progress'));
	const myAssignedJobs = [];
	for (const job of assignedJobs) {
		const customer = await db.users.findById(job.customer_id);
		myAssignedJobs.push({
			...job,
			customerName: customer ? customer.name : 'Anonymous Client',
			customerPhone: customer ? customer.phone : 'Not available'
		});
	}

	// Load worker reviews & completed jobs count
	const stats = await db.reviews.getStatsForWorker(workerId);

	// Sort available jobs: newest first
	hydratedAvailableJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

	return {
		availableJobs: hydratedAvailableJobs,
		myJobs: myAssignedJobs,
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
	}
};
