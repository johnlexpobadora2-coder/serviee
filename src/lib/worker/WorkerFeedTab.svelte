<script>
	import { enhance } from '$app/forms';
	import { SlidersHorizontal, ChevronUp, ChevronDown, Search, X, MapPin, ExternalLink, MessageSquare, User, Calendar, Clock } from 'lucide-svelte';
	import { CITIES_MUNICIPALITIES } from '$lib/locations.js';
	import { getGoogleMapsUrl, getEmbedMapUrl } from '$lib/gpsUtils.js';

	let { 
		filteredJobs = [], 
		visibleFeedJobs = [], 
		visibleFeedJobsLimit = $bindable(40), 
		searchCategory = $bindable(''), 
		searchLocation = $bindable(''), 
		minBudget = $bindable(null), 
		searchQuery = $bindable(''), 
		showMobileFilters = $bindable(false), 
		hasActiveFilters = false, 
		applyingJobId = $bindable(null), 
		onopenviewprofile, 
		onopenchat, 
		onloadmorefeedjobs 
	} = $props();

	function getCategoryBadge(category) {
		switch (category) {
			case "Plumbing / Tubero": return "badge-plumbing";
			case "Roofing / Ayos Yero": return "badge-roofing";
			case "Excavation / Hukay Lupa": return "badge-excavation";
			case "Gardening": return "badge-gardening";
			case "Carpentry": return "badge-carpentry";
			default: return "badge-general";
		}
	}
</script>

