<script>
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let activeTab = $state('feed'); // 'feed' | 'my-jobs' | 'profile'
	let searchCategory = $state('');
	let searchLocation = $state('');
	let minBudget = $state(null);

	let applyingJobId = $state(null);

	// Client-side category filtering helper
	let filteredJobs = $derived(
		data.availableJobs.filter(job => {
			const matchesCategory = !searchCategory || job.category === searchCategory;
			const matchesLocation = !searchLocation || job.location.toLowerCase().includes(searchLocation.toLowerCase());
			const matchesBudget = !minBudget || job.budget >= minBudget;
			return matchesCategory && matchesLocation && matchesBudget;
		})
	);

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
</script>

<svelte:head>
	<title>Worker Dashboard | Serviee</title>
</svelte:head>

<!-- Tab Navigation Header -->
<div style="display: flex; gap: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 2rem; overflow-x: auto;">
	<button 
		type="button" 
		class="btn {activeTab === 'feed' ? 'btn-primary' : 'btn-outline'}" 
		onclick={() => activeTab = 'feed'}
		id="tab-feed-btn"
	>
		Sideline Feed (Job Board)
	</button>
	<button 
		type="button" 
		class="btn {activeTab === 'my-jobs' ? 'btn-primary' : 'btn-outline'}" 
		onclick={() => activeTab = 'my-jobs'}
		id="tab-myjobs-btn"
	>
		My Jobs ({data.myJobs.length})
	</button>
	<button 
		type="button" 
		class="btn {activeTab === 'profile' ? 'btn-primary' : 'btn-outline'}" 
		onclick={() => activeTab = 'profile'}
		id="tab-profile-btn"
	>
		My Profile & Feedback
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

