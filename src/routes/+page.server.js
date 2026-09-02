import { db } from '$lib/server/db.js';

export async function load({ locals }) {


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

