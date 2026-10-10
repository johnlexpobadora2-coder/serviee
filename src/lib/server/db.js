import { env } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { getPhilippineCityCoordinates } from '$lib/philippinesLocations.js';
import { encryptChatMessage, decryptMessageRecord } from '$lib/server/security.js';

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
		console.warn('[WARNING] Supabase keys are empty! Using Mock Client.');
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

const locationsCache = new Map(); // statusKey -> { data, timestamp }
const LOCATIONS_CACHE_TTL = 60 * 1000; // 60s TTL

let homeStatsCache = null;
let homeStatsCacheTimestamp = 0;
const HOME_STATS_CACHE_TTL = 30 * 1000; // 30s TTL

export function invalidateUserCache(userId) {
	if (userId) userCache.delete(userId);
	else userCache.clear();
}

export function invalidateWorkerStatsCache(workerId) {
	if (workerId) workerStatsCache.delete(workerId);
	else workerStatsCache.clear();
}

export function invalidateLocationsCache() {
	locationsCache.clear();
}

export function invalidateHomeStatsCache() {
	homeStatsCache = null;
	homeStatsCacheTimestamp = 0;
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
				avatar: null,
				mask_phone: false,
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


		async updateProfile(id, profile = {}) {
			const { name, phone, address, bio, skills, availability_status, avatar, mask_phone } = profile;
			const supabase = getSupabase();
			const updates = {};
			if (name !== undefined) updates.name = name;
			if (phone !== undefined) updates.phone = phone;
			if (address !== undefined) updates.address = address;
			if (bio !== undefined) updates.bio = typeof bio === 'string' ? bio.trim() : '';
			if (skills !== undefined) updates.skills = Array.isArray(skills) ? skills : [];
			if (availability_status !== undefined) updates.availability_status = availability_status;
			if (avatar !== undefined) updates.avatar = avatar ? String(avatar).trim() : null;
			if (mask_phone !== undefined) updates.mask_phone = Boolean(mask_phone);

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

			const nextVersion = (user.token_version || 1) + 1;
			const supabase = getSupabase();
			const { error } = await supabase
				.from('users')
				.update({ password_hash: newHash, token_version: nextVersion })
				.eq('id', id);
			if (error) throw new Error(error.message);
			invalidateUserCache(id);
			return { success: true, tokenVersion: nextVersion };
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
			let finalLat = latitude !== undefined && latitude !== null && latitude !== '' ? parseFloat(latitude) : null;
			let finalLng = longitude !== undefined && longitude !== null && longitude !== '' ? parseFloat(longitude) : null;

			// Fallback: Resolve centroid coordinates from city / municipality if not manually set
			if ((finalLat === null || isNaN(finalLat) || finalLng === null || isNaN(finalLng)) && location) {
				const cityCoords = getPhilippineCityCoordinates(location);
				if (cityCoords) {
					finalLat = cityCoords.latitude;
					finalLng = cityCoords.longitude;
				}
			}

			const newJob = {
				id: crypto.randomUUID(),
				customer_id,
				worker_id: null,
				title,
				category,
				description,
				location,
				latitude: finalLat,
				longitude: finalLng,
				budget: parseFloat(budget) || 0,
				status: 'open', // 'open' | 'assigned' | 'in_progress' | 'completed'
				target_date: target_date || new Date().toISOString(),
				applicants: [], // Array of Worker UUIDs
				created_at: new Date().toISOString()
			};

			const supabase = getSupabase();
			const { error } = await supabase.from('job_posts').insert(newJob);
			if (error) throw new Error(error.message);
			invalidateLocationsCache();
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
			if (!jobId || !workerId) return;
			const supabase = getSupabase();
			const { data: job, error: fetchError } = await supabase
				.from('job_posts')
				.select('id, status, applicants')
				.eq('id', jobId)
				.single();
			
			if (fetchError || !job) throw new Error('Job post not found.');
			if (job.status !== 'open') throw new Error('This job is no longer accepting applications.');

			const existingApplicants = job.applicants || [];
			if (!existingApplicants.includes(workerId)) {
				const updatedApplicants = Array.from(new Set([...existingApplicants, workerId]));
				const { error: updateError } = await supabase
					.from('job_posts')
					.update({ applicants: updatedApplicants })
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
				let lat = job.latitude !== null && job.latitude !== undefined && job.latitude !== '' ? parseFloat(job.latitude) : null;
				let lng = job.longitude !== null && job.longitude !== undefined && job.longitude !== '' ? parseFloat(job.longitude) : null;

				if ((lat === null || isNaN(lat) || lng === null || isNaN(lng)) && job.location) {
					const cityCoords = getPhilippineCityCoordinates(job.location);
					if (cityCoords) {
						lat = cityCoords.latitude;
						lng = cityCoords.longitude;
					}
				}

				return {
					...job,
					latitude: lat,
					longitude: lng,
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
			const workerStatsMap = await db.reviews.getStatsForWorkersBatch(Array.from(workerAndApplicantIds));

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

				let lat = post.latitude !== null && post.latitude !== undefined && post.latitude !== '' ? parseFloat(post.latitude) : null;
				let lng = post.longitude !== null && post.longitude !== undefined && post.longitude !== '' ? parseFloat(post.longitude) : null;
				if ((lat === null || isNaN(lat) || lng === null || isNaN(lng)) && post.location) {
					const cityCoords = getPhilippineCityCoordinates(post.location);
					if (cityCoords) {
						lat = cityCoords.latitude;
						lng = cityCoords.longitude;
					}
				}

				return {
					...post,
					latitude: lat,
					longitude: lng,
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
			const cacheKey = status || 'all';
			const cached = locationsCache.get(cacheKey);
			if (cached && Date.now() - cached.timestamp < LOCATIONS_CACHE_TTL) {
				return cached.data;
			}

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

			locationsCache.set(cacheKey, { data: locations, timestamp: Date.now() });
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
			invalidateLocationsCache();
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
			invalidateLocationsCache();
			return data;
		}
	},

	reviews: {
		async create({ job_id, customer_id, worker_id, rating, review_text }) {
			const supabase = getSupabase();

			// Idempotency: prevent duplicate reviews for the same job and customer
			if (job_id && customer_id) {
				const { data: existing } = await supabase
					.from('ratings_reviews')
					.select('*')
					.eq('job_id', job_id)
					.eq('customer_id', customer_id)
					.maybeSingle();

				if (existing) {
					return existing;
				}
			}

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

		async getStatsForWorkersBatch(workerIds) {
			if (!workerIds || workerIds.length === 0) return new Map();
			const uniqueIds = Array.from(new Set(workerIds.filter(Boolean)));
			if (uniqueIds.length === 0) return new Map();

			const statsMap = new Map();
			const missingIds = [];

			for (const id of uniqueIds) {
				const cached = workerStatsCache.get(id);
				if (cached && Date.now() - cached.timestamp < STATS_CACHE_TTL) {
					statsMap.set(id, cached.data);
				} else {
					missingIds.push(id);
				}
			}

			if (missingIds.length === 0) {
				return statsMap;
			}

			const supabase = getSupabase();

			// Fetch reviews and completed jobs in parallel for all missing workers in single queries
			const [reviewsRes, completedJobsRes] = await Promise.all([
				supabase
					.from('ratings_reviews')
					.select('*')
					.in('worker_id', missingIds)
					.order('created_at', { ascending: false }),
				supabase
					.from('job_posts')
					.select('worker_id')
					.in('worker_id', missingIds)
					.eq('status', 'completed')
			]);

			const allReviews = reviewsRes.data || [];
			const allCompletedJobs = completedJobsRes.data || [];

			const completedCountMap = new Map();
			for (const job of allCompletedJobs) {
				if (job.worker_id) {
					completedCountMap.set(job.worker_id, (completedCountMap.get(job.worker_id) || 0) + 1);
				}
			}

			const workerReviewsMap = new Map();
			for (const rev of allReviews) {
				if (!workerReviewsMap.has(rev.worker_id)) {
					workerReviewsMap.set(rev.worker_id, []);
				}
				workerReviewsMap.get(rev.worker_id).push(rev);
			}

			const customerIds = Array.from(new Set(allReviews.map(r => r.customer_id).filter(Boolean)));
			const customerMap = await db.users.findByIds(customerIds);

			for (const workerId of missingIds) {
				const workerReviews = workerReviewsMap.get(workerId) || [];
				const count = completedCountMap.get(workerId) || 0;

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
					const reviewsWithAuthor = workerReviews.map(r => ({
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
				statsMap.set(workerId, result);
			}

			return statsMap;
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
			const cleanContent = content.trim();
			const encryptedContent = encryptChatMessage(cleanContent);

			const dbRecord = {
				id: crypto.randomUUID(),
				job_id,
				sender_id,
				receiver_id,
				content: encryptedContent,
				created_at: new Date().toISOString()
			};

			const supabase = getSupabase();
			const { error } = await supabase.from('messages').insert(dbRecord);
			if (error) {
				console.error('Supabase message insert error:', error.message);
				// Still put in fallbackStore for instant local reflection if DB fails
				this.fallbackStore.push(dbRecord);
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

			// Return decrypted plaintext to the caller for immediate UI display
			return {
				...dbRecord,
				content: cleanContent
			};
		},

		async delete(messageId, senderId) {
			if (!messageId || !senderId) return false;

			const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId);

			const supabase = getSupabase();
			if (isUuid) {
				const { error } = await supabase
					.from('messages')
					.delete()
					.eq('id', messageId)
					.eq('sender_id', senderId);

				if (error) {
					console.error('Supabase message delete error:', error.message);
					throw new Error(error.message);
				}
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
				map.set(m.id, decryptMessageRecord(m));
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

				map.set(m.id, decryptMessageRecord(m));
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
						lastMsgContent = 'Shared GPS Location';
					} else if (lastMsg.content.startsWith('[IMAGE_MESSAGE:') && lastMsg.content.endsWith(']')) {
						lastMsgContent = 'Sent a photo';
					} else {
						lastMsgContent = lastMsg.content;
					}
				}

				conversations.push({
					...conv,
					job_title: job ? job.title : 'Job Inquiry',
					other_user_name: otherUser ? otherUser.name : 'User',
					other_user_role: otherUser ? otherUser.role : '',
					other_user_avatar: otherUser ? (otherUser.avatar || null) : null,
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
	},

	savedJobs: {
		async listByUser(userId) {
			if (!userId) return [];
			const supabase = getSupabase();
			try {
				const { data, error } = await supabase
					.from('saved_jobs')
					.select('job_id, created_at')
					.eq('user_id', userId)
					.order('created_at', { ascending: false });

				if (error) {
					console.error('Error fetching saved_jobs from Supabase:', error.message);
					throw new Error(error.message);
				}

				if (!data || data.length === 0) return [];
				const jobIds = Array.from(new Set(data.map(d => d.job_id).filter(Boolean)));
				if (jobIds.length === 0) return [];

				const jobMap = await db.jobs.findByIds(jobIds);
				const customerIds = Array.from(new Set(Array.from(jobMap.values()).map(j => j.customer_id).filter(Boolean)));
				const customerMap = await db.users.findByIds(customerIds);

				const savedList = [];
				for (const item of data) {
					const job = jobMap.get(item.job_id);
					if (job) {
						const customer = customerMap.get(job.customer_id);
						let lat = job.latitude !== null && job.latitude !== undefined && job.latitude !== '' ? parseFloat(job.latitude) : null;
						let lng = job.longitude !== null && job.longitude !== undefined && job.longitude !== '' ? parseFloat(job.longitude) : null;
						if ((lat === null || isNaN(lat) || lng === null || isNaN(lng)) && job.location) {
							const cityCoords = getPhilippineCityCoordinates(job.location);
							if (cityCoords) {
								lat = cityCoords.latitude;
								lng = cityCoords.longitude;
							}
						}

						savedList.push({
							...job,
							latitude: lat,
							longitude: lng,
							customerName: customer ? customer.name : 'Client',
							savedAt: new Date(item.created_at).getTime()
						});
					}
				}
				return savedList;
			} catch (err) {
				console.error('Error in db.savedJobs.listByUser:', err.message);
				throw err;
			}
		},

		async isSaved(userId, jobId) {
			if (!userId || !jobId) return false;
			const supabase = getSupabase();
			try {
				const { data, error } = await supabase
					.from('saved_jobs')
					.select('id')
					.eq('user_id', userId)
					.eq('job_id', jobId)
					.maybeSingle();

				if (error || !data) return false;
				return true;
			} catch (e) {
				return false;
			}
		},

		async toggle(userId, job) {
			if (!userId || !job || !job.id) return { isSaved: false };
			const supabase = getSupabase();
			const jobId = job.id;

			try {
				const { data: existing, error: checkError } = await supabase
					.from('saved_jobs')
					.select('id')
					.eq('user_id', userId)
					.eq('job_id', jobId)
					.maybeSingle();

				if (checkError) {
					console.error('Error checking saved_jobs in DB:', checkError.message);
					throw new Error(checkError.message);
				}

				if (existing) {
					const { error: delError } = await supabase
						.from('saved_jobs')
						.delete()
						.eq('user_id', userId)
						.eq('job_id', jobId);

					if (delError) {
						console.error('Error deleting saved_job in DB:', delError.message);
						throw new Error(delError.message);
					}
					return { isSaved: false };
				} else {
					const { error: insError } = await supabase
						.from('saved_jobs')
						.insert({
							id: crypto.randomUUID(),
							user_id: userId,
							job_id: jobId,
							created_at: new Date().toISOString()
						});

					if (insError) {
						if (insError.code === '23505' || insError.message?.includes('duplicate key') || insError.message?.includes('unique')) {
							// Already exists from a concurrent click, delete to untoggle
							await supabase.from('saved_jobs').delete().eq('user_id', userId).eq('job_id', jobId);
							return { isSaved: false };
						}
						console.error('Error inserting saved_job in DB:', insError.message);
						throw new Error(insError.message);
					}
					return { isSaved: true };
				}
			} catch (err) {
				console.error('Error toggling saved job in DB:', err.message);
				throw err;
			}
		},

		async remove(userId, jobId) {
			if (!userId || !jobId) return;
			const supabase = getSupabase();
			try {
				const { error } = await supabase
					.from('saved_jobs')
					.delete()
					.eq('user_id', userId)
					.eq('job_id', jobId);
				if (error) throw new Error(error.message);
			} catch (err) {
				console.error('Error removing saved job:', err.message);
				throw err;
			}
		},

		async clearByUser(userId) {
			if (!userId) return;
			const supabase = getSupabase();
			try {
				const { error } = await supabase
					.from('saved_jobs')
					.delete()
					.eq('user_id', userId);
				if (error) throw new Error(error.message);
			} catch (err) {
				console.error('Error clearing saved jobs:', err.message);
				throw err;
			}
		}
	},

	stats: {
		async getHomepageStats() {
			if (homeStatsCache && Date.now() - homeStatsCacheTimestamp < HOME_STATS_CACHE_TTL) {
				return homeStatsCache;
			}
			const supabase = getSupabase();
			try {
				const [activeRes, completedRes, workersRes] = await Promise.all([
					supabase.from('job_posts').select('*', { count: 'exact', head: true }).neq('status', 'completed'),
					supabase.from('job_posts').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
					supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'worker')
				]);

				const stats = {
					activeJobs: activeRes.count ?? 0,
					completedJobs: completedRes.count ?? 0,
					totalWorkers: workersRes.count ?? 0
				};

				homeStatsCache = stats;
				homeStatsCacheTimestamp = Date.now();
				return stats;
			} catch (err) {
				console.error('Error fetching homepage stats from DB:', err?.message);
				return homeStatsCache || { activeJobs: 0, completedJobs: 0, totalWorkers: 0 };
			}
		}
	},

	auditLogs: {
		/**
		 * Record a sensitive security or administrative action
		 * @param {Object} entry
		 * @param {string} [entry.adminId]
		 * @param {string} entry.action
		 * @param {string} [entry.targetId]
		 * @param {string} [entry.targetType]
		 * @param {any} [entry.details]
		 * @param {string} [entry.ip]
		 */
		async record({ adminId = 'admin_master', action, targetId = null, targetType = 'general', details = null, ip = '127.0.0.1' }) {
			const supabase = getSupabase();
			const timestamp = new Date().toISOString();
			const logEntry = {
				admin_id: adminId || 'admin_master',
				action: action || 'UNKNOWN_ACTION',
				target_id: targetId !== null && targetId !== undefined ? String(targetId) : null,
				target_type: targetType || 'general',
				details: details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : null,
				ip_address: ip || '127.0.0.1',
				created_at: timestamp
			};

			console.log(`[AUDIT LOG] ${timestamp} | Admin: ${adminId} | Action: ${action} | Target: ${targetId} | IP: ${ip}`);

			try {
				const { data, error } = await supabase.from('audit_logs').insert([logEntry]).select().single();
				if (error) {
					console.warn('Notice: audit_logs DB insert error:', error.message);
					return { ...logEntry, id: crypto.randomUUID?.() || Date.now().toString() };
				}
				return data || logEntry;
			} catch (err) {
				console.warn('Notice: audit_logs DB write caught error:', err.message);
				return logEntry;
			}
		},

		/**
		 * Fetch latest audit logs ordered by creation date descending
		 * @param {number} [limit=250]
		 * @returns {Promise<Array<any>>}
		 */
		async listAll(limit = 250) {
			const supabase = getSupabase();
			try {
				const { data, error } = await supabase
					.from('audit_logs')
					.select('*')
					.order('created_at', { ascending: false })
					.limit(limit);

				if (error) {
					console.warn('Notice: Failed to fetch audit_logs from DB (table may not exist yet):', error.message);
					return [];
				}
				return data || [];
			} catch (err) {
				console.warn('Notice: Error listing audit logs:', err.message);
				return [];
			}
		},

		/**
		 * Clear all audit logs (admin maintenance)
		 */
		async clearAll() {
			const supabase = getSupabase();
			try {
				const { error } = await supabase
					.from('audit_logs')
					.delete()
					.neq('id', '00000000-0000-0000-0000-000000000000');

				if (error) {
					console.warn('Notice: Failed to clear audit_logs:', error.message);
					throw error;
				}
				return true;
			} catch (err) {
				console.error('Error clearing audit logs:', err);
				throw err;
			}
		}
	},

	sessions: {
		/**
		 * Creates and records an active user session in user_sessions table
		 * @param {{ userId: string, sessionId: string, deviceType: string, os: string, browser: string, ip: string, userAgent: string }} sessionData
		 */
		async create({ userId, sessionId, deviceType, os, browser, ip, userAgent }) {
			const supabase = getSupabase();
			const sessionRecord = {
				id: crypto.randomUUID(),
				user_id: userId,
				session_id: sessionId,
				device_type: deviceType || 'desktop',
				os: os || 'Unknown OS',
				browser: browser || 'Web Browser',
				ip_address: ip || '',
				user_agent: userAgent || '',
				last_active_at: new Date().toISOString(),
				created_at: new Date().toISOString()
			};

			try {
				const { error } = await supabase.from('user_sessions').insert(sessionRecord);
				if (error) {
					console.warn('Notice: Failed to insert user_session (table may need schema migration):', error.message);
				}
				return sessionRecord;
			} catch (err) {
				console.warn('Notice: Error creating user session:', err.message);
				return sessionRecord;
			}
		},

		/**
		 * Finds all active sessions for a given user
		 * @param {string} userId
		 * @returns {Promise<Array<any>>}
		 */
		async findByUserId(userId) {
			if (!userId) return [];
			const supabase = getSupabase();
			try {
				const { data, error } = await supabase
					.from('user_sessions')
					.select('*')
					.eq('user_id', userId)
					.order('last_active_at', { ascending: false });

				if (error) {
					console.warn('Notice: Failed to fetch user_sessions:', error.message);
					return [];
				}
				return data || [];
			} catch (err) {
				console.warn('Notice: Error fetching user sessions:', err.message);
				return [];
			}
		},

		/**
		 * Finds a session by unique session_id
		 * @param {string} sessionId
		 * @returns {Promise<any|null>}
		 */
		async findBySessionId(sessionId) {
			if (!sessionId) return null;
			const supabase = getSupabase();
			try {
				const { data, error } = await supabase
					.from('user_sessions')
					.select('*')
					.eq('session_id', sessionId)
					.maybeSingle();

				if (error) {
					if (error.code === '42P01' || error.message?.includes('does not exist')) {
						return { session_id: sessionId, fallback: true };
					}
					return null;
				}
				return data || null;
			} catch (err) {
				return null;
			}
		},

		/**
		 * Updates last_active_at timestamp for a session
		 * @param {string} sessionId
		 * @param {string} [ip='']
		 */
		async touch(sessionId, ip = '') {
			if (!sessionId) return;
			const supabase = getSupabase();
			try {
				const updatePayload = {
					last_active_at: new Date().toISOString()
				};
				if (ip) {
					updatePayload.ip_address = ip;
				}
				await supabase.from('user_sessions').update(updatePayload).eq('session_id', sessionId);
			} catch (err) {
				// Silent fail on touch
			}
		},

		/**
		 * Deletes a session by its unique session_id
		 * @param {string} sessionId
		 */
		async deleteBySessionId(sessionId) {
			if (!sessionId) return;
			const supabase = getSupabase();
			try {
				await supabase.from('user_sessions').delete().eq('session_id', sessionId);
			} catch (err) {
				console.warn('Notice: Error deleting session:', err.message);
			}
		},

		/**
		 * Deletes all sessions for a user (or all except a specific session)
		 * @param {string} userId
		 * @param {string|null} [exceptSessionId=null]
		 */
		async deleteAllForUser(userId, exceptSessionId = null) {
			if (!userId) return;
			const supabase = getSupabase();
			try {
				let query = supabase.from('user_sessions').delete().eq('user_id', userId);
				if (exceptSessionId) {
					query = query.neq('session_id', exceptSessionId);
				}
				await query;
			} catch (err) {
				console.warn('Notice: Error clearing user sessions:', err.message);
			}
		}
	},

	support: {
		fallbackTickets: [],
		fallbackMessages: [],

		/**
		 * List all support tickets for admin
		 */
		async listAllTickets() {
			const supabase = getSupabase();
			let dbTickets = [];
			try {
				const { data, error } = await supabase
					.from('support_tickets')
					.select('*')
					.order('updated_at', { ascending: false });
				if (!error && data) {
					dbTickets = data;
				}
			} catch (err) {
				console.warn('Notice: Error fetching support tickets from Supabase:', err.message);
			}

			const map = new Map();
			for (const t of [...dbTickets, ...this.fallbackTickets]) {
				map.set(t.id, t);
			}
			return Array.from(map.values()).sort(
				(a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
			);
		},

		/**
		 * List all tickets for a specific user
		 * @param {string} userId
		 */
		async listTicketsForUser(userId) {
			if (!userId) return [];
			const supabase = getSupabase();
			let dbTickets = [];
			try {
				const { data, error } = await supabase
					.from('support_tickets')
					.select('*')
					.eq('user_id', userId)
					.order('updated_at', { ascending: false });
				if (!error && data) {
					dbTickets = data;
				}
			} catch (err) {
				console.warn('Notice: Error fetching user support tickets:', err.message);
			}

			const map = new Map();
			const userFallback = this.fallbackTickets.filter(t => t.user_id === userId);
			for (const t of [...dbTickets, ...userFallback]) {
				map.set(t.id, t);
			}
			return Array.from(map.values()).sort(
				(a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
			);
		},

		/**
		 * Get a single ticket by ID
		 * @param {string} ticketId
		 */
		async getTicketById(ticketId) {
			if (!ticketId) return null;
			const supabase = getSupabase();
			try {
				const { data, error } = await supabase
					.from('support_tickets')
					.select('*')
					.eq('id', ticketId)
					.maybeSingle();
				if (!error && data) return data;
			} catch (err) {
				// ignore
			}
			return this.fallbackTickets.find(t => t.id === ticketId) || null;
		},

		/**
		 * Create a new support inquiry ticket
		 */
		async createTicket({ userId, userName, userEmail, userRole, category = 'general', subject, initialMessage }) {
			const supabase = getSupabase();
			const ticketId = crypto.randomUUID();
			const now = new Date().toISOString();

			const newTicket = {
				id: ticketId,
				user_id: userId,
				user_name: userName || 'Serviee User',
				user_email: userEmail || '',
				user_role: userRole || 'customer',
				category: category || 'general',
				subject: subject || 'General Inquiry',
				status: 'open',
				unread_admin: true,
				unread_user: false,
				created_at: now,
				updated_at: now
			};

			// Always keep in local fallback store for instantaneous consistency
			this.fallbackTickets.unshift(newTicket);

			try {
				const { error } = await supabase.from('support_tickets').insert(newTicket);
				if (error) {
					console.warn('Notice: Supabase insert support ticket error:', error.message);
				}
			} catch (err) {
				console.warn('Notice: Supabase insert support ticket exception:', err.message);
			}

			if (initialMessage && initialMessage.trim()) {
				await this.sendMessage({
					ticketId,
					senderType: 'user',
					senderId: userId,
					senderName: userName || 'User',
					content: initialMessage.trim()
				});
			}

			return newTicket;
		},

		/**
		 * List all messages in a ticket
		 * @param {string} ticketId
		 */
		async listMessagesForTicket(ticketId) {
			if (!ticketId) return [];
			const supabase = getSupabase();
			let dbMsgs = [];
			try {
				const { data, error } = await supabase
					.from('support_messages')
					.select('*')
					.eq('ticket_id', ticketId)
					.order('created_at', { ascending: true });
				if (!error && data) {
					dbMsgs = data;
				}
			} catch (err) {
				console.warn('Notice: Error fetching support messages:', err.message);
			}

			const map = new Map();
			const fbMsgs = this.fallbackMessages.filter(m => m.ticket_id === ticketId);
			for (const m of [...dbMsgs, ...fbMsgs]) {
				map.set(m.id, decryptMessageRecord(m));
			}

			return Array.from(map.values()).sort(
				(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
			);
		},

		/**
		 * Send a message within a support ticket
		 */
		async sendMessage({ ticketId, senderType, senderId, senderName, content }) {
			const cleanContent = content.trim();
			const encryptedContent = encryptChatMessage(cleanContent);
			const msgId = crypto.randomUUID();
			const now = new Date().toISOString();

			const msgRecord = {
				id: msgId,
				ticket_id: ticketId,
				sender_type: senderType, // 'user' | 'admin'
				sender_id: senderId,
				sender_name: senderName || (senderType === 'admin' ? 'Serviee Support Team' : 'User'),
				content: encryptedContent,
				created_at: now
			};

			// Always store in memory for immediate sync
			this.fallbackMessages.push(msgRecord);

			const supabase = getSupabase();
			try {
				const { error } = await supabase.from('support_messages').insert(msgRecord);
				if (error) {
					console.warn('Notice: Supabase insert support message error:', error.message);
				}
			} catch (err) {
				console.warn('Notice: Supabase insert support message exception:', err.message);
			}

			// Update ticket's updated_at and unread flags
			const updatePayload = {
				updated_at: now,
				unread_admin: senderType === 'user',
				unread_user: senderType === 'admin'
			};

			if (senderType === 'admin') {
				updatePayload.status = 'in_progress';
			}

			try {
				await supabase.from('support_tickets').update(updatePayload).eq('id', ticketId);
			} catch (err) {
				// ignore
			}

			const fbTicket = this.fallbackTickets.find(t => t.id === ticketId);
			if (fbTicket) {
				Object.assign(fbTicket, updatePayload);
			}

			return {
				...msgRecord,
				content: cleanContent
			};
		},

		/**
		 * Update the status of a ticket
		 * @param {string} ticketId
		 * @param {'open' | 'in_progress' | 'resolved' | 'closed'} status
		 */
		async updateTicketStatus(ticketId, status) {
			const supabase = getSupabase();
			const now = new Date().toISOString();
			try {
				await supabase.from('support_tickets').update({ status, updated_at: now }).eq('id', ticketId);
			} catch (err) {
				// ignore
			}
			const fbTicket = this.fallbackTickets.find(t => t.id === ticketId);
			if (fbTicket) {
				fbTicket.status = status;
				fbTicket.updated_at = now;
			}
			return true;
		},

		/**
		 * Mark ticket as read
		 * @param {string} ticketId
		 * @param {'admin' | 'user'} readerType
		 */
		async markAsRead(ticketId, readerType = 'admin') {
			const supabase = getSupabase();
			const field = readerType === 'admin' ? 'unread_admin' : 'unread_user';
			try {
				await supabase.from('support_tickets').update({ [field]: false }).eq('id', ticketId);
			} catch (err) {
				// ignore
			}
			const fbTicket = this.fallbackTickets.find(t => t.id === ticketId);
			if (fbTicket) {
				fbTicket[field] = false;
			}
			return true;
		},

		/**
		 * Delete a support ticket and all its messages
		 * @param {string} ticketId
		 */
		async deleteTicket(ticketId) {
			const supabase = getSupabase();
			try {
				await supabase.from('support_messages').delete().eq('ticket_id', ticketId);
				await supabase.from('support_tickets').delete().eq('id', ticketId);
			} catch (err) {
				// ignore
			}
			this.fallbackMessages = this.fallbackMessages.filter(m => m.ticket_id !== ticketId);
			this.fallbackTickets = this.fallbackTickets.filter(t => t.id !== ticketId);
			return true;
		}
	}
};


