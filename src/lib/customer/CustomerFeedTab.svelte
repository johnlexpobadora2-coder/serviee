<script>
	import { SlidersHorizontal, ChevronUp, ChevronDown, Search, X, Trash2, MapPin, ExternalLink, User, Calendar, Clock } from 'lucide-svelte';
	import { CITIES_MUNICIPALITIES } from '$lib/locations.js';
	import { getGoogleMapsUrl, getEmbedMapUrl } from '$lib/gpsUtils.js';

	let { 
		filteredJobs = [], 
		searchCategory = $bindable(''), 
		searchLocation = $bindable(''), 
		minBudget = $bindable(null), 
		maxBudget = $bindable(null), 
		searchQuery = $bindable(''), 
		showMobileFilters = $bindable(false), 
		hasActiveFilters = false, 
		currentUserId = null, 
		onopenviewprofile, 
		onopendeletejob 
	} = $props();

	function clearFilters() {
		searchCategory = '';
		searchLocation = '';
		minBudget = null;
		maxBudget = null;
		searchQuery = '';
	}

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
		<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
			<h4 style="font-size: 1.1rem; margin: 0;">Filter Jobs</h4>
			{#if hasActiveFilters || searchQuery}
				<button type="button" class="btn-text-clear" onclick={clearFilters}>
					Clear all
				</button>
			{/if}
		</div>
		
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

			<div class="form-group form-group-full">
				<label for="filter-budget-min">Budget Range (₱)</label>
				<div class="price-range-container">
					<input 
						type="number" 
						id="filter-budget-min" 
						placeholder="Min ₱" 
						min="0"
						bind:value={minBudget} 
					/>
					<span class="price-range-separator">-</span>
					<input 
						type="number" 
						id="filter-budget-max" 
						placeholder="Max ₱" 
						min="0"
						bind:value={maxBudget} 
					/>
				</div>
				<div class="price-preset-pills">
					<button 
						type="button" 
						class="price-pill {minBudget === null && maxBudget === 500 ? 'active' : ''}" 
						onclick={() => { minBudget = null; maxBudget = 500; }}
					>&lt; ₱500</button>
					<button 
						type="button" 
						class="price-pill {minBudget === 500 && maxBudget === 1000 ? 'active' : ''}" 
						onclick={() => { minBudget = 500; maxBudget = 1000; }}
					>₱500 - 1k</button>
					<button 
						type="button" 
						class="price-pill {minBudget === 1000 && maxBudget === 5000 ? 'active' : ''}" 
						onclick={() => { minBudget = 1000; maxBudget = 5000; }}
					>₱1k - 5k</button>
					<button 
						type="button" 
						class="price-pill {minBudget === 5000 && maxBudget === null ? 'active' : ''}" 
						onclick={() => { minBudget = 5000; maxBudget = null; }}
					>₱5k+</button>
				</div>
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
							<div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
								<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
								<span class="status status-{job.status}">
									{#if job.status === 'open'} Open
									{:else if job.status === 'assigned'} Assigned
									{:else if job.status === 'in_progress'} In Progress
									{:else} Completed
									{/if}
								</span>
								<span style="font-size: 0.78rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 0.25rem;">
									<Clock size={12} />
									{new Date(job.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
								</span>
							</div>
							<h3 class="feed-job-title">{job.title}</h3>
							<div style="font-size: 0.82rem; color: var(--text-secondary); display: inline-flex; align-items: center; gap: 0.35rem; margin-top: 0.15rem;">
								<User size={13} style="color: var(--accent);" />
								<span>Posted by:</span>
								{#if job.customer_id !== currentUserId}
									<button 
										type="button" 
										style="background: none; border: none; color: var(--accent-hover); font-weight: 600; cursor: pointer; text-decoration: underline; padding: 0; font-size: inherit;"
										onclick={() => onopenviewprofile(job.customer_id)}
									>
										{job.customerName}
									</button>
								{:else}
									<strong style="color: var(--text-primary);">{job.customerName} (You)</strong>
								{/if}
							</div>
						</div>
						<div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
							<strong class="feed-job-budget">₱{job.budget.toLocaleString()}</strong>
							{#if job.customer_id === currentUserId}
								<button
									type="button"
									class="btn btn-outline"
									style="padding: 0.3rem 0.75rem; font-size: 0.75rem; border-color: rgba(239, 68, 68, 0.4); color: #f87171; background: rgba(239, 68, 68, 0.1); border-radius: 8px; display: inline-flex; align-items: center; gap: 0.35rem; transition: all 0.2s;"
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
						<div style="display: flex; align-items: center; gap: 0.4rem;">
							<MapPin size={15} style="color: #38bdf8; flex-shrink: 0;" />
							<span><strong style="color: var(--text-primary);">Location:</strong> {job.location}</span>
						</div>
						<div style="display: flex; align-items: center; gap: 0.4rem;">
							<Calendar size={15} style="color: #a78bfa; flex-shrink: 0;" />
							<span><strong style="color: var(--text-primary);">Schedule:</strong> {new Date(job.target_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
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
