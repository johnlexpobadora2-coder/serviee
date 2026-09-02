import { db } from '$lib/server/db.js';
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	if (locals.user) {
		if (locals.user.role === 'customer') {
			throw redirect(303, '/customer');
		} else {
			throw redirect(303, '/worker');
		}
	}

	const allJobs = await db.jobs.listAll();
	const workers = await db.users.listWorkers();
	
	const activeJobs = allJobs.filter(j => j.status !== 'completed').length;
	const completedJobs = allJobs.filter(j => j.status === 'completed').length;
	const totalWorkers = workers.length;

	return {
		stats: {
			activeJobs,
			completedJobs,
			totalWorkers
		}
	};
}

