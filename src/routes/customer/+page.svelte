<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { MessageSquare, Pin, RefreshCw, Star, UserCheck, Plus, User } from 'lucide-svelte';
	import ViewProfileModal from '$lib/ViewProfileModal.svelte';

	let { data, form } = $props();

	let activeTab = $state('feed'); // 'feed' | 'my-jobs' | 'chat' | 'profile'
	let activeConvId = $state('');
	let newMessageContent = $state('');
	let sendingMessage = $state(false);
	let isRefreshingChat = $state(false);

	// View Profile Modal State
	let showViewProfileModal = $state(false);
	let viewProfileUserId = $state(null);

	function openViewProfile(userId) {
		if (!userId) return;
		viewProfileUserId = userId;
		showViewProfileModal = true;
	}

	async function refreshChatData() {
		isRefreshingChat = true;
		try {
			const res = await fetch('/api/messages');
			if (res.ok) {
				const result = await res.json();
				if (result.conversations) {
					data.conversations = result.conversations;
				}
			}
		} catch (err) {
			console.error('Failed to refresh chat:', err);
		} finally {
			isRefreshingChat = false;
		}
	}

	let activeConversation = $derived(
		data.conversations?.find(c => c.id === activeConvId) || data.conversations?.[0] || null
	);

	function openChat(jobId, workerId) {
		activeConvId = `${jobId}_${workerId}`;
		activeTab = 'chat';
	}

	let searchCategory = $state('');
	let searchLocation = $state('');
	/** @type {number | null} */
	let minBudget = $state(null);

	// Client-side category filtering helper for global feed
	let filteredJobs = $derived(
		(data.allJobs || []).filter(job => {
			const isNotCompleted = job.status !== 'completed';
			const matchesCategory = !searchCategory || job.category === searchCategory;
			const matchesLocation = !searchLocation || job.location.toLowerCase().includes(searchLocation.toLowerCase());
			const matchesBudget = !minBudget || job.budget >= minBudget;
			return isNotCompleted && matchesCategory && matchesLocation && matchesBudget;
		})
	);

	let activeJobs = $derived(data.posts.filter(job => job.status !== 'completed'));
	let completedJobs = $derived(data.posts.filter(job => job.status === 'completed'));

	// Modal State
	let showRatingModal = $state(false);
	/** @type {any} */
	let activeJobForRating = $state(null);
	let ratingValue = $state(5);
	let reviewText = $state('');

	// Client-side loading state
	let postingJob = $state(false);
	let changingStatus = $state(false);

	// Category mapping for badge styling helper
	function getCategoryBadge(category) {
		switch (category) {
			case 'Plumbing / Tubero': return 'badge-plumbing';
			case 'Roofing / Ayos Yero': return 'badge-roofing';
			case 'Excavation / Hukay Lupa': return 'badge-excavation';
			case 'Gardening': return 'badge-gardening';
			case 'Carpentry': return 'badge-carpentry';
			default: return 'badge-general';
		}
	}

	function openRatingModal(job) {
		activeJobForRating = job;
		ratingValue = 5;
		reviewText = '';
		showRatingModal = true;
	}

	function selectRating(val) {
		ratingValue = val;
	}
</script>

<svelte:head>
	<title>Customer Dashboard | Serviee</title>
</svelte:head>

<!-- Tab Navigation Header -->
<div class="tabs-header">
	<button 
		type="button" 
		class="tab-btn {activeTab === 'feed' ? 'active' : ''}" 
		onclick={() => activeTab = 'feed'}
		id="tab-feed-btn"
	>
		Sideline Feed (Job Board)
	</button>
	<button 
		type="button" 
		class="tab-btn {activeTab === 'my-jobs' ? 'active' : ''}" 
		onclick={() => activeTab = 'my-jobs'}
		id="tab-myjobs-btn"
	>
		My Active Jobs ({activeJobs.length})
	</button>
	<button 
		type="button" 
		class="tab-btn {activeTab === 'chat' ? 'active' : ''}" 
		onclick={() => activeTab = 'chat'}
		id="tab-chat-btn"
		style="display: inline-flex; align-items: center; gap: 0.4rem;"
	>
		<MessageSquare size={16} /> Messages ({data.conversations?.length || 0})
	</button>
	<button 
		type="button" 
		class="tab-btn {activeTab === 'profile' ? 'active' : ''}" 
		onclick={() => activeTab = 'profile'}
		id="tab-profile-btn"
	>
		My Profile & History
	</button>
