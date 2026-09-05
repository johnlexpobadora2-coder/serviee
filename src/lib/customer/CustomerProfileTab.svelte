<script>
	import { ClipboardList, CheckCircle2, Trash2, Star } from 'lucide-svelte';

	let { 
		user = {}, 
		posts = [], 
		completedJobs = [], 
		historySubTab = $bindable('posted'), 
		onopendeletejob 
	} = $props();

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
</script>

<div class="profile-container">
	<!-- Cover Banner & Header Card -->
	<div class="profile-header-card">
		<div class="profile-cover-banner"></div>
		<div class="profile-header-content">
			<div class="profile-header-row">
				<!-- Left Side: Avatar + Name + Role Badge -->
				<div class="profile-user-left">
					<div class="profile-avatar-wrapper">
						{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
					</div>
					<div class="profile-user-text">
						<h2 style="font-size: 1.6rem; margin-bottom: 0.25rem;">{user?.name}</h2>
						<span class="badge badge-general" style="font-size: 0.75rem;">Customer Account</span>
					</div>
				</div>

				<!-- Right Side: Stat Numbers (Total Posts & Tasks Completed) -->
				<div class="profile-stats-group">
					<div class="profile-stat-item">
						<span class="profile-stat-value">{posts.length}</span>
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
					<strong style="color: var(--text-primary);">{user?.email}</strong>
				</div>
				<div>
					<span style="color: var(--text-muted); font-size: 0.8rem; display: block; text-transform: uppercase;">Phone Number</span>
					<strong style="color: var(--text-primary);">{user?.phone}</strong>
				</div>
				<div>
					<span style="color: var(--text-muted); font-size: 0.8rem; display: block; text-transform: uppercase;">Address / City</span>
					<strong style="color: var(--text-primary);">{user?.address}</strong>
				</div>
			</div>
		</aside>

		<!-- Right Column: History of Transactions with 2 Sub-tabs -->
		<section style="display: flex; flex-direction: column; gap: 1.25rem;">
			<div class="tabs-header" style="margin-bottom: 0.25rem;">
				<button 
					type="button" 
					class="tab-btn {historySubTab === 'posted' ? 'active' : ''}" 
					onclick={() => historySubTab = 'posted'}
					id="subtab-posted-btn"
					style="display: inline-flex; align-items: center; gap: 0.4rem;"
				>
					<ClipboardList size={16} /> Job Posted ({posts.length})
				</button>
				<button 
					type="button" 
					class="tab-btn {historySubTab === 'completed' ? 'active' : ''}" 
					onclick={() => historySubTab = 'completed'}
					id="subtab-completed-btn"
					style="display: inline-flex; align-items: center; gap: 0.4rem;"
				>
					<CheckCircle2 size={16} /> Completed Jobs ({completedJobs.length})
				</button>
			</div>

			{#if historySubTab === 'posted'}
				<!-- TAB 1: ALL JOBS POSTED (COMPLETED & UNCOMPLETED) -->
				{#if posts.length === 0}
					<div class="card" style="text-align: center; padding: 4rem 2rem; border-style: dashed;">
						<h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">No job postings created yet.</h4>
						<p style="color: var(--text-secondary); font-size: 0.9rem;">
							Your job postings (both completed and ongoing) will appear here.
						</p>
					</div>
				{:else}
					{#each posts as job (job.id)}
						<div class="card feed-job-card">
							<div class="feed-job-header">
								<div>
									<div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.35rem;">
										<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
										{#if job.status === 'completed'}
											<span class="status status-completed">Completed</span>
										{:else if job.status === 'in_progress'}
											<span class="status status-in-progress">In Progress</span>
										{:else}
											<span class="status status-open">Open</span>
										{/if}
										<span style="font-size: 0.75rem; color: var(--text-muted);">
											Posted: {new Date(job.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
										</span>
									</div>
									<h3 class="feed-job-title">{job.title}</h3>
								</div>
								<div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem;">
									<strong class="feed-job-budget" style="color: var(--accent); font-size: 1.25rem; display: block;">₱{job.budget.toLocaleString()}</strong>
									<button
										type="button"
										class="btn btn-outline"
										style="padding: 0.25rem 0.6rem; font-size: 0.75rem; border-color: #ef4444; color: #ef4444; display: inline-flex; align-items: center; gap: 0.3rem;"
										onclick={() => onopendeletejob(job)}
										title="Delete Job Post"
									>
										<Trash2 size={13} />
										<span>Delete</span>
									</button>
								</div>
							</div>

							<div style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; border-left: 2px solid var(--border-color); padding-left: 1rem;">
								<p>{job.description}</p>
							</div>

							{#if job.assignedWorker}
								<div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.25rem; font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem;">
									<span>Assigned Worker: <strong style="color: var(--text-primary);">{job.assignedWorker.name}</strong></span>
								</div>
							{/if}
						</div>
					{/each}
				{/if}

			{:else if historySubTab === 'completed'}
				<!-- TAB 2: COMPLETED JOBS (ONLY COMPLETE & RATING GIVEN TO WORKER) -->
				{#if completedJobs.length === 0}
					<div class="card" style="text-align: center; padding: 4rem 2rem; border-style: dashed;">
						<h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">No completed transactions yet.</h4>
						<p style="color: var(--text-secondary); font-size: 0.9rem;">
							Your past completed job postings and worker ratings will appear here.
						</p>
					</div>
				{:else}
					{#each completedJobs as job (job.id)}
						<div class="card feed-job-card">
							<div class="feed-job-header">
								<div>
									<div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.35rem;">
										<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
										<span class="status status-completed">Completed</span>
										<span style="font-size: 0.75rem; color: var(--text-muted);">
											Posted: {new Date(job.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
										</span>
									</div>
									<h3 class="feed-job-title">{job.title}</h3>
								</div>
								<div style="text-align: right;">
									<strong class="feed-job-budget" style="color: var(--accent); font-size: 1.25rem; display: block;">₱{job.budget.toLocaleString()}</strong>
								</div>
							</div>

							<div style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; border-left: 2px solid var(--border-color); padding-left: 1rem;">
								<p>{job.description}</p>
							</div>

							<!-- Worker & Rating details given -->
							<div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.25rem; display: flex; flex-direction: column; gap: 0.5rem;">
								<div style="font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
									<span>Completed by: <strong style="color: var(--text-primary);">{job.assignedWorker?.name || 'Worker'}</strong></span>
									{#if job.review}
										<span class="rating-badge {job.review.rating > 0 ? 'rating-badge-positive' : job.review.rating < 0 ? 'rating-badge-negative' : 'rating-badge-zero'}">
											<Star size={12} fill="currentColor" /> Rating Given: {job.review.rating > 0 ? `+${job.review.rating}` : job.review.rating} Star{Math.abs(job.review.rating) === 1 ? '' : 's'}
										</span>
									{/if}
								</div>

								{#if job.review && job.review.review_text}
									<div style="background: var(--bg-input); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); font-size: 0.88rem; color: var(--text-secondary); font-style: italic;">
										"{job.review.review_text}"
									</div>
								{/if}
							</div>
						</div>
					{/each}
				{/if}
			{/if}
		</section>
	</div>
</div>
