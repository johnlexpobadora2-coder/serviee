<script>
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { MessageSquare, Pin, RefreshCw, Star, ClipboardList, Check, User } from 'lucide-svelte';
	import ViewProfileModal from '$lib/ViewProfileModal.svelte';

	let { data, form } = $props();

	let activeTab = $state("feed"); // 'feed' | 'my-jobs' | 'chat' | 'profile'
	let profileSubTab = $state("history"); // 'history' | 'reviews'
	let activeConvId = $state("");
	let newMessageContent = $state("");
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
			const res = await fetch("/api/messages");
			if (res.ok) {
				const result = await res.json();
				if (result.conversations) {
					data.conversations = result.conversations;
				}
			}
		} catch (err) {
			console.error("Failed to refresh chat:", err);
		} finally {
			isRefreshingChat = false;
		}
	}

	let activeConversation = $derived(
		data.conversations?.find((c) => c.id === activeConvId) ||
			data.conversations?.[0] ||
			null,
	);

	function openChat(jobId, customerId) {
		activeConvId = `${jobId}_${customerId}`;
		activeTab = "chat";
	}

	let searchCategory = $state("");
	let searchLocation = $state("");
	let minBudget = $state(null);

	let applyingJobId = $state(null);

	// Client-side category filtering helper
	let filteredJobs = $derived(
		data.availableJobs.filter((job) => {
			const matchesCategory =
				!searchCategory || job.category === searchCategory;
			const matchesLocation =
				!searchLocation ||
				job.location
					.toLowerCase()
					.includes(searchLocation.toLowerCase());
			const matchesBudget = !minBudget || job.budget >= minBudget;
			return matchesCategory && matchesLocation && matchesBudget;
		}),
	);

	// Category mapping for badge styling helper
	function getCategoryBadge(category) {
		switch (category) {
			case "Plumbing / Tubero":
				return "badge-plumbing";
			case "Roofing / Ayos Yero":
				return "badge-roofing";
			case "Excavation / Hukay Lupa":
				return "badge-excavation";
			case "Gardening":
				return "badge-gardening";
			case "Carpentry":
				return "badge-carpentry";
			default:
				return "badge-general";
		}
	}
	let visibleMyJobsLimit = $state(20);

	let sortedMyJobs = $derived(
		[...(data.myJobs || [])].sort(
			(a, b) => new Date(b.created_at || b.target_date).getTime() - new Date(a.created_at || a.target_date).getTime()
		)
	);

	let visibleMyJobs = $derived(
		sortedMyJobs.slice(0, visibleMyJobsLimit)
	);

	function loadMoreMyJobs() {
		visibleMyJobsLimit += 20;
	}

	function handleMyJobsScroll(e) {
		const target = e.target;
		if (!target) return;
		if (target.scrollTop + target.clientHeight >= target.scrollHeight - 100) {
			if (visibleMyJobsLimit < sortedMyJobs.length) {
				visibleMyJobsLimit += 20;
			}
		}
	}
</script>

<svelte:head>
	<title>Worker Dashboard | Serviee</title>
</svelte:head>

<!-- Tab Navigation Header -->
<div class="tabs-header">
	<button
		type="button"
		class="tab-btn {activeTab === 'feed' ? 'active' : ''}"
		onclick={() => (activeTab = "feed")}
		id="tab-feed-btn"
	>
		Sideline Feed (Job Board)
	</button>
	<button
		type="button"
		class="tab-btn {activeTab === 'my-jobs' ? 'active' : ''}"
		onclick={() => (activeTab = "my-jobs")}
		id="tab-myjobs-btn"
	>
		My Jobs ({data.myJobs.length})
	</button>
	<button
		type="button"
		class="tab-btn {activeTab === 'chat' ? 'active' : ''}"
		onclick={() => (activeTab = "chat")}
		id="tab-chat-btn"
		style="display: inline-flex; align-items: center; gap: 0.4rem;"
	>
		<MessageSquare size={16} /> Messages ({data.conversations?.length || 0})
	</button>
	<button
		type="button"
		class="tab-btn {activeTab === 'profile' ? 'active' : ''}"
		onclick={() => (activeTab = "profile")}
		id="tab-profile-btn"
	>
		My Profile & Feedback
	</button>
</div>

