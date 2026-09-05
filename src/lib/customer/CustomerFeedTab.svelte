<script>
	import { SlidersHorizontal, ChevronUp, ChevronDown, Search, X, Trash2, MapPin, ExternalLink } from 'lucide-svelte';
	import { CITIES_MUNICIPALITIES } from '$lib/locations.js';
	import { getGoogleMapsUrl, getEmbedMapUrl } from '$lib/gpsUtils.js';

	let { 
		filteredJobs = [], 
		searchCategory = $bindable(''), 
		searchLocation = $bindable(''), 
		minBudget = $bindable(null), 
		searchQuery = $bindable(''), 
		showMobileFilters = $bindable(false), 
		hasActiveFilters = false, 
		currentUserId = null, 
		onopenviewprofile, 
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
		style="position: sticky; top: 90px; padding: 1.25rem; height: fit-content;"
	>
		<h4 style="font-size: 1.1rem; margin-bottom: 0.75rem;">Filter Jobs</h4>
		
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
	<section style="display: flex; flex-direction: column; gap: 1.25rem;">
		<!-- Search Bar above Job Postings -->
		<div class="job-search-bar-container">
			<div class="job-search-input-wrapper">
				<Search size={18} class="job-search-icon" />
				<input 
					type="text" 
					id="job-search-input" 
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

		<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
			<h2 style="font-size: 1.4rem;">All Available Postings ({filteredJobs.length})</h2>
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
				<div class="card feed-job-card">
					<div class="feed-job-header">
						<div>
							<div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.35rem;">
								<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
								<span class="status status-{job.status}">
									{#if job.status === 'open'} Open
									{:else if job.status === 'assigned'} Assigned
									{:else if job.status === 'in_progress'} In Progress
									{:else} Completed
									{/if}
								</span>
								<span style="font-size: 0.75rem; color: var(--text-muted);">
									Posted: {new Date(job.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
								</span>
							</div>
							<h3 class="feed-job-title">{job.title}</h3>
							<span style="font-size: 0.8rem; color: var(--text-secondary);">
								Posted by: 
								{#if job.customer_id !== currentUserId}
									<button 
										type="button" 
										style="background: none; border: none; color: var(--accent); font-weight: 600; cursor: pointer; text-decoration: underline; padding: 0; font-size: inherit;"
										onclick={() => onopenviewprofile(job.customer_id)}
									>
										{job.customerName}
									</button>
								{:else}
									<strong>{job.customerName} (You)</strong>
								{/if}
							</span>
						</div>
						<div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem;">
							<strong class="feed-job-budget" style="color: var(--accent); font-size: 1.25rem; display: block;">₱{job.budget.toLocaleString()}</strong>
							{#if job.customer_id === currentUserId}
								<button
									type="button"
									class="btn btn-outline"
									style="padding: 0.25rem 0.6rem; font-size: 0.75rem; border-color: #ef4444; color: #ef4444; display: inline-flex; align-items: center; gap: 0.3rem;"
									onclick={() => onopendeletejob(job)}
									title="Delete Your Job Post"
								>
									<Trash2 size={13} />
									<span>Delete</span>
								</button>
							{/if}
						</div>
					</div>

					<p class="feed-job-desc">
						{job.description}
					</p>

					<div class="metadata-bar feed-job-meta">
						<div><strong>Location:</strong> {job.location}</div>
						<div><strong>Schedule:</strong> {new Date(job.target_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
						{#if job.latitude && job.longitude}
							<div>
								<a 
									href={getGoogleMapsUrl(job.latitude, job.longitude, job.title)} 
									target="_blank" 
									rel="noopener noreferrer" 
									class="gps-badge"
								>
									<MapPin size={12} /> Google Maps
								</a>
							</div>
						{/if}
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
				</div>
			{/each}
		{/if}
	</section>
</div>
