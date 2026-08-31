import { env } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

let supabaseInstance = null;

function getSupabase() {
	if (supabaseInstance) return supabaseInstance;

	const supabaseUrl = env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
	const supabaseKey = env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || '';

	console.log('--- SUPABASE CLIENT INITIALIZATION ---');
	console.log('SvelteKit env URL:', env.PUBLIC_SUPABASE_URL ? 'FOUND' : 'MISSING');
	console.log('Node process.env URL:', process.env.PUBLIC_SUPABASE_URL ? 'FOUND' : 'MISSING');
	console.log('Using URL:', supabaseUrl);
	console.log('Using Key (length):', supabaseKey ? supabaseKey.length : 0);

	// Return a safe mock during build time if environment keys are not yet bound
	if (!supabaseUrl || !supabaseKey) {
		console.warn('⚠️ WARNING: Supabase keys are empty! Using Mock Client.');
		return {
			from: () => ({
				select: () => ({
					eq: () => ({
						maybeSingle: () => Promise.resolve({ data: null, error: null }),
						single: () => Promise.resolve({ data: null, error: null })
					}),
					order: () => Promise.resolve({ data: [], error: null })
				}),
				insert: () => Promise.resolve({ error: null }),
				update: () => ({
					eq: () => Promise.resolve({ error: null })
				})
			})
		};
	}

	supabaseInstance = createClient(supabaseUrl, supabaseKey);
	return supabaseInstance;
}

export function hashPassword(password) {
	return crypto.createHash('sha256').update(password).digest('hex');
}

export const db = {
	users: {
		async create({ name, email, phone, role, address, password }) {
			const existing = await this.findByEmail(email);
			if (existing) {
				throw new Error('Email is already registered.');
			}

			const newUser = {
				id: crypto.randomUUID(),
				name,
				email: email.toLowerCase(),
				phone,
				role, // 'customer' or 'worker'
				address,
				password_hash: hashPassword(password),
				created_at: new Date().toISOString()
			};

			const supabase = getSupabase();
			const { error } = await supabase.from('users').insert(newUser);
			if (error) throw new Error(error.message);
			return newUser;
		},

		async findByEmail(email) {
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('users')
				.select('*')
				.eq('email', email.toLowerCase())
				.maybeSingle();
			if (error) throw new Error(error.message);
			return data || null;
		},

		async findById(id) {
			if (!id) return null;
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('users')
				.select('*')
				.eq('id', id)
				.maybeSingle();
			if (error) throw new Error(error.message);
			return data || null;
		},

		async listWorkers() {
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('users')
				.select('*')
				.eq('role', 'worker');
			if (error) throw new Error(error.message);
			return data || [];
		}
	},

	jobs: {
		async create({ customer_id, title, category, description, location, budget, target_date }) {
			const newJob = {
				id: crypto.randomUUID(),
				customer_id,
				worker_id: null,
				title,
				category,
				description,
				location,
				budget: parseFloat(budget) || 0,
				status: 'open', // 'open' | 'assigned' | 'in_progress' | 'completed'
				target_date: target_date || new Date().toISOString(),
				applicants: [], // Array of Worker UUIDs
				created_at: new Date().toISOString()
			};

			const supabase = getSupabase();
			const { error } = await supabase.from('job_posts').insert(newJob);
			if (error) throw new Error(error.message);
			return newJob;
		},

		async apply(jobId, workerId) {
			const supabase = getSupabase();
			const { data: job, error: fetchError } = await supabase
				.from('job_posts')
				.select('applicants')
				.eq('id', jobId)
				.single();
			
			if (fetchError || !job) throw new Error('Job post not found.');

			const applicants = job.applicants || [];
			if (!applicants.includes(workerId)) {
				applicants.push(workerId);
				const { error: updateError } = await supabase
					.from('job_posts')
					.update({ applicants })
					.eq('id', jobId);
				if (updateError) throw new Error(updateError.message);
			}
		},

		async assign(jobId, workerId) {
			const supabase = getSupabase();
			const { error } = await supabase
				.from('job_posts')
				.update({ worker_id: workerId, status: 'assigned' })
				.eq('id', jobId);
			if (error) throw new Error(error.message);
		},

		async updateStatus(jobId, status) {
			const supabase = getSupabase();
			const { error } = await supabase
				.from('job_posts')
				.update({ status })
				.eq('id', jobId);
			if (error) throw new Error(error.message);
		},

		async listAll() {
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('job_posts')
				.select('*');
			if (error) throw new Error(error.message);
			return data || [];
		},

		async listByCustomer(customerId) {
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('job_posts')
				.select('*')
				.eq('customer_id', customerId);
			if (error) throw new Error(error.message);
			return data || [];
		},

		async listByWorker(workerId) {
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('job_posts')
				.select('*')
				.eq('worker_id', workerId);
			if (error) throw new Error(error.message);
			return data || [];
		}
	},

	reviews: {
		async create({ job_id, customer_id, worker_id, rating, review_text }) {
			const newReview = {
				id: crypto.randomUUID(),
				job_id,
				customer_id,
				worker_id,
				rating: parseInt(rating) || 5,
				review_text,
				created_at: new Date().toISOString()
			};

			const supabase = getSupabase();
			const { error } = await supabase.from('ratings_reviews').insert(newReview);
			if (error) throw new Error(error.message);
			return newReview;
		},

		async listForWorker(workerId) {
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('ratings_reviews')
				.select('*')
				.eq('worker_id', workerId);
			if (error) throw new Error(error.message);
			return data || [];
		},

		async getStatsForWorker(workerId) {
			const workerReviews = await this.listForWorker(workerId);
			
			// Fetch completed jobs count
			const supabase = getSupabase();
			const { count, error: countError } = await supabase
				.from('job_posts')
				.select('*', { count: 'exact', head: true })
				.eq('worker_id', workerId)
				.eq('status', 'completed');

			if (countError) throw new Error(countError.message);

			if (workerReviews.length === 0) {
				return {
					average_rating: 0,
					total_reviews: 0,
					completed_jobs_count: count || 0,
					reviews: []
				};
			}

			const sum = workerReviews.reduce((acc, curr) => acc + curr.rating, 0);
			const avg = parseFloat((sum / workerReviews.length).toFixed(1));

			// Hydrate reviews with author names
			const reviewsWithAuthor = [];
			for (const r of workerReviews) {
				const customer = await db.users.findById(r.customer_id);
				reviewsWithAuthor.push({
					...r,
					customer_name: customer ? customer.name : 'Anonymous Client'
				});
			}

			return {
				average_rating: avg,
				total_reviews: workerReviews.length,
				completed_jobs_count: count || 0,
				reviews: reviewsWithAuthor
			};
		}
	}
};