</div>

{#if form?.success}
	<div style="background-color: var(--success-light); border: 1px solid var(--success); color: var(--text-primary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.95rem;">
		{form.success}
	</div>
{/if}

{#if form?.error}
	<div style="background-color: var(--error-light); border: 1px solid var(--error); color: var(--text-primary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.95rem;">
		{form.error}
	</div>
{/if}

<!-- TAB 1: SIDELINE FEED (GLOBAL JOB BOARD + FILTERS) -->
{#if activeTab === 'feed'}
	<div class="dashboard-layout">
		
		<!-- Filters sidebar -->
		<aside class="card" style="position: sticky; top: 90px; padding: 1.5rem; height: fit-content;">
			<h4 style="font-size: 1.25rem; margin-bottom: 1rem;">Filter Jobs</h4>
			
			<div class="form-group">
				<label for="filter-category">Category</label>
				<select id="filter-category" bind:value={searchCategory}>
					<option value="">All Categories</option>
					<option value="Plumbing / Tubero">Plumbing / Tubero</option>
					<option value="Roofing / Ayos Yero">Roofing / Ayos Yero</option>
					<option value="Excavation / Hukay Lupa">Excavation / Hukay Lupa</option>
					<option value="Gardening">Gardening / Landscape</option>
					<option value="Carpentry">Carpentry / Karpintero</option>
					<option value="General Manual Labor">General Manual Labor</option>
				</select>
			</div>

			<div class="form-group">
				<label for="filter-location">Location (Barangay/City)</label>
				<input 
					type="text" 
					id="filter-location" 
					placeholder="E.g. Pasig" 
					bind:value={searchLocation} 
				/>
			</div>

			<div class="form-group" style="margin-bottom: 0;">
				<label for="filter-budget">Minimum Budget (₱)</label>
				<input 
					type="number" 
					id="filter-budget" 
					placeholder="E.g. 500" 
					bind:value={minBudget} 
				/>
			</div>
		</aside>

		<!-- Feed stream list -->
		<section style="display: flex; flex-direction: column; gap: 1.5rem;">
			<div style="display: flex; justify-content: space-between; align-items: center;">
				<h2 style="font-size: 1.5rem;">All Available Postings ({filteredJobs.length})</h2>
				<a href="/customer/post-job" class="btn btn-primary" style="width: auto; padding: 0.5rem 1.25rem;">
					+ Post a Job
				</a>
			</div>

			{#if filteredJobs.length === 0}
				<div class="card" style="text-align: center; padding: 4rem 2rem; border-style: dashed;">
					<h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">No job postings found.</h4>
					<p style="color: var(--text-secondary); font-size: 0.9rem;">
						Try modifying your filters or check back later for new job postings.
					</p>
				</div>
			{:else}
				{#each filteredJobs as job (job.id)}
					<div class="card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
						
						<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
							<div>
								<div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
									<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
									<span class="status status-{job.status}">
										{#if job.status === 'open'} Open
										{:else if job.status === 'assigned'} Assigned
										{:else if job.status === 'in_progress'} In Progress
										{:else} Completed
										{/if}
									</span>
									<span style="font-size: 0.8rem; color: var(--text-muted);">
										Posted: {new Date(job.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
									</span>
								</div>
								<h3 style="font-size: 1.35rem; color: var(--text-primary);">{job.title}</h3>
								<span style="font-size: 0.85rem; color: var(--text-secondary);">
									Posted by: 
									{#if job.customer_id !== data.user.id}
										<button 
											type="button" 
											style="background: none; border: none; color: var(--accent); font-weight: 600; cursor: pointer; text-decoration: underline; padding: 0; font-size: inherit;"
											onclick={() => openViewProfile(job.customer_id)}
										>
											{job.customerName}
										</button>
									{:else}
										<strong>{job.customerName} (You)</strong>
									{/if}
								</span>
							</div>
							<div style="text-align: right;">
								<strong style="color: var(--accent); font-size: 1.25rem; display: block;">₱{job.budget.toLocaleString()}</strong>
							</div>
						</div>

						<p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6;">
							{job.description}
						</p>

						<div class="metadata-bar">
							<div><strong>Location:</strong> {job.location}</div>
							<div><strong>Schedule:</strong> {new Date(job.target_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
						</div>

					</div>
				{/each}
			{/if}
		</section>
	</div>
{/if}

<!-- TAB 2: MY ACTIVE JOBS -->
{#if activeTab === 'my-jobs'}
	<div style="max-width: 900px; margin: 0 auto; width: 100%;">
		<!-- Dashboard Header -->
		<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
			<h2 style="font-size: 1.75rem; margin: 0;">My Active Jobs ({activeJobs.length})</h2>
			<a href="/customer/post-job" class="btn btn-primary" style="width: auto; padding: 0.6rem 1.5rem;" id="post-new-job-btn">
				+ Post a New Job
			</a>
		</div>

		<div style="display: flex; flex-direction: column; gap: 1.5rem;">
			{#if activeJobs.length === 0}
				<div class="card" style="text-align: center; padding: 5rem 2rem; border-style: dashed;">
					<h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">You have no active jobs right now.</h4>
					<p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 450px; margin: 0 auto 1.5rem auto;">
						Post a job describing what you need to connect with local sideline workers and handymen in your area.
					</p>
					<a href="/customer/post-job" class="btn btn-primary" style="width: auto; display: inline-flex; margin: 0 auto;">
						Post Your First Job
					</a>
				</div>
			{:else}
				{#each activeJobs as job (job.id)}
					<div class="card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem;">
						
						<!-- Job Header -->
						<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
							<div>
								<h3 style="font-size: 1.35rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
									{job.title}
								</h3>
								<div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
									<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
									<span style="color: var(--text-muted); font-size: 0.85rem;">
										Posted on: {new Date(job.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
									</span>
								</div>
							</div>

							<div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem;">
								<span class="status status-{job.status}">
									{#if job.status === 'open'} Naghahanap
									{:else if job.status === 'assigned'} Assigned
									{:else if job.status === 'in_progress'} In Progress
									{:else} Completed
									{/if}
								</span>
								<strong style="color: var(--accent); font-size: 1.2rem;">₱{job.budget.toLocaleString()}</strong>
							</div>
						</div>

						<!-- Details Info -->
						<div style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; border-left: 2px solid var(--border-color); padding-left: 1rem;">
							<p>{job.description}</p>
						</div>

						<!-- Metadata details bar -->
						<div class="metadata-bar">
							<div><strong>Location:</strong> {job.location}</div>
							<div><strong>Target Date:</strong> {new Date(job.target_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
						</div>

						<!-- WORKER ASSIGNMENT & STATUS ACTIONS -->
						<div style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 0.5rem;">
							{#if job.status === 'open'}
								<h4 style="font-size: 0.95rem; margin-bottom: 0.75rem; color: var(--text-primary);">
									Applicants ({job.applicants.length})
								</h4>
								{#if job.applicants.length === 0}
									<p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">
										Waiting for interested handymen or workers to apply...
									</p>
								{:else}
									<div style="display: flex; flex-direction: column; gap: 0.75rem;">
										{#each job.applicants as applicant (applicant.id)}
											<div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-md); flex-wrap: wrap; gap: 0.5rem;">
												<div>
													<strong style="color: var(--text-primary);">{applicant.name}</strong>
													<div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; font-size: 0.8rem; color: var(--text-secondary);">
														<span class="rating-badge {applicant.average_rating > 0 ? 'rating-badge-positive' : applicant.average_rating < 0 ? 'rating-badge-negative' : 'rating-badge-zero'}" style="display: inline-flex; align-items: center; gap: 0.2rem;">
															<Star size={12} fill="currentColor" /> {applicant.average_rating > 0 ? `+${applicant.average_rating}` : applicant.average_rating} rating
														</span>
														<span>•</span>
														<span>Completed: {applicant.completed_jobs_count} sidelines</span>
														<span>•</span>
														<span>Phone: {applicant.phone}</span>
													</div>
													<span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 0.25rem;">Address: {applicant.address}</span>
												</div>
												<div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
													<button 
														type="button" 
														class="btn btn-outline" 
														style="padding: 0.4rem 0.85rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;"
														onclick={() => openViewProfile(applicant.id)}
													>
														<User size={14} /> Profile
													</button>
													<button 
														type="button" 
														class="btn btn-outline" 
														style="padding: 0.4rem 0.85rem; font-size: 0.85rem; border-color: var(--accent); color: var(--accent-hover); display: inline-flex; align-items: center; gap: 0.35rem;"
														onclick={() => openChat(job.id, applicant.id)}
													>
														<MessageSquare size={14} /> Open Chat
													</button>

													<form method="POST" action="?/assignWorker" use:enhance={() => {
														changingStatus = true;
														return async ({ update }) => {
															changingStatus = false;
															await update();
														};
													}}>
														<input type="hidden" name="jobId" value={job.id} />
														<input type="hidden" name="workerId" value={applicant.id} />
														<button type="submit" class="btn btn-primary" style="padding: 0.4rem 1rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;" disabled={changingStatus}>
															<UserCheck size={15} /> Hire Worker
														</button>
													</form>
												</div>
											</div>
										{/each}
									</div>
								{/if}
							{:else if job.status === 'assigned'}
								<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
									<div>
										<span style="color: var(--text-muted); font-size: 0.85rem; display: block;">Assigned Worker:</span>
										<button 
											type="button"
											style="background: none; border: none; color: var(--text-primary); font-weight: 700; font-size: 1rem; cursor: pointer; text-decoration: underline; padding: 0;"
											onclick={() => openViewProfile(job.worker_id)}
										>
											{job.assignedWorker?.name}
										</button>
										<span class="rating-badge {job.assignedWorker?.average_rating > 0 ? 'rating-badge-positive' : job.assignedWorker?.average_rating < 0 ? 'rating-badge-negative' : 'rating-badge-zero'}" style="margin-left: 0.35rem; display: inline-flex; align-items: center; gap: 0.2rem;">
											<Star size={12} fill="currentColor" /> {job.assignedWorker?.average_rating > 0 ? `+${job.assignedWorker.average_rating}` : job.assignedWorker?.average_rating || 0}
										</span>
										<span style="color: var(--text-secondary); font-size: 0.85rem; margin-left: 0.5rem;">Phone: {job.assignedWorker?.phone}</span>
									</div>
									
									<div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
										{#if job.worker_id}
											<button 
												type="button" 
												class="btn btn-outline" 
												style="padding: 0.4rem 0.85rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;"
												onclick={() => openViewProfile(job.worker_id)}
											>
												<User size={14} /> Profile
											</button>
											<button 
												type="button" 
												class="btn btn-outline" 
												style="padding: 0.4rem 0.85rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;"
												onclick={() => openChat(job.id, job.worker_id)}
											>
												<MessageSquare size={14} /> Chat Worker
											</button>
										{/if}

										<form method="POST" action="?/startJob" use:enhance={() => {
											changingStatus = true;
											return async ({ update }) => {
												changingStatus = false;
												await update();
											};
										}}>
											<input type="hidden" name="jobId" value={job.id} />
											<button type="submit" class="btn btn-primary" style="padding: 0.4rem 1rem; font-size: 0.85rem;" disabled={changingStatus}>
												Start Job Execution
											</button>
										</form>
									</div>
								</div>
							{:else if job.status === 'in_progress'}
								<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
									<div>
										<span style="color: var(--text-muted); font-size: 0.85rem; display: block;">Job Status:</span>
										<span style="color: var(--accent); font-weight: 600;">Work In Progress by {job.assignedWorker?.name}</span>
									</div>
									
									<div style="display: flex; gap: 0.5rem; align-items: center;">
										{#if job.worker_id}
											<button 
												type="button" 
												class="btn btn-outline" 
												style="padding: 0.4rem 0.85rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;"
												onclick={() => openChat(job.id, job.worker_id)}
											>
												<MessageSquare size={14} /> Chat Worker
											</button>
										{/if}

										<button 
											type="button" 
											class="btn btn-primary" 
											style="padding: 0.4rem 1rem; font-size: 0.85rem;"
											onclick={() => openRatingModal(job)}
										>
											Mark Completed & Rate (-5 to +5 Stars)
										</button>
									</div>
								</div>
							{:else if job.status === 'completed'}
								<div style="font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem;">
									<span>
										This project has been successfully completed by <strong>{job.assignedWorker?.name}</strong>.
									</span>
								</div>
							{/if}
						</div>

					</div>
				{/each}
			{/if}
		</div>
	</div>
{/if}

<!-- TAB: MESSAGES & CHAT -->
{#if activeTab === 'chat'}
	<div class="chat-container">
		<!-- Left Sidebar: Conversations List -->
		<div class="chat-threads-sidebar">
			<div class="chat-threads-header" style="display: flex; align-items: center; gap: 0.5rem;">
				<MessageSquare size={18} /> Inquiries & Messages
			</div>
			<div class="chat-thread-list">
				{#if !data.conversations || data.conversations.length === 0}
					<div style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
						No active chats yet.<br>When workers inquire on your job posts, chats will appear here.
					</div>
				{:else}
					{#each data.conversations as conv (conv.id)}
						<button 
							type="button" 
							class="chat-thread-item {activeConversation?.id === conv.id ? 'active' : ''}"
							onclick={() => activeConvId = conv.id}
						>
							<div class="chat-thread-name">{conv.other_user_name} ({conv.other_user_role || 'Worker'})</div>
							<div class="chat-thread-title" style="display: flex; align-items: center; gap: 0.25rem;">
								<Pin size={12} /> {conv.job_title}
							</div>
							<div class="chat-thread-preview">{conv.last_message || 'No messages yet.'}</div>
						</button>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Right Panel: Message Thread Window -->
		<div class="chat-window">
			{#if activeConversation}
				<div class="chat-header">
					<div>
						<h4 style="margin: 0; font-size: 1.1rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
							{activeConversation.other_user_name}
							<button 
								type="button" 
								class="btn btn-outline" 
								style="padding: 0.2rem 0.6rem; font-size: 0.75rem; border-color: var(--accent); color: var(--accent-hover);"
								onclick={() => openViewProfile(activeConversation.other_user_id)}
							>
								<User size={12} /> View Profile
							</button>
						</h4>
						<span style="font-size: 0.8rem; color: var(--accent-hover);">
							Job Post: {activeConversation.job_title}
						</span>
					</div>
					<button 
						type="button" 
						class="btn btn-outline" 
						style="padding: 0.35rem 0.85rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.35rem;" 
						onclick={refreshChatData}
						disabled={isRefreshingChat}
						id="refresh-chat-customer-btn"
					>
						<RefreshCw size={14} /> {isRefreshingChat ? 'Refreshing...' : 'Refresh Chat'}
					</button>
				</div>

				<div class="chat-messages-body" id="chat-messages-customer-body">
					{#if !activeConversation.messages || activeConversation.messages.length === 0}
						<div style="text-align: center; color: var(--text-muted); margin: auto; font-size: 0.9rem;">
							Start conversation with {activeConversation.other_user_name}...
						</div>
					{:else}
						{#each activeConversation.messages as msg (msg.id)}
							<div class="chat-bubble {msg.sender_id === data.user.id ? 'sent' : 'received'}">
								<div>{msg.content}</div>
								<div class="chat-time">
									{new Date(msg.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
								</div>
							</div>
						{/each}
					{/if}
				</div>

				<div class="chat-footer">
					<form method="POST" action="?/sendMessage" use:enhance={() => {
						sendingMessage = true;
						return async ({ update }) => {
							sendingMessage = false;
							newMessageContent = '';
							await update({ reset: false });
							await invalidateAll();
							setTimeout(() => {
								const body = document.getElementById('chat-messages-customer-body');
								if (body) body.scrollTop = body.scrollHeight;
							}, 50);
						};
					}} style="display: flex; gap: 0.75rem;">
						<input type="hidden" name="jobId" value={activeConversation.job_id} />
						<input type="hidden" name="receiverId" value={activeConversation.other_user_id} />
						<input 
							type="text" 
							name="content" 
							placeholder="Type your reply here..." 
							bind:value={newMessageContent}
							required 
							style="flex: 1; padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary);"
						/>
						<button type="submit" class="btn btn-primary" style="padding: 0.75rem 1.5rem;" disabled={sendingMessage || !newMessageContent.trim()}>
							Send
						</button>
					</form>
				</div>
			{:else}
				<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); flex-direction: column; gap: 0.75rem; padding: 2rem;">
					<MessageSquare size={48} style="opacity: 0.6;" />
					<p style="font-size: 0.95rem;">Select an inquiry on the left to start messaging.</p>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- TAB 3: MY PROFILE & HISTORY OF TRANSACTIONS -->
{#if activeTab === 'profile'}
	<div class="profile-container">
		
		<!-- Cover Banner & Header Card -->
		<div class="profile-header-card">
			<div class="profile-cover-banner"></div>
			<div class="profile-header-content">
				<div class="profile-header-row">
					
					<!-- Left Side: Avatar + Name + Role Badge -->
					<div class="profile-user-left">
						<div class="profile-avatar-wrapper">
							{data.user?.name ? data.user.name.charAt(0).toUpperCase() : 'U'}
						</div>
						<div class="profile-user-text">
							<h2 style="font-size: 1.6rem; margin-bottom: 0.25rem;">{data.user?.name}</h2>
							<span class="badge badge-general" style="font-size: 0.75rem;">Customer Account</span>
						</div>
					</div>

					<!-- Right Side: Stat Numbers (Total Posts & Tasks Completed) -->
					<div class="profile-stats-group">
						<div class="profile-stat-item">
							<span class="profile-stat-value">{data.posts.length}</span>
							<span class="profile-stat-label">Total Posts</span>
						</div>
						<div class="profile-stat-item">
							<span class="profile-stat-value" style="color: var(--success);">{completedJobs.length}</span>
							<span class="profile-stat-label">Tasks Completed</span>
						</div>
					</div>

				</div>
			</div>
		</div>

		<!-- Main 2-Column Grid -->
		<div class="profile-main-grid">
			
			<!-- Left Column: Introduction / Details -->
			<aside class="card" style="padding: 1.5rem;">
				<h4 style="font-size: 1.25rem; margin-bottom: 1.25rem; color: var(--text-primary);">Introduction</h4>
				<div style="display: flex; flex-direction: column; gap: 1rem; font-size: 0.9rem;">
					<div>
						<span style="color: var(--text-muted); font-size: 0.8rem; display: block; text-transform: uppercase;">Email Address</span>
						<strong style="color: var(--text-primary);">{data.user?.email}</strong>
					</div>
					<div>
						<span style="color: var(--text-muted); font-size: 0.8rem; display: block; text-transform: uppercase;">Phone Number</span>
						<strong style="color: var(--text-primary);">{data.user?.phone}</strong>
					</div>
					<div>
						<span style="color: var(--text-muted); font-size: 0.8rem; display: block; text-transform: uppercase;">Address / City</span>
						<strong style="color: var(--text-primary);">{data.user?.address}</strong>
					</div>
				</div>
			</aside>

			<!-- Right Column: History of Transactions -->
			<section style="display: flex; flex-direction: column; gap: 1.25rem;">
				<h3 style="font-size: 1.5rem; margin: 0;">History of Transactions ({completedJobs.length})</h3>
				
				{#if completedJobs.length === 0}
					<div class="card" style="text-align: center; padding: 4rem 2rem; border-style: dashed;">
						<h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">No completed transactions yet.</h4>
						<p style="color: var(--text-secondary); font-size: 0.9rem;">
							Your past completed job postings will appear here in your transaction history.
						</p>
					</div>
				{:else}
					{#each completedJobs as job (job.id)}
						<div class="card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
							<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
								<div>
									<h3 style="font-size: 1.35rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
										{job.title}
									</h3>
									<div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
										<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
										<span class="status status-completed">Completed</span>
										<span style="font-size: 0.8rem; color: var(--text-muted);">
											{new Date(job.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
										</span>
									</div>
								</div>
								<div style="text-align: right;">
									<strong style="color: var(--accent); font-size: 1.25rem;">₱{job.budget.toLocaleString()}</strong>
								</div>
							</div>

							<div style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; border-left: 2px solid var(--border-color); padding-left: 1rem;">
								<p>{job.description}</p>
							</div>

							<div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.25rem; font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem;">
								<span>This project was successfully completed by <strong>{job.assignedWorker?.name || 'a worker'}</strong>.</span>
							</div>
						</div>
					{/each}
				{/if}
			</section>

		</div>
	</div>
{/if}

<!-- COMPLETED RATING & REVIEW MODAL (-5 to +5 Stars) -->
{#if showRatingModal}
	<div class="modal-backdrop">
		<div class="modal-content" style="max-width: 600px; width: 92%;">
			<h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Mark Job as Completed & Rate Worker</h3>
			<p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1.5rem;">
				Rate worker <strong>{activeJobForRating?.assignedWorker?.name}</strong> from <strong>-5 Stars (Very Poor)</strong> to <strong>+5 Stars (Excellent)</strong>.
			</p>

			{#if form?.error && showRatingModal}
				<div style="background-color: var(--error-light); border: 1px solid var(--error); color: var(--text-primary); padding: 0.75rem; border-radius: var(--radius-md); margin-bottom: 1rem; font-size: 0.85rem;">
					{form.error}
				</div>
			{/if}

			<form method="POST" action="?/completeAndRateJob" use:enhance={() => {
				changingStatus = true;
				return async ({ update }) => {
					changingStatus = false;
					showRatingModal = false;
					await update();
				};
			}}>
				<input type="hidden" name="jobId" value={activeJobForRating?.id} />
				<input type="hidden" name="workerId" value={activeJobForRating?.worker_id} />
				<input type="hidden" name="rating" value={ratingValue} />

				<!-- Rating Selector UI (-5 to +5 Stars) -->
				<div class="form-group">
					<div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary); display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
						<span>Select Star Rating (-5 to +5):</span>
						<span class="rating-badge {ratingValue > 0 ? 'rating-badge-positive' : ratingValue < 0 ? 'rating-badge-negative' : 'rating-badge-zero'}" style="display: inline-flex; align-items: center; gap: 0.2rem;">
							<Star size={12} fill="currentColor" /> {ratingValue > 0 ? `+${ratingValue}` : ratingValue} Star{Math.abs(ratingValue) === 1 ? '' : 's'}
						</span>
					</div>
					
					<div class="rating-options-container">
						{#each [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5] as num}
							<button 
								type="button"
								class="rating-btn {ratingValue === num ? (num > 0 ? 'active-positive' : num < 0 ? 'active-negative' : 'active-zero') : ''}"
								onclick={() => selectRating(num)}
								aria-label="Rating {num}"
							>
								<span class="rating-num">{num > 0 ? `+${num}` : num}</span>
								<span class="rating-star-icon" style="display: inline-flex; align-items: center;"><Star size={12} fill="currentColor" /></span>
							</button>
						{/each}
					</div>
				</div>

				<div class="form-group" style="margin-bottom: 2rem;">
					<label for="reviewText">Comment / Feedback Review</label>
					<textarea 
						id="reviewText" 
						name="reviewText" 
						bind:value={reviewText}
						placeholder="E.g. Excellent work, completed the sideline quickly and professionally!" 
						required
					></textarea>
				</div>

				<div style="display: flex; gap: 1rem; justify-content: flex-end;">
					<button type="button" class="btn btn-secondary" onclick={() => showRatingModal = false}>
						Cancel
					</button>
					<button type="submit" class="btn btn-primary" style="background-color: var(--success);" disabled={changingStatus}>
						{changingStatus ? 'Submitting...' : 'Submit & Complete'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- VIEW PROFILE MODAL FOR OTHER USERS -->
<ViewProfileModal 
	bind:show={showViewProfileModal} 
	userId={viewProfileUserId} 
	currentUserId={data.user?.id}
	onopenchat={(targetUserId) => {
		const matchConv = data.conversations?.find(c => c.other_user_id === targetUserId);
		if (matchConv) {
			activeConvId = matchConv.id;
			activeTab = 'chat';
		}
	}}
/>

