import { db } from '$lib/server/db.js';
import { redirect, fail } from '@sveltejs/kit';
import { getPhilippineCityCoordinates } from '$lib/philippinesLocations.js';

export function load({ locals }) {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	if (locals.user.role !== 'customer') {
		throw redirect(303, '/worker');
	}
	return {};
}

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'customer') {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const title = data.get('title')?.toString().trim();
		const category = data.get('category')?.toString().trim();
		const description = data.get('description')?.toString().trim();
		const location = data.get('location')?.toString().trim();
		let latitude = data.get('latitude')?.toString().trim() || null;
		let longitude = data.get('longitude')?.toString().trim() || null;
		const budget = data.get('budget')?.toString().trim();
		const target_date = data.get('target_date')?.toString().trim();

		if (!title || !category || !description || !location || !budget || !target_date) {
			return fail(400, { 
				error: 'Please fill out all fields to post a job.', 
				title, category, description, location, latitude, longitude, budget, target_date 
			});
		}

		// Auto-resolve city/municipality coordinates if not manually pinned
		if ((!latitude || !longitude) && location) {
			const cityCoords = getPhilippineCityCoordinates(location);
			if (cityCoords) {
				latitude = String(cityCoords.latitude);
				longitude = String(cityCoords.longitude);
			}
		}

		try {
			await db.jobs.create({
				customer_id: locals.user.id,
				title,
				category,
				description,
				location,
				latitude,
				longitude,
				budget,
				target_date
			});
		} catch (error) {
			return fail(400, { 
				error: error.message || 'Could not post the job.', 
				title, category, description, location, latitude, longitude, budget, target_date 
			});
		}

		// On success, redirect back to the main customer dashboard
		throw redirect(303, '/customer');
	}
};
