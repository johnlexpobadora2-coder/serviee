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

		async findByIds(ids) {
			if (!ids || ids.length === 0) return new Map();
			const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
			if (uniqueIds.length === 0) return new Map();

			const supabase = getSupabase();
			const { data, error } = await supabase
				.from('users')
				.select('*')
				.in('id', uniqueIds);
			if (error) throw new Error(error.message);

			const userMap = new Map();
			(data || []).forEach(user => userMap.set(user.id, user));
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

			// Batch hydrate reviews with author names
			const customerIds = workerReviews.map(r => r.customer_id);
			const customerMap = await db.users.findByIds(customerIds);

			const reviewsWithAuthor = workerReviews.map(r => ({
				...r,
				customer_name: customerMap.get(r.customer_id)?.name || 'Anonymous Client'
			}));

			return {
				average_rating: avg,
				total_reviews: workerReviews.length,
				completed_jobs_count: count || 0,
				reviews: reviewsWithAuthor
			};
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

		async listConversationsForUser(userId) {
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
			const currentUser = await db.users.findById(userId);

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
					// Worker: get jobs where worker applied or is assigned
					const workerJobs = await db.jobs.listByWorker(userId);
					const supabase = getSupabase();
					const { data: appliedJobs } = await supabase
						.from('job_posts')
						.select('*')
						.contains('applicants', [userId]);

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

