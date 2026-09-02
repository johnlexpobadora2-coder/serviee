import { db } from '$lib/server/db.js';

export async function load({ locals }) {


	const [allJobs, workers] = await Promise.all([
		db.jobs.listAll(),
		db.users.listWorkers()
	]);
	
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