<!-- TAB 1: SIDELINE FEED -->
{#if activeTab === 'feed'}
	<div class="dashboard-layout">
		
		<!-- Filters sidebar -->
		<aside class="card" style="position: sticky; top: 90px; padding: 1.5rem;">
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
				<h2 style="font-size: 1.5rem;">Available Jobs ({filteredJobs.length})</h2>
			</div>

			{#if filteredJobs.length === 0}
				<div class="card" style="text-align: center; padding: 4rem 2rem; border-style: dashed;">
					<h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">No sideline jobs found.</h4>
					<p style="color: var(--text-secondary); font-size: 0.9rem;">
						Try modifying your filters or check back later for new job postings from clients.
					</p>
				</div>
			{:else}
				{#each filteredJobs as job (job.id)}
					<div class="card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
						
						<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
							<div>
								<div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
									<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
									<span style="font-size: 0.8rem; color: var(--text-muted);">
										Posted on: {new Date(job.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
									</span>
								</div>
								<h3 style="font-size: 1.35rem; color: var(--text-primary);">{job.title}</h3>
								<span style="font-size: 0.85rem; color: var(--text-secondary);">Client: {job.customerName}</span>
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

						<div style="display: flex; justify-content: flex-end; margin-top: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
							<form method="POST" action="?/applyJob" use:enhance={() => {
								applyingJobId = job.id;
								return async ({ update }) => {
									applyingJobId = null;
									await update();
								};
							}}>
								<input type="hidden" name="jobId" value={job.id} />
								{#if job.hasApplied}
									<button type="button" class="btn btn-secondary" style="opacity: 0.7;" disabled>
										Applied
									</button>
								{:else}
									<button type="submit" class="btn btn-primary" disabled={applyingJobId === job.id} id="apply-btn-{job.id}">
										{applyingJobId === job.id ? 'Applying...' : 'Apply / Contact Client'}
									</button>
								{/if}
							</form>
						</div>

					</div>
				{/each}
			{/if}
		</section>
	</div>
{/if}

<!-- TAB 2: MY CURRENT JOBS -->
{#if activeTab === 'my-jobs'}
	<section style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 900px; margin: 0 auto;">
		<h2 style="font-size: 1.5rem;">My Active Jobs ({data.myJobs.length})</h2>

		{#if data.myJobs.length === 0}
			<div class="card" style="text-align: center; padding: 4rem 2rem; border-style: dashed;">
				<h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">You have no active jobs at the moment.</h4>
				<p style="color: var(--text-secondary); font-size: 0.9rem;">
					Head over to the **Sideline Feed** tab to browse and apply for available jobs.
				</p>
			</div>
		{:else}
			{#each data.myJobs as job (job.id)}
				<div class="card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
					
					<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
						<div>
							<div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
								<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
								<span class="status status-{job.status}">
									{job.status === 'assigned' ? 'Assigned' : 'In Progress'}
								</span>
							</div>
							<h3 style="font-size: 1.35rem; color: var(--text-primary);">{job.title}</h3>
						</div>
						<strong style="color: var(--success); font-size: 1.3rem;">₱{job.budget.toLocaleString()}</strong>
					</div>

					<p style="font-size: 0.95rem; color: var(--text-secondary);">{job.description}</p>

					<!-- Client Contact Box -->
					<div style="padding: 1rem; background-color: var(--accent-light); border: 1px dashed var(--accent); border-radius: var(--radius-md); font-size: 0.9rem; margin: 0.5rem 0;">
						<h4 style="color: var(--text-primary); margin-bottom: 0.5rem; font-size: 0.95rem;">Contact Information:</h4>
						<p style="margin-bottom: 0.25rem;"><strong>Client:</strong> {job.customerName}</p>
						<p style="margin-bottom: 0.25rem;"><strong>Phone Number:</strong> <span style="font-family: monospace; font-size: 1.05rem; color: var(--accent-hover); font-weight: 600;">{job.customerPhone}</span></p>
						<p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.5rem;">
							*Please call or text the client directly to discuss the schedule and project details.
						</p>
					</div>

					<div class="metadata-bar">
						<div><strong>Location:</strong> {job.location}</div>
						<div><strong>Target Date:</strong> {new Date(job.target_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
					</div>

				</div>
			{/each}
		{/if}
	</section>
{/if}

<!-- TAB 3: MY PROFILE -->
{#if activeTab === 'profile'}
	<div class="profile-layout">
		
		<!-- Profile Stats Card -->
		<section class="card" style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1rem;">
			<div style="width: 80px; height: 80px; background-color: var(--accent-light); border: 2px solid var(--accent); border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: 700; color: var(--accent);">
				{data.stats?.average_rating > 0 ? data.stats.average_rating : data.user.name.charAt(0).toUpperCase()}
			</div>

			<div>
				<h3 style="font-size: 1.5rem; margin-bottom: 0.25rem;">{data.user.name}</h3>
				<span class="badge badge-general" style="font-size: 0.75rem;">Worker Account</span>
			</div>

			<div style="width: 100%; border-top: 1px solid var(--border-color); padding-top: 1rem; display: flex; justify-content: space-around; margin-top: 0.5rem;">
				<div>
					<strong style="font-size: 1.5rem; display: block; color: var(--success);">{data.stats.completed_jobs_count}</strong>
					<span style="color: var(--text-secondary); font-size: 0.75rem;">Completed Jobs</span>
				</div>
				<div>
					<strong style="font-size: 1.5rem; display: block; color: var(--warning);">Rating: {data.stats.average_rating > 0 ? data.stats.average_rating : '0.0'}</strong>
					<span style="color: var(--text-secondary); font-size: 0.75rem;">Average Rating</span>
				</div>
			</div>

			<div style="width: 100%; text-align: left; background-color: var(--bg-input); padding: 1rem; border-radius: var(--radius-md); font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.5rem;">
				<div><strong>Email:</strong> {data.user.email}</div>
				<div><strong>Phone:</strong> {data.user.phone}</div>
				<div><strong>Address:</strong> {data.user.address}</div>
			</div>
		</section>

		<!-- Feedbacks Section -->
		<section style="display: flex; flex-direction: column; gap: 1.5rem;">
			<h2 style="font-size: 1.5rem;">Client Reviews & Feedback ({data.stats.reviews.length})</h2>

			{#if data.stats.reviews.length === 0}
				<div class="card" style="text-align: center; padding: 4rem 2rem; border-style: dashed;">
					<h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">No reviews received yet.</h4>
					<p style="color: var(--text-secondary); font-size: 0.9rem;">
						Once you complete jobs, client ratings and feedback will be displayed here.
					</p>
				</div>
			{:else}
				<div style="display: flex; flex-direction: column; gap: 1rem;">
					{#each data.stats.reviews as review (review.id)}
						<div class="card" style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem;">
							
							<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
								<div>
									<strong style="color: var(--text-primary);">{review.customer_name}</strong>
									<span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">
										{new Date(review.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
									</span>
								</div>
								
								<div style="color: var(--warning); font-size: 1.1rem;">
									{#each Array(5) as _, i}
										<span style="color: {i < review.rating ? 'var(--warning)' : 'var(--border-color)'}">★</span>
									{/each}
								</div>
							</div>

							<p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; font-style: italic;">
								"{review.review_text}"
							</p>

						</div>
					{/each}
				</div>
			{/if}
		</section>

	</div>
{/if}