{#if form?.success}
	<div
		style="background-color: var(--success-light); border: 1px solid var(--success); color: var(--text-primary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.95rem;"
	>
		{form.success}
	</div>
{/if}

{#if form?.error}
	<div
		style="background-color: var(--error-light); border: 1px solid var(--error); color: var(--text-primary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.95rem;"
	>
		{form.error}
	</div>
{/if}

<!-- TAB 1: SIDELINE FEED -->
{#if activeTab === "feed"}
	<div class="dashboard-layout">
		<!-- Filters sidebar -->
		<aside
			class="card"
			style="position: sticky; top: 90px; padding: 1.5rem;"
		>
			<h4 style="font-size: 1.25rem; margin-bottom: 1rem;">
				Filter Jobs
			</h4>

			<div class="form-group">
				<label for="filter-category">Category</label>
				<select id="filter-category" bind:value={searchCategory}>
					<option value="">All Categories</option>
					<option value="Plumbing / Tubero">Plumbing / Tubero</option>
					<option value="Roofing / Ayos Yero"
						>Roofing / Ayos Yero</option
					>
					<option value="Excavation / Hukay Lupa"
						>Excavation / Hukay Lupa</option
					>
					<option value="Gardening">Gardening / Landscape</option>
					<option value="Carpentry">Carpentry / Karpintero</option>
					<option value="General Manual Labor"
						>General Manual Labor</option
					>
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
			<div
				style="display: flex; justify-content: space-between; align-items: center;"
			>
				<h2 style="font-size: 1.5rem;">
					Available Jobs ({filteredJobs.length})
				</h2>
			</div>

			{#if filteredJobs.length === 0}
				<div
					class="card"
					style="text-align: center; padding: 4rem 2rem; border-style: dashed;"
				>
					<h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">
						No sideline jobs found.
					</h4>
					<p style="color: var(--text-secondary); font-size: 0.9rem;">
						Try modifying your filters or check back later for new
						job postings from clients.
					</p>
				</div>
			{:else}
				{#each filteredJobs as job (job.id)}
					<div
						class="card"
						style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;"
					>
						<div
							style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;"
						>
							<div>
								<div
									style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;"
								>
									<span
										class="badge {getCategoryBadge(
											job.category,
										)}">{job.category}</span
									>
									<span
										style="font-size: 0.8rem; color: var(--text-muted);"
									>
										Posted on: {new Date(
											job.created_at,
										).toLocaleDateString("en-PH", {
											month: "short",
											day: "numeric",
										})}
									</span>
								</div>
								<h3
									style="font-size: 1.35rem; color: var(--text-primary);"
								>
									{job.title}
								</h3>
								<span style="font-size: 0.85rem; color: var(--text-secondary);">
									Client: 
									<button 
										type="button" 
										style="background: none; border: none; color: var(--accent); font-weight: 600; cursor: pointer; text-decoration: underline; padding: 0; font-size: inherit;"
										onclick={() => openViewProfile(job.customer_id)}
									>
										{job.customerName}
									</button>
								</span>
							</div>
							<div style="text-align: right;">
								<strong
									style="color: var(--accent); font-size: 1.25rem; display: block;"
									>₱{job.budget.toLocaleString()}</strong
								>
							</div>
						</div>

						<p
							style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6;"
						>
							{job.description}
						</p>

						<div class="metadata-bar">
							<div><strong>Location:</strong> {job.location}</div>
							<div>
								<strong>Schedule:</strong>
								{new Date(job.target_date).toLocaleDateString(
									"en-PH",
									{
										weekday: "short",
										month: "short",
										day: "numeric",
										hour: "2-digit",
										minute: "2-digit",
									},
								)}
							</div>
						</div>

						<div
							style="display: flex; justify-content: flex-end; margin-top: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;"
						>
									{#if job.hasApplied}
								<button
									type="button"
									class="btn btn-outline"
									style="padding: 0.5rem 1.25rem; border-color: var(--accent); color: var(--accent-hover); display: inline-flex; align-items: center; gap: 0.35rem;"
									onclick={() =>
										openChat(job.id, job.customer_id)}
								>
									<MessageSquare size={14} /> Open Chat
								</button>
							{:else}
								<form
									method="POST"
									action="?/inquireJob"
									use:enhance={() => {
										applyingJobId = job.id;
										return async ({ update }) => {
											applyingJobId = null;
											await update();
											openChat(job.id, job.customer_id);
										};
									}}
								>
									<input
										type="hidden"
										name="jobId"
										value={job.id}
									/>
									<input
										type="hidden"
										name="customerId"
										value={job.customer_id}
									/>
									<input
										type="hidden"
										name="initialMessage"
										value="Hello! Inquiring po ako sa sideline job na ito: {job.title}."
									/>
									<button
										type="submit"
										class="btn btn-primary"
										style="padding: 0.5rem 1.25rem; display: inline-flex; align-items: center; gap: 0.35rem;"
										disabled={applyingJobId === job.id}
										id="inquire-btn-{job.id}"
									>
										<MessageSquare size={14} />
										{applyingJobId === job.id
											? "Connecting..."
											: "Inquire"}
									</button>
								</form>
							{/if}
						</div>
					</div>
				{/each}
			{/if}
		</section>
	</div>
{/if}

<!-- TAB 2: MY CURRENT JOBS -->
{#if activeTab === "my-jobs"}
	<section
		style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 900px; margin: 0 auto; max-height: calc(100vh - 180px); overflow-y: auto; padding-right: 0.5rem;"
		onscroll={handleMyJobsScroll}
	>
		<h2 style="font-size: 1.5rem;">
			My Active Jobs ({sortedMyJobs.length})
		</h2>

		{#if sortedMyJobs.length === 0}
			<div
				class="card"
				style="text-align: center; padding: 4rem 2rem; border-style: dashed;"
			>
				<h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">
					You have no active jobs at the moment.
				</h4>
				<p style="color: var(--text-secondary); font-size: 0.9rem;">
					Head over to the **Sideline Feed** tab to browse and apply
					for available jobs.
				</p>
			</div>
		{:else}
			{#each visibleMyJobs as job (job.id)}
				<div
					class="card"
					style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;"
				>
					<div
						style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;"
					>
						<div>
							<div
								style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;"
							>
								<span
									class="badge {getCategoryBadge(
										job.category,
									)}">{job.category}</span
								>
								<span class="status status-{job.status}">
									{job.status === "assigned"
										? "Assigned"
										: "In Progress"}
								</span>
							</div>
							<h3
								style="font-size: 1.35rem; color: var(--text-primary);"
							>
								{job.title}
							</h3>
						</div>
						<strong
							style="color: var(--success); font-size: 1.3rem;"
							>₱{job.budget.toLocaleString()}</strong
						>
					</div>

					<p
						style="font-size: 0.95rem; color: var(--text-secondary);"
					>
						{job.description}
					</p>

					<!-- Client Contact Box -->
					<div
						style="padding: 1rem; background-color: var(--accent-light); border: 1px dashed var(--accent); border-radius: var(--radius-md); font-size: 0.9rem; margin: 0.5rem 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;"
					>
						<div>
							<h4
								style="color: var(--text-primary); margin-bottom: 0.5rem; font-size: 0.95rem;"
							>
								Contact Information:
							</h4>
							<p style="margin-bottom: 0.25rem;">
								<strong>Client:</strong>
								{job.customerName}
							</p>
							<p style="margin-bottom: 0.25rem;">
								<strong>Phone Number:</strong>
								<span
									style="font-family: monospace; font-size: 1.05rem; color: var(--accent-hover); font-weight: 600;"
									>{job.customerPhone}</span
								>
							</p>
						</div>

						<div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
							<button
								type="button"
								class="btn btn-outline"
								style="padding: 0.5rem 1rem; display: inline-flex; align-items: center; gap: 0.35rem;"
								onclick={() => openViewProfile(job.customer_id)}
							>
								<User size={14} /> View Profile
							</button>

							<button
								type="button"
								class="btn btn-outline"
								style="padding: 0.5rem 1rem; display: inline-flex; align-items: center; gap: 0.35rem;"
								onclick={() => openChat(job.id, job.customer_id)}
							>
								<MessageSquare size={14} /> Chat Client
							</button>
						</div>
					</div>

					<div class="metadata-bar">
						<div><strong>Location:</strong> {job.location}</div>
						<div>
							<strong>Target Date:</strong>
							{new Date(job.target_date).toLocaleDateString(
								"en-PH",
								{
									weekday: "short",
									month: "short",
									day: "numeric",
									hour: "2-digit",
									minute: "2-digit",
								},
							)}
						</div>
					</div>
				</div>
			{/each}

			{#if visibleMyJobsLimit < sortedMyJobs.length}
				<div style="text-align: center; padding: 1rem 0;">
					<button
						type="button"
						class="btn btn-secondary"
						onclick={loadMoreMyJobs}
						style="padding: 0.6rem 1.5rem;"
					>
						Load 20 More Jobs ({sortedMyJobs.length - visibleMyJobsLimit} remaining)
					</button>
				</div>
			{/if}
		{/if}
	</section>
{/if}

<!-- TAB: MESSAGES & CHAT -->
{#if activeTab === "chat"}
	<div class="chat-container">
		<!-- Left Sidebar: Conversations List -->
		<div class="chat-threads-sidebar">
			<div class="chat-threads-header" style="display: flex; align-items: center; gap: 0.5rem;">
				<MessageSquare size={18} /> Inquiries & Messages
			</div>
			<div class="chat-thread-list">
				{#if !data.conversations || data.conversations.length === 0}
					<div
						style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;"
					>
						No active chats yet.<br />Click "Chat / Inquire" on any
						job post to contact clients.
					</div>
				{:else}
					{#each data.conversations as conv (conv.id)}
						<button
							type="button"
							class="chat-thread-item {activeConversation?.id ===
							conv.id
								? 'active'
								: ''}"
							onclick={() => (activeConvId = conv.id)}
						>
							<div class="chat-thread-name">
								{conv.other_user_name} (Client)
							</div>
							<div class="chat-thread-title" style="display: flex; align-items: center; gap: 0.25rem;">
								<Pin size={12} /> {conv.job_title}
							</div>
							<div class="chat-thread-preview">
								{conv.last_message || "No messages yet."}
							</div>
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
						<h4
							style="margin: 0; font-size: 1.1rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;"
						>
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
						<span
							style="font-size: 0.8rem; color: var(--accent-hover);"
						>
							Job Post: {activeConversation.job_title}
						</span>
					</div>
					<button
						type="button"
						class="btn btn-outline"
						style="padding: 0.35rem 0.85rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.35rem;"
						onclick={refreshChatData}
						disabled={isRefreshingChat}
						id="refresh-chat-worker-btn"
					>
						<RefreshCw size={14} /> {isRefreshingChat ? "Refreshing..." : "Refresh Chat"}
					</button>
				</div>

				<div class="chat-messages-body" id="chat-messages-worker-body">
					{#if !activeConversation.messages || activeConversation.messages.length === 0}
						<div
							style="text-align: center; color: var(--text-muted); margin: auto; font-size: 0.9rem;"
						>
							Start conversation with {activeConversation.other_user_name}...
						</div>
					{:else}
						{#each activeConversation.messages as msg (msg.id)}
							<div
								class="chat-bubble {msg.sender_id ===
								data.user.id
									? 'sent'
									: 'received'}"
							>
								<div>{msg.content}</div>
								<div class="chat-time">
									{new Date(
										msg.created_at,
									).toLocaleTimeString("en-PH", {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</div>
							</div>
						{/each}
					{/if}
				</div>

				<div class="chat-footer">
					<form
						method="POST"
						action="?/sendMessage"
						use:enhance={() => {
							sendingMessage = true;
							return async ({ update }) => {
								sendingMessage = false;
								newMessageContent = "";
								await update({ reset: false });
								await invalidateAll();
								setTimeout(() => {
									const body = document.getElementById(
										"chat-messages-worker-body",
									);
									if (body)
										body.scrollTop = body.scrollHeight;
								}, 50);
							};
						}}
						style="display: flex; gap: 0.75rem;"
					>
						<input
							type="hidden"
							name="jobId"
							value={activeConversation.job_id}
						/>
						<input
							type="hidden"
							name="receiverId"
							value={activeConversation.other_user_id}
						/>
						<input
							type="text"
							name="content"
							placeholder="Type your reply here..."
							bind:value={newMessageContent}
							required
							style="flex: 1; padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary);"
						/>
						<button
							type="submit"
							class="btn btn-primary"
							style="padding: 0.75rem 1.5rem;"
							disabled={sendingMessage ||
								!newMessageContent.trim()}
						>
							Send
						</button>
					</form>
				</div>
			{:else}
				<div
					style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); flex-direction: column; gap: 0.75rem; padding: 2rem;"
				>
					<MessageSquare size={48} style="opacity: 0.6;" />
					<p style="font-size: 0.95rem;">
						Select an inquiry on the left to start messaging.
					</p>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- TAB 3: MY PROFILE -->
<!-- TAB 3: MY PROFILE -->
{#if activeTab === "profile"}
	<div class="profile-container">
		<!-- Cover Banner & Header Card -->
		<div class="profile-header-card">
			<div class="profile-cover-banner"></div>
			<div class="profile-header-content">
				<div class="profile-header-row">
					<!-- Left Side: Avatar + Name + Role Badge -->
					<div class="profile-user-left">
						<div class="profile-avatar-wrapper">
							{data.user?.name
								? data.user.name.charAt(0).toUpperCase()
								: "W"}
						</div>
						<div class="profile-user-text">
							<h2
								style="font-size: 1.6rem; margin-bottom: 0.25rem;"
							>
								{data.user?.name}
							</h2>
							<span
								class="badge badge-general"
								style="font-size: 0.75rem;">Worker Account</span
							>
						</div>
					</div>

					<!-- Right Side: Stat Numbers (Tasks Completed & Star Rating) -->
					<div class="profile-stats-group">
						<div class="profile-stat-item">
							<span
								class="profile-stat-value"
								style="color: var(--success);"
								>{data.stats?.completed_jobs_count || 0}</span
							>
							<span class="profile-stat-label"
								>Tasks Completed</span
							>
						</div>
						<div class="profile-stat-item">
							<span
								class="rating-badge {data.stats
									?.average_rating > 0
									? 'rating-badge-positive'
									: data.stats?.average_rating < 0
										? 'rating-badge-negative'
										: 'rating-badge-zero'}"
								style="font-size: 1.1rem; padding: 0.3rem 0.8rem; display: inline-flex; align-items: center; gap: 0.25rem;"
							>
								<Star size={14} fill="currentColor" /> {data.stats?.average_rating > 0
									? `+${data.stats.average_rating}`
									: data.stats?.average_rating || "0"}
							</span>
							<span
								class="profile-stat-label"
								style="margin-top: 0.3rem;">Total Rating</span
							>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Main 2-Column Grid -->
		<div class="profile-main-grid">
			<!-- Left Column: Introduction / Details -->
			<aside class="card" style="padding: 1.5rem;">
				<h4
					style="font-size: 1.25rem; margin-bottom: 1.25rem; color: var(--text-primary);"
				>
					Introduction
				</h4>
				<div
					style="display: flex; flex-direction: column; gap: 1rem; font-size: 0.9rem;"
				>
					<div>
						<span
							style="color: var(--text-muted); font-size: 0.8rem; display: block; text-transform: uppercase;"
							>Email Address</span
						>
						<strong style="color: var(--text-primary);"
							>{data.user?.email}</strong
						>
					</div>
					<div>
						<span
							style="color: var(--text-muted); font-size: 0.8rem; display: block; text-transform: uppercase;"
							>Phone Number</span
						>
						<strong style="color: var(--text-primary);"
							>{data.user?.phone}</strong
						>
					</div>
					<div>
						<span
							style="color: var(--text-muted); font-size: 0.8rem; display: block; text-transform: uppercase;"
							>Address / City</span
						>
						<strong style="color: var(--text-primary);"
							>{data.user?.address}</strong
						>
					</div>
				</div>
			</aside>

			<!-- Right Column: Service History & Feedback Sub-tabs -->
			<section
				style="display: flex; flex-direction: column; gap: 1.25rem;"
			>
				<!-- Sub-tabs header nav matching main tabs design -->
				<div class="tabs-header" style="margin-bottom: 0.5rem;">
					<button
						type="button"
						class="tab-btn {profileSubTab === 'history' ? 'active' : ''}"
						onclick={() => (profileSubTab = "history")}
						id="subtab-history-btn"
						style="display: inline-flex; align-items: center; gap: 0.4rem;"
					>
						<ClipboardList size={16} /> Service History ({data.completedJobs?.length || 0})
					</button>
					<button
						type="button"
						class="tab-btn {profileSubTab === 'reviews' ? 'active' : ''}"
						onclick={() => (profileSubTab = "reviews")}
						id="subtab-reviews-btn"
						style="display: inline-flex; align-items: center; gap: 0.4rem;"
					>
						<Star size={16} fill="currentColor" /> Customer Comments, Feedback & Review Ratings ({data
							.stats?.reviews?.length || 0})
					</button>
				</div>

				{#if profileSubTab === "history"}
					<!-- TAB 1: SERVICE HISTORY -->
					{#if !data.completedJobs || data.completedJobs.length === 0}
						<div
							class="card"
							style="text-align: center; padding: 3.5rem 2rem; border-style: dashed;"
						>
							<h4
								style="font-size: 1.15rem; margin-bottom: 0.5rem;"
							>
								No service history yet.
							</h4>
							<p
								style="color: var(--text-secondary); font-size: 0.9rem;"
							>
								Completed jobs and work history will appear here
								once you finish assigned services.
							</p>
						</div>
					{:else}
						<div
							style="display: flex; flex-direction: column; gap: 1rem;"
						>
							{#each data.completedJobs as job (job.id)}
								<div
									class="card"
									style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;"
								>
									<div
										style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;"
									>
										<div>
											<div
												style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;"
											>
												<span
													class="badge {getCategoryBadge(
														job.category,
													)}">{job.category}</span
												>
												<span
													class="badge"
													style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 0.25rem;"
												>
													<Check size={14} /> Completed
												</span>
											</div>
											<h4
												style="font-size: 1.15rem; color: var(--text-primary); margin: 0;"
											>
												{job.title}
											</h4>
											<span
												style="font-size: 0.85rem; color: var(--text-secondary);"
												>Client: <strong
													>{job.customerName}</strong
												></span
											>
										</div>
										<strong
											style="color: var(--success); font-size: 1.15rem;"
											>₱{job.budget.toLocaleString()}</strong
										>
									</div>
									<p
										style="font-size: 0.9rem; color: var(--text-secondary); margin: 0;"
									>
										{job.description}
									</p>
									<div
										style="font-size: 0.8rem; color: var(--text-muted); display: flex; justify-content: space-between; border-top: 1px dashed var(--border-color); padding-top: 0.5rem; flex-wrap: wrap; gap: 0.5rem;"
									>
										<span
											><strong>Location:</strong>
											{job.location}</span
										>
										<span
											><strong>Date Completed:</strong>
											{new Date(
												job.target_date ||
													job.created_at,
											).toLocaleDateString("en-PH", {
												month: "short",
												day: "numeric",
												year: "numeric",
											})}</span
										>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				{:else if profileSubTab === "reviews"}
					<!-- TAB 2: CUSTOMER COMMENTS, FEEDBACK & REVIEW RATINGS -->
					{#if (data.stats?.reviews?.length || 0) === 0}
						<div
							class="card"
							style="text-align: center; padding: 3.5rem 2rem; border-style: dashed;"
						>
							<h4
								style="font-size: 1.15rem; margin-bottom: 0.5rem;"
							>
								No reviews received yet.
							</h4>
							<p
								style="color: var(--text-secondary); font-size: 0.9rem;"
							>
								Once clients review and rate your completed
								work, their feedback, comments, and ratings will
								be displayed here.
							</p>
						</div>
					{:else}
						<div
							style="display: flex; flex-direction: column; gap: 1rem;"
						>
							{#each data.stats.reviews as review (review.id)}
								<div
									class="card"
									style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem;"
								>
									<div
										style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;"
									>
										<div>
											<strong
												style="color: var(--text-primary);"
												>{review.customer_name}</strong
											>
											<span
												style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;"
											>
												{new Date(
													review.created_at,
												).toLocaleDateString("en-PH", {
													month: "short",
													day: "numeric",
													year: "numeric",
												})}
											</span>
										</div>
										<div>
											<span
												class="rating-badge {review.rating >
												0
													? 'rating-badge-positive'
													: review.rating < 0
														? 'rating-badge-negative'
														: 'rating-badge-zero'}"
												style="display: inline-flex; align-items: center; gap: 0.25rem;"
											>
												<Star size={12} fill="currentColor" /> {review.rating > 0
													? `+${review.rating}`
													: review.rating} Star{Math.abs(
													review.rating,
												) === 1
													? ""
													: "s"}
											</span>
										</div>
									</div>
									<p
										style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; font-style: italic; margin: 0;"
									>
										"{review.review_text}"
									</p>
								</div>
							{/each}
						</div>
					{/if}
				{/if}
			</section>
		</div>
	</div>
{/if}

<!-- VIEW PROFILE MODAL FOR OTHER USERS -->
<ViewProfileModal
	bind:show={showViewProfileModal}
	userId={viewProfileUserId}
	currentUserId={data.user?.id}
	onopenchat={(targetUserId) => {
		const matchConv = data.conversations?.find((c) => c.other_user_id === targetUserId);
		if (matchConv) {
			activeConvId = matchConv.id;
			activeTab = "chat";
		}
	}}
/>
