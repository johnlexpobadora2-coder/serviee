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

// In-Memory Caches for Latency Optimization
const userCache = new Map(); // id -> { data, timestamp }
const USER_CACHE_TTL = 60 * 1000; // 60s TTL

const workerStatsCache = new Map(); // workerId -> { data, timestamp }
const STATS_CACHE_TTL = 30 * 1000; // 30s TTL

export function invalidateUserCache(userId) {
	if (userId) userCache.delete(userId);
	else userCache.clear();
}

export function invalidateWorkerStatsCache(workerId) {
	if (workerId) workerStatsCache.delete(workerId);
	else workerStatsCache.clear();
}

export const db = {
	users: {
		async create({ name, email, phone, role, address, password }) {
			const normalizedEmail = (email || '').toLowerCase().trim();
			const existingUsers = await this.findAllByEmail(normalizedEmail);

			// Check if an account already exists with the same role
			const sameRoleUser = existingUsers.find(u => u.role === role);
			if (sameRoleUser) {
				throw new Error(`This email is already registered as a ${role}.`);
			}

			// Check password against other role accounts for the same email (must not share the same password)
			const passwordHash = hashPassword(password);
			const samePasswordUser = existingUsers.find(u => u.password_hash === passwordHash);
			if (samePasswordUser) {
				throw new Error('For security, you cannot use the same password as your other account with this email.');
			}

			const newUser = {
				id: crypto.randomUUID(),
				name,
				email: normalizedEmail,
				phone,
				role, // 'customer' or 'worker'
				address,
				bio: '',
				skills: [],
				availability_status: 'available',
				password_hash: passwordHash,
				created_at: new Date().toISOString()
			};

			const supabase = getSupabase();
			const { error } = await supabase.from('users').insert(newUser);
			if (error) throw new Error(error.message);
			return newUser;
		},

		async findAllByEmail(email) {
			if (!email) return [];
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('users')
				.select('*')
				.eq('email', email.toLowerCase().trim());
			if (error) throw new Error(error.message);
			return data || [];
		},

		async findByEmailAndRole(email, role) {
			if (!email || !role) return null;
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('users')
				.select('*')
				.eq('email', email.toLowerCase().trim())
				.eq('role', role)
				.maybeSingle();
			if (error) throw new Error(error.message);
			return data || null;
		},

		async findByEmail(email) {
			const users = await this.findAllByEmail(email);
			return users[0] || null;
		},

		async findById(id) {
			if (!id) return null;
			const cached = userCache.get(id);
			if (cached && Date.now() - cached.timestamp < USER_CACHE_TTL) {
				return cached.data;
			}

			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('users')
				.select('*')
				.eq('id', id)
				.maybeSingle();
			if (error) throw new Error(error.message);
			if (data) {
				userCache.set(id, { data, timestamp: Date.now() });
			}
			return data || null;
		},

		async findByIds(ids) {
			if (!ids || ids.length === 0) return new Map();
			const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
			if (uniqueIds.length === 0) return new Map();

			const userMap = new Map();
			const missingIds = [];

			for (const id of uniqueIds) {
				const cached = userCache.get(id);
				if (cached && Date.now() - cached.timestamp < USER_CACHE_TTL) {
					userMap.set(id, cached.data);
				} else {
					missingIds.push(id);
				}
			}

			if (missingIds.length > 0) {
				const supabase = getSupabase();
				const { data, error } = await supabase
					.from('users')
					.select('*')
					.in('id', missingIds);
				if (error) throw new Error(error.message);
				(data || []).forEach(user => {
					userCache.set(user.id, { data: user, timestamp: Date.now() });
					userMap.set(user.id, user);
				});
			}

			return userMap;
		},

		async listWorkers() {
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('users')
				.select('*')
				.eq('role', 'worker');
			if (error) throw new Error(error.message);
			return data || [];
		},

		async updateProfile(id, profile = {}) {
			const { name, phone, address, bio, skills, availability_status } = profile;
			const supabase = getSupabase();
			const updates = {};
			if (name !== undefined) updates.name = name;
			if (phone !== undefined) updates.phone = phone;
			if (address !== undefined) updates.address = address;
			if (bio !== undefined) updates.bio = typeof bio === 'string' ? bio.trim() : '';
			if (skills !== undefined) updates.skills = Array.isArray(skills) ? skills : [];
			if (availability_status !== undefined) updates.availability_status = availability_status;

			const { data, error } = await supabase
				.from('users')
				.update(updates)
				.eq('id', id)
				.select()
				.maybeSingle();
			if (error) throw new Error(error.message);
			invalidateUserCache(id);
			return data || null;
		},

		async updatePassword(id, { currentPassword, newPassword }) {
			const user = await this.findById(id);
			if (!user) throw new Error('User not found.');

			if (user.password_hash !== hashPassword(currentPassword)) {
				throw new Error('Incorrect current password.');
			}

			const newHash = hashPassword(newPassword);

			// Check other accounts with the same email to ensure they don't share the same password
			const accounts = await this.findAllByEmail(user.email);
			const otherAccountWithSamePass = accounts.find(
				a => a.id !== user.id && a.password_hash === newHash
			);
			if (otherAccountWithSamePass) {
				throw new Error('For security, you cannot use the same password as your other account with this email.');
			}

			const supabase = getSupabase();
			const { error } = await supabase
				.from('users')
				.update({ password_hash: newHash })
				.eq('id', id);
			if (error) throw new Error(error.message);
			invalidateUserCache(id);
			return true;
		},

		async adminResetPassword(id, newPassword) {
			const user = await this.findById(id);
			if (!user) throw new Error('User not found.');

			const newHash = hashPassword(newPassword);
			const accounts = await this.findAllByEmail(user.email);
			const otherAccountWithSamePass = accounts.find(
				a => a.id !== user.id && a.password_hash === newHash
			);
			if (otherAccountWithSamePass) {
				throw new Error('For security, you cannot use the same password as the other account with this email.');
			}

			const supabase = getSupabase();
			const { error } = await supabase
				.from('users')
				.update({ password_hash: newHash })
				.eq('id', id);
			if (error) throw new Error(error.message);
			invalidateUserCache(id);
			return true;
		},

		async resetPasswordsByEmail(email, { customerPassword = '', workerPassword = '' }) {
			const normalizedEmail = (email || '').toLowerCase().trim();
			const accounts = await this.findAllByEmail(normalizedEmail);
			if (!accounts || accounts.length === 0) {
				throw new Error('No user found with this email.');
			}

			const customerUser = accounts.find(a => a.role === 'customer');
			const workerUser = accounts.find(a => a.role === 'worker');

			const hasCustomerPass = Boolean(customerPassword && customerPassword.trim());
			const hasWorkerPass = Boolean(workerPassword && workerPassword.trim());

			if (!hasCustomerPass && !hasWorkerPass) {
				throw new Error('Please enter a new password for at least one account role.');
			}

			// If both accounts exist and both passwords are provided
			if (hasCustomerPass && hasWorkerPass && customerUser && workerUser) {
				if (customerPassword.length < 6 || workerPassword.length < 6) {
					throw new Error('Passwords must be at least 6 characters.');
				}
				if (customerPassword === workerPassword) {
					throw new Error('For security, Client and Worker accounts under the same email cannot use the same password.');
				}
			}

			const supabase = getSupabase();
			const updatedRoles = [];

			// Handle customer password update
			if (hasCustomerPass && customerUser) {
				if (customerPassword.length < 6) {
					throw new Error('Client account password must be at least 6 characters.');
				}
				const newCustomerHash = hashPassword(customerPassword);
				if (workerUser && !hasWorkerPass && workerUser.password_hash === newCustomerHash) {
					throw new Error('Client password cannot match the existing Worker password for this email.');
				}
				const { error } = await supabase
					.from('users')
					.update({ password_hash: newCustomerHash })
					.eq('id', customerUser.id);
				if (error) throw new Error(error.message);
				invalidateUserCache(customerUser.id);
				updatedRoles.push('customer');
			}

			// Handle worker password update
			if (hasWorkerPass && workerUser) {
				if (workerPassword.length < 6) {
					throw new Error('Worker account password must be at least 6 characters.');
				}
				const newWorkerHash = hashPassword(workerPassword);
				if (customerUser && !hasCustomerPass && customerUser.password_hash === newWorkerHash) {
					throw new Error('Worker password cannot match the existing Client password for this email.');
				}
				const { error } = await supabase
					.from('users')
					.update({ password_hash: newWorkerHash })
					.eq('id', workerUser.id);
				if (error) throw new Error(error.message);
				invalidateUserCache(workerUser.id);
				updatedRoles.push('worker');
			}

			return { success: true, updatedRoles };
		},

		async listAll() {
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('users')
				.select('*')
				.order('created_at', { ascending: false });
			if (error) throw new Error(error.message);
			return data || [];
		},

		async incrementTokenVersion(id) {
			const user = await this.findById(id);
			if (!user) throw new Error('User not found.');
			const nextVersion = (user.token_version || 1) + 1;
			const supabase = getSupabase();
			try {
				await supabase.from('users').update({ token_version: nextVersion }).eq('id', id);
			} catch (e) {
				console.warn('Could not update token_version in Supabase:', e.message);
			}
			invalidateUserCache(id);
			return nextVersion;
		},

		async getComplementaryAccount(email, currentRole) {
			if (!email) return null;
			const accounts = await this.findAllByEmail(email);
			const targetRole = currentRole === 'customer' ? 'worker' : 'customer';
			return accounts.find(a => a.role === targetRole) || null;
		},

		async delete(id) {
			const supabase = getSupabase();
			const { error } = await supabase
				.from('users')
				.delete()
				.eq('id', id);
			if (error) throw new Error(error.message);
			invalidateUserCache(id);
			return true;
		}
	},

	jobs: {
		async create({ customer_id, title, category, description, location, latitude, longitude, budget, target_date }) {
			const newJob = {
				id: crypto.randomUUID(),
				customer_id,
				worker_id: null,
				title,
				category,
				description,
				location,
				latitude: latitude !== undefined && latitude !== null && latitude !== '' ? parseFloat(latitude) : null,
				longitude: longitude !== undefined && longitude !== null && longitude !== '' ? parseFloat(longitude) : null,
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

		async findById(id) {
			if (!id) return null;
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('job_posts')
				.select('*')
				.eq('id', id)
				.maybeSingle();
			if (error) throw new Error(error.message);
			return data || null;
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
				.select('*')
				.order('created_at', { ascending: false });
			if (error) throw new Error(error.message);
			return data || [];
		},

		async listFeedPaginated({
			limit = 10,
			offset = 0,
			status = null,
			category = '',
			location = '',
			minBudget = null,
			maxBudget = null,
			search = '',
			sortBy = 'newest',
			workerId = null
		}) {
			const supabase = getSupabase();
			let query = supabase
				.from('job_posts')
				.select('*', { count: 'exact' });

			if (status) {
				query = query.eq('status', status);
			}
			if (category) {
				query = query.eq('category', category);
			}
			if (location) {
				query = query.ilike('location', `%${location}%`);
			}
			if (minBudget !== null && minBudget !== undefined && minBudget !== '') {
				query = query.gte('budget', Number(minBudget));
			}
			if (maxBudget !== null && maxBudget !== undefined && maxBudget !== '') {
				query = query.lte('budget', Number(maxBudget));
			}
			if (search) {
				const s = search.trim();
				query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
			}

			if (sortBy === 'highest_cost') {
				query = query.order('budget', { ascending: false });
			} else if (sortBy === 'lowest_cost') {
				query = query.order('budget', { ascending: true });
			} else if (sortBy === 'nearest_date') {
				query = query.gte('target_date', new Date().toISOString()).order('target_date', { ascending: true });
			} else {
				query = query.order('created_at', { ascending: false });
			}

			const from = Math.max(0, offset);
			const to = from + limit - 1;
			query = query.range(from, to);

			const { data: jobs, error, count } = await query;
			if (error) throw new Error(error.message);

			const jobList = jobs || [];
			// Bulk fetch customer details
			const customerIds = Array.from(new Set(jobList.map(j => j.customer_id).filter(Boolean)));
			const customerMap = await db.users.findByIds(customerIds);

			const hydratedJobs = jobList.map(job => {
				const customer = customerMap.get(job.customer_id);
				return {
					...job,
					customerName: customer ? customer.name : (workerId ? 'Anonymous Client' : 'Client'),
					hasApplied: workerId ? (job.applicants || []).includes(workerId) : false
				};
			});

			return {
				jobs: hydratedJobs,
				totalCount: count || 0,
				hasMore: from + jobList.length < (count || 0)
			};
		},

		async listCustomerActivePaginated({ customerId, limit = 10, offset = 0 }) {
			const supabase = getSupabase();
			const from = Math.max(0, offset);
			const to = from + limit - 1;

			const { data: jobs, error, count } = await supabase
				.from('job_posts')
				.select('*', { count: 'exact' })
				.eq('customer_id', customerId)
				.neq('status', 'completed')
				.order('created_at', { ascending: false })
				.range(from, to);

			if (error) throw new Error(error.message);

			const jobList = jobs || [];
			// Collect worker & applicant IDs
			const workerAndApplicantIds = new Set();
			for (const post of jobList) {
				if (post.worker_id) workerAndApplicantIds.add(post.worker_id);
				(post.applicants || []).forEach(id => workerAndApplicantIds.add(id));
			}

			const userMap = await db.users.findByIds(Array.from(workerAndApplicantIds));
			const workerStatsMap = new Map();
			await Promise.all(
				Array.from(workerAndApplicantIds).map(async (id) => {
					const stats = await db.reviews.getStatsForWorker(id);
					workerStatsMap.set(id, stats);
				})
			);

			const hydratedJobs = jobList.map(post => {
				let assignedWorker = null;
				if (post.worker_id) {
					const worker = userMap.get(post.worker_id);
					if (worker) {
						const stats = workerStatsMap.get(worker.id) || { average_rating: 0 };
						assignedWorker = {
							id: worker.id,
							name: worker.name,
							phone: worker.phone,
							address: worker.address,
							bio: worker.bio || '',
							skills: worker.skills || [],
							availability_status: worker.availability_status || 'available',
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
							bio: worker.bio || '',
							skills: worker.skills || [],
							availability_status: worker.availability_status || 'available',
							average_rating: stats.average_rating,
							completed_jobs_count: stats.completed_jobs_count
						};
					})
					.filter(Boolean);

				return {
					...post,
					assignedWorker,
					applicants
				};
			});

			return {
				jobs: hydratedJobs,
				totalCount: count || 0,
				hasMore: from + jobList.length < (count || 0)
			};
		},

		async listWorkerActivePaginated({ workerId, limit = 10, offset = 0 }) {
			const supabase = getSupabase();
			const from = Math.max(0, offset);
			const to = from + limit - 1;

			const { data: jobs, error, count } = await supabase
				.from('job_posts')
				.select('*', { count: 'exact' })
				.eq('worker_id', workerId)
				.in('status', ['assigned', 'in_progress'])
				.order('created_at', { ascending: false })
				.range(from, to);

			if (error) throw new Error(error.message);

			const jobList = jobs || [];
			const customerIds = Array.from(new Set(jobList.map(j => j.customer_id).filter(Boolean)));
			const customerMap = await db.users.findByIds(customerIds);

			const hydratedJobs = jobList.map(job => {
				const customer = customerMap.get(job.customer_id);
				return {
					...job,
					customerName: customer ? customer.name : 'Anonymous Client',
					customerPhone: customer ? customer.phone : 'Not available'
				};
			});

			return {
				jobs: hydratedJobs,
				totalCount: count || 0,
				hasMore: from + jobList.length < (count || 0)
			};
		},

		async getAvailableLocations(status = null) {
			const supabase = getSupabase();
			let query = supabase.from('job_posts').select('location');
			if (status) {
				query = query.eq('status', status);
			}
			const { data, error } = await query;
			if (error) return [];
			const locations = Array.from(
				new Set((data || []).map(j => j.location?.trim()).filter(Boolean))
			).sort((a, b) => a.localeCompare(b));
			return locations;
		},

		async listByCustomer(customerId) {
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('job_posts')
				.select('*')
				.eq('customer_id', customerId)
				.order('created_at', { ascending: false });
			if (error) throw new Error(error.message);
			return data || [];
		},

		async listByWorker(workerId) {
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('job_posts')
				.select('*')
				.eq('worker_id', workerId)
				.order('created_at', { ascending: false });
			if (error) throw new Error(error.message);
			return data || [];
		},

		async findByIds(ids) {
			if (!ids || ids.length === 0) return new Map();
			const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
			if (uniqueIds.length === 0) return new Map();

			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('job_posts')
				.select('*')
				.in('id', uniqueIds);
			if (error) throw new Error(error.message);

			const jobMap = new Map();
			(data || []).forEach(job => jobMap.set(job.id, job));
			return jobMap;
		},

		async delete(id) {
			const supabase = getSupabase();
			const { error } = await supabase
				.from('job_posts')
				.delete()
				.eq('id', id);
			if (error) throw new Error(error.message);
			return true;
		},

		async update(id, updates) {
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('job_posts')
				.update(updates)
				.eq('id', id)
				.select()
				.single();
			if (error) throw new Error(error.message);
			return data;
		}
	},

	reviews: {
		async create({ job_id, customer_id, worker_id, rating, review_text }) {
			const parsed = parseInt(rating, 10);
			const ratingVal = isNaN(parsed) ? 5 : Math.max(-5, Math.min(5, parsed));

			const newReview = {
				id: crypto.randomUUID(),
				job_id,
				customer_id,
				worker_id,
				rating: ratingVal,
				review_text,
				created_at: new Date().toISOString()
			};

			const supabase = getSupabase();
			const { error } = await supabase.from('ratings_reviews').insert(newReview);
			if (error) throw new Error(error.message);
			invalidateWorkerStatsCache(worker_id);
			return newReview;
		},

		async listForWorker(workerId) {
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('ratings_reviews')
				.select('*')
				.eq('worker_id', workerId)
				.order('created_at', { ascending: false });
			if (error) throw new Error(error.message);
			return data || [];
		},

		async listForCustomer(customerId) {
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('ratings_reviews')
				.select('*')
				.eq('customer_id', customerId)
				.order('created_at', { ascending: false });
			if (error) throw new Error(error.message);
			return data || [];
		},

		async getStatsForWorker(workerId) {
			const cached = workerStatsCache.get(workerId);
			if (cached && Date.now() - cached.timestamp < STATS_CACHE_TTL) {
				return cached.data;
			}

			const supabase = getSupabase();

			// Fetch reviews and completed jobs count in PARALLEL
			const [workerReviews, countResult] = await Promise.all([
				this.listForWorker(workerId),
				supabase
					.from('job_posts')
					.select('*', { count: 'exact', head: true })
					.eq('worker_id', workerId)
					.eq('status', 'completed')
			]);

			if (countResult.error) throw new Error(countResult.error.message);
			const count = countResult.count || 0;

			let result;
			if (workerReviews.length === 0) {
				result = {
					average_rating: 0,
					total_reviews: 0,
					completed_jobs_count: count,
					reviews: []
				};
			} else {
				const sum = workerReviews.reduce((acc, curr) => acc + curr.rating, 0);
				const sortedWorkerReviews = [...workerReviews].sort(
					(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
				);

				const customerIds = sortedWorkerReviews.map(r => r.customer_id);
				const customerMap = await db.users.findByIds(customerIds);

				const reviewsWithAuthor = sortedWorkerReviews.map(r => ({
					...r,
					customer_name: customerMap.get(r.customer_id)?.name || 'Anonymous Client'
				}));

				result = {
					average_rating: sum,
					total_reviews: workerReviews.length,
					completed_jobs_count: count,
					reviews: reviewsWithAuthor
				};
			}

			workerStatsCache.set(workerId, { data: result, timestamp: Date.now() });
			return result;
		},

		async listAll() {
			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('ratings_reviews')
				.select('*')
				.order('created_at', { ascending: false });
			if (error) throw new Error(error.message);
			return data || [];
		},

		async delete(id) {
			const supabase = getSupabase();
			const { error } = await supabase
				.from('ratings_reviews')
				.delete()
				.eq('id', id);
			if (error) throw new Error(error.message);
			return true;
		}
	},

	messages: {
		fallbackStore: [],
		fallbackDeletions: [],

		async send({ job_id, sender_id, receiver_id, content }) {
			const msg = {
				id: crypto.randomUUID(),
				job_id,
				sender_id,
				receiver_id,
				content: content.trim(),
				created_at: new Date().toISOString()
			};

			const supabase = getSupabase();
			const { error } = await supabase.from('messages').insert(msg);
			if (error) {
				console.error('Supabase message insert error:', error.message);
				// Still put in fallbackStore for instant local reflection if DB fails
				this.fallbackStore.push(msg);
				throw new Error(error.message);
			}

			// If sender had previously deleted this conversation, clear their deletion record so it's active again
			try {
				await supabase
					.from('conversation_deletions')
					.delete()
					.eq('job_id', job_id)
					.eq('user_id', sender_id)
					.eq('other_user_id', receiver_id);
			} catch (err) {
				console.warn('Error clearing conversation deletion on send:', err.message);
			}
			this.fallbackDeletions = this.fallbackDeletions.filter(
				d => !(d.job_id === job_id && d.user_id === sender_id && d.other_user_id === receiver_id)
			);

			return msg;
		},

		async delete(messageId, senderId) {
			const supabase = getSupabase();
			const { error } = await supabase
				.from('messages')
				.delete()
				.eq('id', messageId)
				.eq('sender_id', senderId);

			if (error) {
				console.error('Supabase message delete error:', error.message);
			}

			this.fallbackStore = this.fallbackStore.filter(m => !(m.id === messageId && m.sender_id === senderId));
			return true;
		},

		async deleteConversationForUser(userId, jobId, otherUserId) {
			const supabase = getSupabase();
			const now = new Date().toISOString();

			// Check if the other user has already deleted this conversation
			let otherDeleted = false;
			try {
				const { data, error } = await supabase
					.from('conversation_deletions')
					.select('*')
					.eq('job_id', jobId)
					.eq('user_id', otherUserId)
					.eq('other_user_id', userId)
					.maybeSingle();

				if (!error && data) {
					otherDeleted = true;
				}
			} catch (err) {
				console.warn('Error checking other user conversation deletion:', err.message);
			}

			if (!otherDeleted) {
				const fallbackMatch = this.fallbackDeletions.find(
					d => d.job_id === jobId && d.user_id === otherUserId && d.other_user_id === userId
				);
				if (fallbackMatch) otherDeleted = true;
			}

			if (otherDeleted) {
				// Both users have deleted the conversation! Permanently delete all messages and deletion records from DB
				try {
					await supabase
						.from('messages')
						.delete()
						.eq('job_id', jobId)
						.in('sender_id', [userId, otherUserId])
						.in('receiver_id', [userId, otherUserId]);

					await supabase
						.from('conversation_deletions')
						.delete()
						.eq('job_id', jobId)
						.in('user_id', [userId, otherUserId])
						.in('other_user_id', [userId, otherUserId]);
				} catch (err) {
					console.error('Error hard deleting conversation messages:', err.message);
				}

				// Also clean fallback stores
				this.fallbackStore = this.fallbackStore.filter(
					m => !(
						m.job_id === jobId &&
						((m.sender_id === userId && m.receiver_id === otherUserId) ||
						 (m.sender_id === otherUserId && m.receiver_id === userId))
					)
				);
				this.fallbackDeletions = this.fallbackDeletions.filter(
					d => !(
						d.job_id === jobId &&
						((d.user_id === userId && d.other_user_id === otherUserId) ||
						 (d.user_id === otherUserId && d.other_user_id === userId))
					)
				);

				return { success: true, hardDeleted: true };
			} else {
				// Only this user has deleted it -> record deletion for this user
				try {
					await supabase
						.from('conversation_deletions')
						.upsert(
							{
								job_id: jobId,
								user_id: userId,
								other_user_id: otherUserId,
								deleted_at: now
							},
							{ onConflict: 'job_id,user_id,other_user_id' }
						);
				} catch (err) {
					console.error('Error saving conversation deletion:', err.message);
				}

				// Update fallback store
				this.fallbackDeletions = this.fallbackDeletions.filter(
					d => !(d.job_id === jobId && d.user_id === userId && d.other_user_id === otherUserId)
				);
				this.fallbackDeletions.push({
					id: crypto.randomUUID(),
					job_id: jobId,
					user_id: userId,
					other_user_id: otherUserId,
					deleted_at: now
				});

				return { success: true, hardDeleted: false };
			}
		},

		async getUserDeletions(userId) {
			const supabase = getSupabase();
			let dbDeletions = [];
			try {
				const { data, error } = await supabase
					.from('conversation_deletions')
					.select('*')
					.eq('user_id', userId);

				if (!error && data) {
					dbDeletions = data;
				}
			} catch (err) {
				console.warn('Error fetching conversation deletions:', err.message);
			}

			const map = new Map();
			for (const d of [...dbDeletions, ...this.fallbackDeletions.filter(d => d.user_id === userId)]) {
				map.set(`${d.job_id}_${d.other_user_id}`, d);
			}
			return map;
		},

		async listForThread(jobId, userAId, userBId, limit = 10, before = null) {
			const supabase = getSupabase();
			let dbMsgs = [];

			// Check if userA has deleted prior messages in this conversation
			let userADeletionTime = null;
			try {
				const { data } = await supabase
					.from('conversation_deletions')
					.select('deleted_at')
					.eq('job_id', jobId)
					.eq('user_id', userAId)
					.eq('other_user_id', userBId)
					.maybeSingle();
				if (data?.deleted_at) {
					userADeletionTime = data.deleted_at;
				}
			} catch (err) {
				console.warn('Error checking user deletion for thread:', err.message);
			}

			if (!userADeletionTime) {
				const fb = this.fallbackDeletions.find(
					d => d.job_id === jobId && d.user_id === userAId && d.other_user_id === userBId
				);
				if (fb?.deleted_at) userADeletionTime = fb.deleted_at;
			}

			try {
				let query = supabase
					.from('messages')
					.select('*')
					.eq('job_id', jobId)
					.in('sender_id', [userAId, userBId])
					.in('receiver_id', [userAId, userBId]);

				if (userADeletionTime) {
					query = query.gt('created_at', userADeletionTime);
				}

				if (before) {
					query = query.lt('created_at', before);
				}

				const { data, error } = await query
					.order('created_at', { ascending: false })
					.limit(limit);

				if (error) {
					console.error('Error fetching thread messages from Supabase:', error.message);
				} else if (data) {
					dbMsgs = data;
				}
			} catch (err) {
				console.warn('Supabase fetch thread exception:', err.message);
			}

			// Combine db and fallback messages
			const fallbackFiltered = this.fallbackStore.filter(
				m => m.job_id === jobId &&
				((m.sender_id === userAId && m.receiver_id === userBId) || (m.sender_id === userBId && m.receiver_id === userAId)) &&
				(!userADeletionTime || new Date(m.created_at).getTime() > new Date(userADeletionTime).getTime()) &&
				(!before || new Date(m.created_at).getTime() < new Date(before).getTime())
			);

			const map = new Map();
			for (const m of [...dbMsgs, ...fallbackFiltered]) {
				map.set(m.id, m);
			}

			// Return sorted chronologically (oldest to newest) for smooth reading
			const sorted = Array.from(map.values()).sort(
				(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
			);

			const messages = sorted.slice(-limit);
			return {
				messages,
				hasMore: dbMsgs.length === limit || messages.length === limit
			};
		},

		async listForUser(userId) {
			const supabase = getSupabase();
			const deletionsMap = await this.getUserDeletions(userId);

			let dbMsgs = [];
			try {
				const { data, error } = await supabase
					.from('messages')
					.select('*')
					.or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
					.order('created_at', { ascending: false })
					.limit(300);

				if (error) {
					console.error('Error fetching recent messages from Supabase:', error.message);
				} else if (data) {
					dbMsgs = data;
				}
			} catch (err) {
				console.warn('Supabase fetch messages exception:', err.message);
			}

			// Combine db and fallback messages
			const fallbackFiltered = this.fallbackStore.filter(
				m => m.sender_id === userId || m.receiver_id === userId
			);

			const map = new Map();
			for (const m of [...dbMsgs, ...fallbackFiltered]) {
				const otherUserId = m.sender_id === userId ? m.receiver_id : m.sender_id;
				const convKey = `${m.job_id}_${otherUserId}`;
				const deletion = deletionsMap.get(convKey);

				// Filter out messages that were created before user's deletion timestamp
				if (deletion && new Date(m.created_at).getTime() <= new Date(deletion.deleted_at).getTime()) {
					continue;
				}

				map.set(m.id, m);
			}

			// Return sorted chronologically (oldest to newest) for smooth reading
			return Array.from(map.values()).sort(
				(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
			);
		},

		async listConversationsForUser(userId, currentUserObj = null) {
			const [allMsgs, deletionsMap] = await Promise.all([
				this.listForUser(userId),
				this.getUserDeletions(userId)
			]);

			const conversationsMap = new Map();

			for (const msg of allMsgs) {
				const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
				const convKey = `${msg.job_id}_${otherUserId}`;

				if (!conversationsMap.has(convKey)) {
					conversationsMap.set(convKey, {
						id: convKey,
						job_id: msg.job_id,
						other_user_id: otherUserId,
						messages: []
					});
				}
				conversationsMap.get(convKey).messages.push(msg);
			}

			// Include all job post applicants and assigned workers into conversations (unless deleted by user)
			const currentUser = currentUserObj || (await db.users.findById(userId));

			if (currentUser) {
				if (currentUser.role === 'customer') {
					// Customer: get jobs owned by this customer only
					const customerJobs = await db.jobs.listByCustomer(userId);
					for (const job of customerJobs) {
						for (const applicantId of (job.applicants || [])) {
							const convKey = `${job.id}_${applicantId}`;
							if (!conversationsMap.has(convKey) && !deletionsMap.has(convKey)) {
								conversationsMap.set(convKey, {
									id: convKey,
									job_id: job.id,
									other_user_id: applicantId,
									messages: []
								});
							}
						}
						if (job.worker_id) {
							const convKey = `${job.id}_${job.worker_id}`;
							if (!conversationsMap.has(convKey) && !deletionsMap.has(convKey)) {
								conversationsMap.set(convKey, {
									id: convKey,
									job_id: job.id,
									other_user_id: job.worker_id,
									messages: []
								});
							}
						}
					}
				} else if (currentUser.role === 'worker') {
					// Worker: get jobs where worker applied or is assigned IN PARALLEL
					const supabase = getSupabase();
					const [workerJobs, appliedJobsRes] = await Promise.all([
						db.jobs.listByWorker(userId),
						supabase
							.from('job_posts')
							.select('*')
							.contains('applicants', [userId])
					]);

					const appliedJobs = appliedJobsRes.data || [];
					const allWorkerJobsMap = new Map();
					(workerJobs || []).forEach(j => allWorkerJobsMap.set(j.id, j));
					(appliedJobs || []).forEach(j => allWorkerJobsMap.set(j.id, j));

					for (const job of allWorkerJobsMap.values()) {
						const convKey = `${job.id}_${job.customer_id}`;
						if (!conversationsMap.has(convKey) && !deletionsMap.has(convKey)) {
							conversationsMap.set(convKey, {
								id: convKey,
								job_id: job.id,
								other_user_id: job.customer_id,
								messages: []
							});
						}
					}
				}
			}

			// Batch hydrate all conversations (other user names and job titles) in 2 queries
			const neededUserIds = [];
			const neededJobIds = [];
			for (const conv of conversationsMap.values()) {
				neededUserIds.push(conv.other_user_id);
				neededJobIds.push(conv.job_id);
			}

			const [userMap, jobMap] = await Promise.all([
				db.users.findByIds(neededUserIds),
				db.jobs.findByIds(neededJobIds)
			]);

			const conversations = [];
			for (const conv of conversationsMap.values()) {
				const otherUser = userMap.get(conv.other_user_id);
				const job = jobMap.get(conv.job_id);

				const sortedMsgs = conv.messages.sort(
					(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
				);
				const lastMsg = sortedMsgs[sortedMsgs.length - 1];
				const defaultTime = job?.created_at || new Date().toISOString();

				let lastMsgContent = 'Inquired on post. Send a message...';
				if (lastMsg && lastMsg.content) {
					if (lastMsg.content.startsWith('[GPS_LOCATION:') && lastMsg.content.endsWith(']')) {
						lastMsgContent = '📍 Shared GPS Location';
					} else if (lastMsg.content.startsWith('[IMAGE_MESSAGE:') && lastMsg.content.endsWith(']')) {
						lastMsgContent = '📷 Sent a photo';
					} else {
						lastMsgContent = lastMsg.content;
					}
				}

				conversations.push({
					...conv,
					job_title: job ? job.title : 'Job Inquiry',
					other_user_name: otherUser ? otherUser.name : 'User',
					other_user_role: otherUser ? otherUser.role : '',
					last_message: lastMsgContent,
					last_message_at: lastMsg ? lastMsg.created_at : defaultTime,
					messages: [],
					messagesLoaded: false
				});
			}

			return conversations.sort(
				(a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
			);
		}
	}
};

