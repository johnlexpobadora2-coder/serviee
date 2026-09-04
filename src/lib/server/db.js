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
			const { name, phone, address } = profile;
			const supabase = getSupabase();
			const updates = {};
			if (name !== undefined) updates.name = name;
			if (phone !== undefined) updates.phone = phone;
			if (address !== undefined) updates.address = address;

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

			const supabase = getSupabase();
			const { error } = await supabase
				.from('users')
				.update({ password_hash: hashPassword(newPassword) })
				.eq('id', id);
			if (error) throw new Error(error.message);
			invalidateUserCache(id);
			return true;
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

			return msg;
		},

		async listForUser(userId) {
			const supabase = getSupabase();
			let dbMsgs = [];
			try {
				const { data, error } = await supabase
					.from('messages')
					.select('*')
					.or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
					.order('created_at', { ascending: false })
					.limit(30);

				if (error) {
					console.error('Error fetching recent 30 messages from Supabase:', error.message);
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
				map.set(m.id, m);
			}

			// Return sorted chronologically (oldest to newest) for smooth reading
			return Array.from(map.values()).sort(
				(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
			);
		},

		async listConversationsForUser(userId, currentUserObj = null) {
			const allMsgs = await this.listForUser(userId);
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

			// Include all job post applicants and assigned workers into conversations
			const currentUser = currentUserObj || (await db.users.findById(userId));

			if (currentUser) {
				if (currentUser.role === 'customer') {
					// Customer: get jobs owned by this customer only (no need for listAll)
					const customerJobs = await db.jobs.listByCustomer(userId);
					for (const job of customerJobs) {
						for (const applicantId of (job.applicants || [])) {
							const convKey = `${job.id}_${applicantId}`;
							if (!conversationsMap.has(convKey)) {
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
							if (!conversationsMap.has(convKey)) {
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
						if (!conversationsMap.has(convKey)) {
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

				conversations.push({
					...conv,
					job_title: job ? job.title : 'Job Inquiry',
					other_user_name: otherUser ? otherUser.name : 'User',
					other_user_role: otherUser ? otherUser.role : '',
					last_message: lastMsg ? lastMsg.content : 'Inquired on post. Send a message...',
					last_message_at: lastMsg ? lastMsg.created_at : defaultTime,
					messages: sortedMsgs
				});
			}

			return conversations.sort(
				(a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
			);
		}
	}
};