<div class="dashboard-layout">
	<!-- Mobile Filter Toggle Button -->
	<button 
		type="button" 
		class="mobile-filter-toggle-btn"
		onclick={() => showMobileFilters = !showMobileFilters}
		aria-expanded={showMobileFilters}
	>
		<span style="display: flex; align-items: center; gap: 0.5rem;">
			<SlidersHorizontal size={16} />
			<span>{showMobileFilters ? 'Hide Filter Options' : 'Filter Jobs by Category / Location'}</span>
			{#if hasActiveFilters}
				<span class="active-filter-indicator"></span>
			{/if}
		</span>
		{#if showMobileFilters}
			<ChevronUp size={16} />
		{:else}
			<ChevronDown size={16} />
		{/if}
	</button>

	<!-- Filters sidebar -->
	<aside
		class="card feed-filters-card feed-filters-aside {showMobileFilters ? 'mobile-open' : ''}"
		style="position: sticky; top: 90px; padding: 1.25rem;"
	>
		<h4 style="font-size: 1.1rem; margin-bottom: 0.75rem;">
			Filter Jobs
		</h4>

		<div class="feed-filters-grid">
			<div class="form-group form-group-full">
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
				<label for="filter-location">City/Municipality</label>
				<select
					id="filter-location"
					bind:value={searchLocation}
				>
					<option value="">All Locations</option>
					{#each CITIES_MUNICIPALITIES as city}
						<option value={city}>{city}</option>
					{/each}
				</select>
			</div>

			<div class="form-group">
				<label for="filter-budget">Min Budget (₱)</label>
				<input
					type="number"
					id="filter-budget"
					placeholder="E.g. 500"
					bind:value={minBudget}
				/>
			</div>
		</div>
	</aside>

	<!-- Feed stream list -->
	<section style="display: flex; flex-direction: column; gap: 1rem; min-width: 0; width: 100%;">
		<!-- Search Bar above Job Postings -->
		<div class="job-search-bar-container">
			<div class="job-search-input-wrapper">
				<Search size={18} class="job-search-icon" />
				<input 
					type="text" 
					id="worker-job-search-input" 
					placeholder="Search jobs by title or description..." 
					bind:value={searchQuery}
					class="job-search-input"
				/>
				{#if searchQuery}
					<button 
						type="button" 
						class="job-search-clear-btn" 
						onclick={() => searchQuery = ''}
						aria-label="Clear search"
					>
						<X size={15} />
					</button>
				{/if}
			</div>
		</div>

		<div style="display: flex; justify-content: space-between; align-items: center;">
			<h2 style="font-size: 1.3rem;">
				Available Jobs ({filteredJobs.length})
			</h2>
		</div>

		{#if filteredJobs.length === 0}
			<div
				class="card"
				style="text-align: center; padding: 3rem 1.5rem; border-style: dashed;"
			>
				<h4 style="font-size: 1.15rem; margin-bottom: 0.5rem;">
					No sideline jobs found.
				</h4>
				<p style="color: var(--text-secondary); font-size: 0.85rem;">
					Try modifying your filters or check back later for new job postings from clients.
				</p>
			</div>
		{:else}
			{#each visibleFeedJobs as job (job.id)}
				<div
					class="card feed-job-card"
				>
					<div class="feed-job-header">
						<div>
							<div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
								<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
								<span style="font-size: 0.78rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 0.25rem;">
									<Clock size={12} />
									{new Date(job.created_at).toLocaleDateString("en-PH", {
										month: "short",
										day: "numeric",
										year: "numeric",
										hour: "numeric",
										minute: "2-digit",
									})}
								</span>
							</div>
							<h3 class="feed-job-title">
								{job.title}
							</h3>
							<div style="font-size: 0.82rem; color: var(--text-secondary); display: inline-flex; align-items: center; gap: 0.35rem; margin-top: 0.15rem;">
								<User size={13} style="color: var(--accent);" />
								<span>Client:</span> 
								<button 
									type="button" 
									style="background: none; border: none; color: var(--accent-hover); font-weight: 600; cursor: pointer; text-decoration: underline; padding: 0; font-size: inherit;"
									onclick={() => onopenviewprofile(job.customer_id)}
								>
									{job.customerName}
								</button>
							</div>
						</div>
						<div style="text-align: right;">
							<strong class="feed-job-budget">
								₱{job.budget.toLocaleString()}
							</strong>
						</div>
					</div>

					<p class="feed-job-desc">
						{job.description}
					</p>

					<div class="metadata-bar feed-job-meta">
						<div style="display: flex; align-items: center; gap: 0.4rem;">
							<MapPin size={15} style="color: #38bdf8; flex-shrink: 0;" />
							<span><strong style="color: var(--text-primary);">Loc:</strong> {job.location}</span>
						</div>
						<div style="display: flex; align-items: center; gap: 0.4rem;">
							<Calendar size={15} style="color: #a78bfa; flex-shrink: 0;" />
							<span>
								<strong style="color: var(--text-primary);">Sched:</strong>
								{new Date(job.target_date).toLocaleDateString("en-PH", {
									month: "short",
									day: "numeric",
									hour: "2-digit",
									minute: "2-digit",
								})}
							</span>
						</div>
					</div>

					{#if job.latitude && job.longitude}
						<div class="feed-job-map-preview">
							<div class="feed-job-map-header">
								<div style="display: flex; align-items: center; gap: 0.35rem; color: var(--accent-hover); font-weight: 600;">
									<MapPin size={13} /> Pinned GPS Location ({job.latitude}, {job.longitude})
								</div>
								<a 
									href={getGoogleMapsUrl(job.latitude, job.longitude, job.title)} 
									target="_blank" 
									rel="noopener noreferrer" 
									class="btn btn-outline"
									style="padding: 0.15rem 0.5rem; font-size: 0.72rem; border-color: var(--accent); color: var(--accent-hover);"
								>
									<ExternalLink size={11} /> Open Directions
								</a>
							</div>
							<div class="feed-job-map-iframe-container">
								<iframe 
									title="Pinned Job Location Map"
									src={getEmbedMapUrl(job.latitude, job.longitude)}
									loading="lazy"
								></iframe>
							</div>
						</div>
					{/if}

					<div
						class="feed-job-actions"
						style="display: flex; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: 0.75rem;"
					>
						{#if job.hasApplied}
							<button
								type="button"
								class="btn btn-outline"
								style="padding: 0.45rem 1.1rem; border-color: var(--accent); color: var(--accent-hover); display: inline-flex; align-items: center; gap: 0.35rem;"
								onclick={() => onopenchat(job.id, job.customer_id)}
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
										onopenchat(job.id, job.customer_id);
									};
								}}
								style="width: 100%; display: flex; justify-content: flex-end;"
							>
								<input type="hidden" name="jobId" value={job.id} />
								<input type="hidden" name="customerId" value={job.customer_id} />
								<input type="hidden" name="initialMessage" value="Hello! Inquiring po ako sa sideline job na ito: {job.title}." />
								<button
									type="submit"
									class="btn btn-primary"
									style="padding: 0.45rem 1.1rem; display: inline-flex; align-items: center; gap: 0.35rem;"
									disabled={applyingJobId === job.id}
									id="inquire-btn-{job.id}"
								>
									{#if applyingJobId === job.id}
										<span class="spinner spinner-sm"></span>
										<span>Connecting...</span>
									{:else}
										<MessageSquare size={14} />
										<span>Apply / Chat Client</span>
									{/if}
								</button>
							</form>
						{/if}
					</div>
				</div>
			{/each}

			{#if visibleFeedJobsLimit < filteredJobs.length}
				<div style="text-align: center; padding: 1rem 0;">
					<button
						type="button"
						class="btn btn-secondary"
						onclick={onloadmorefeedjobs}
						style="padding: 0.6rem 1.5rem;"
					>
						Load 20 More Jobs ({filteredJobs.length - visibleFeedJobsLimit} remaining)
					</button>
				</div>
			{/if}
		{/if}
	</section>
</div>
