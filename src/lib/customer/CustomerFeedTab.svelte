<script>
	import { SlidersHorizontal, ChevronUp, ChevronDown, Search, X, Trash2, MapPin, ExternalLink, User, Calendar, Clock, RotateCcw, Loader2, Settings } from 'lucide-svelte';
	import { getGoogleMapsUrl, getEmbedMapUrl } from '$lib/gpsUtils.js';
	import FeedRefreshSpeedDial from '$lib/FeedRefreshSpeedDial.svelte';

	let { 
		jobs = [], 
		totalCount = 0,
		loading = false,
		loadingMore = false,
		hasMore = false,
		availableLocations = [],
		searchCategory = $bindable(''), 
		searchLocation = $bindable(''), 
		minBudget = $bindable(null), 
		maxBudget = $bindable(null), 
		searchQuery = $bindable(''), 
		sortBy = $bindable('newest'), 
		showMobileFilters = $bindable(false), 
		hasActiveFilters = false, 
		currentUserId = null, 
		onloadmore,
		onopenviewprofile, 
		onopendeletejob 
	} = $props();

	function clearFilters() {
		searchCategory = '';
		searchLocation = '';
		minBudget = null;
		maxBudget = null;
		searchQuery = '';
		sortBy = 'newest';
	}

	function getCategoryBadge(category) {
		switch (category) {
			case 'Plumbing / Tubero': return 'badge-plumbing';
			case 'Roofing / Ayos Yero': return 'badge-roofing';
			case 'Excavation / Hukay Lupa': return 'badge-excavation';
			case 'Gardening': return 'badge-gardening';
			case 'Carpentry': return 'badge-carpentry';
			case 'Others': return 'badge-general';
			default: return 'badge-general';
		}
	}

	function handleWindowScroll() {
		if (typeof window === 'undefined' || loading || loadingMore || !hasMore) return;
		const scrollPosition = window.innerHeight + window.scrollY;
		const threshold = document.documentElement.scrollHeight - 300;
		if (scrollPosition >= threshold) {
			if (onloadmore) {
				onloadmore();
			}
		}
	}

	$effect(() => {
		if (typeof window !== 'undefined') {
			window.addEventListener('scroll', handleWindowScroll, { passive: true });
			return () => {
				window.removeEventListener('scroll', handleWindowScroll);
			};
		}
	});
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
			<h4 style="font-size: 1.1rem; margin: 0; display: flex; align-items: center; gap: 0.4rem;">
				{#if loading}
					<Settings size={17} class="animate-spin" style="color: var(--accent);" />
				{:else}
					<SlidersHorizontal size={17} style="color: var(--accent);" />
				{/if}
				Filter Jobs
			</h4>
			{#if hasActiveFilters || searchLocation || searchCategory || minBudget !== null || maxBudget !== null || searchQuery || sortBy !== 'newest'}
				<button type="button" class="btn-text-clear" onclick={clearFilters} style="display: inline-flex; align-items: center; gap: 0.25rem;">
					<RotateCcw size={13} /> Clear all
				</button>
			{/if}
		</div>
		
		<div class="feed-filters-grid">
			<div class="form-group form-group-full">
				<label for="filter-sort">Sort By</label>
				<select id="filter-sort" bind:value={sortBy}>
					<option value="newest">Newest First (Default)</option>
					<option value="highest_cost">Highest Budget (₱ High to Low)</option>
					<option value="lowest_cost">Lowest Budget (₱ Low to High)</option>
					<option value="nearest_date">Target Date (Soonest Schedule)</option>
				</select>
			</div>

			<div class="form-group form-group-full">
				<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
					<label for="filter-category" style="margin-bottom: 0;">Category</label>
					{#if searchCategory}
						<button 
							type="button" 
							class="btn-text-clear" 
							style="font-size: 0.72rem;" 
							onclick={() => { searchCategory = ''; }}
						>
							Clear Category
						</button>
					{/if}
				</div>
				<select id="filter-category" bind:value={searchCategory}>
					<option value="">All Categories</option>
					<option value="Plumbing / Tubero">Plumbing / Tubero</option>
					<option value="Roofing / Ayos Yero">Roofing / Ayos Yero</option>
					<option value="Excavation / Hukay Lupa">Excavation / Hukay Lupa</option>
					<option value="Gardening">Gardening / Landscape</option>
					<option value="Carpentry">Carpentry / Karpintero</option>
					<option value="General Manual Labor">General Manual Labor</option>
					<option value="Others">Others</option>
				</select>
			</div>

			<div class="form-group form-group-full">
				<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
					<label for="filter-location" style="margin-bottom: 0;">City/Municipality</label>
					{#if searchLocation}
						<button 
							type="button" 
							class="btn-text-clear" 
							style="font-size: 0.72rem;" 
							onclick={() => { searchLocation = ''; }}
						>
							Clear Location
						</button>
					{/if}
				</div>
				<select 
					id="filter-location" 
					bind:value={searchLocation} 
				>
					<option value="">All Locations {availableLocations.length > 0 ? `(${availableLocations.length} active)` : ''}</option>
					{#each availableLocations as city}
						<option value={city}>{city}</option>
					{/each}
				</select>
			</div>

			<div class="form-group form-group-full">
				<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
					<label for="filter-budget-min" style="margin-bottom: 0;">Budget Range (₱)</label>
					{#if minBudget !== null || maxBudget !== null}
						<button 
							type="button" 
							class="btn-text-clear" 
							style="font-size: 0.72rem;" 
							onclick={() => { minBudget = null; maxBudget = null; }}
						>
							Clear Price
						</button>
					{/if}
				</div>
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
						class="price-pill {minBudget === 5000 && maxBudget === 20000 ? 'active' : ''}" 
						onclick={() => { minBudget = 5000; maxBudget = 20000; }}
					>₱5k - 20k</button>
					<button 
						type="button" 
						class="price-pill {minBudget === 20000 && maxBudget === null ? 'active' : ''}" 
						onclick={() => { minBudget = 20000; maxBudget = null; }}
					>₱20k+</button>
				</div>
			</div>
		</div>
	</aside>

	<!-- Feed stream list -->
	<section style="display: flex; flex-direction: column; gap: 1.25rem;">
		<!-- Search Bar above Job Postings -->
		<div class="job-search-bar-container">
			<div class="job-search-input-wrapper">
				{#if loading}
					<Settings size={18} class="job-search-icon animate-spin" style="color: var(--accent);" />
				{:else}
					<Search size={18} class="job-search-icon" />
				{/if}
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
			<h2 style="font-size: 1.4rem;">
				All Available Postings ({totalCount || jobs.length})
			</h2>
			<a href="/customer/post-job" class="btn btn-primary" style="width: auto; padding: 0.5rem 1.25rem;">
				+ Post a Job
			</a>
		</div>

		{#if loading && jobs.length > 0}
			<div class="card" style="display: flex; align-items: center; justify-content: center; gap: 0.6rem; padding: 0.65rem 1rem; border-color: var(--accent); background: rgba(59, 130, 246, 0.05); font-size: 0.88rem; color: var(--accent); font-weight: 500;">
				<Settings size={16} class="animate-spin" />
				<span>Updating filter results...</span>
			</div>
		{/if}

		{#if loading && jobs.length === 0}
			<div class="card" style="text-align: center; padding: 4rem 2rem;">
				<Settings size={36} class="animate-spin" style="margin: 0 auto 1rem auto; color: var(--accent);" />
				<p style="color: var(--text-secondary); font-size: 0.95rem;">Fetching & filtering job postings...</p>
			</div>
		{:else if jobs.length === 0}
			<div class="card" style="text-align: center; padding: 4rem 2rem; border-style: dashed;">
				<h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">No job postings found.</h4>
				<p style="color: var(--text-secondary); font-size: 0.9rem;">
					Try modifying your filters or check back later for new job postings.
				</p>
			</div>
		{:else}
			{#each jobs as job (job.id)}
				<div class="card feed-job-card">
					<div class="feed-job-header">
						<!-- Top Row: Badges on left -->
						<div class="feed-job-top-bar">
							<div class="feed-job-badges">
								<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
								<span class="status status-{job.status}">
									{#if job.status === 'open'} Open
									{:else if job.status === 'assigned'} Assigned
									{:else if job.status === 'in_progress'} In Progress
									{:else} Completed
									{/if}
								</span>
							</div>
						</div>

						<!-- Title Row -->
						<h3 class="feed-job-title">{job.title}</h3>

						<!-- Posted By Row -->
						<div class="feed-job-posted-by">
							<div style="display: inline-flex; align-items: center; gap: 0.35rem; min-width: 0;">
								<User size={13} style="color: var(--accent); flex-shrink: 0;" />
								<span>Posted by:</span>
								{#if job.customer_id !== currentUserId}
									<button 
										type="button" 
										class="posted-by-link"
										onclick={() => onopenviewprofile(job.customer_id)}
									>
										{job.customerName}
									</button>
								{:else}
									<strong class="posted-by-self">{job.customerName} (You)</strong>
								{/if}
							</div>
							<span class="feed-job-date">
								<Clock size={12} />
								{new Date(job.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
							</span>
						</div>
					</div>

					<div class="feed-job-divider"></div>

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
									target="_blank"
									rel="noopener noreferrer"
									class="feed-job-directions-link"
								>
									<ExternalLink size={12} /> Open Directions
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

					<!-- Bottom Price & Action Footer -->
					<div class="feed-job-footer">
						<div class="feed-job-budget-wrap">
							<span class="feed-job-budget-label">Budget</span>
							<strong class="feed-job-budget">₱{job.budget.toLocaleString()}</strong>
						</div>
						{#if job.customer_id === currentUserId}
							<button
								type="button"
								class="btn btn-outline feed-job-delete-btn"
								onclick={() => onopendeletejob(job)}
								title="Delete Your Job Post"
							>
								<Trash2 size={13} />
								<span>Delete</span>
							</button>
						{/if}
					</div>
				</div>
			{/each}

			<!-- Infinite Scroll Loading Indicator & End of Feed Indicator -->
			{#if loadingMore}
				<div style="display: flex; justify-content: center; align-items: center; padding: 1.5rem; gap: 0.5rem; color: var(--text-secondary);">
					<Loader2 size={20} class="animate-spin" style="color: var(--accent);" />
					<span style="font-size: 0.9rem;">Loading more jobs...</span>
				</div>
			{:else if !hasMore && jobs.length > 0}
				<div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.85rem; border-top: 1px dashed var(--border);">
					✓ You have viewed all available job postings ({jobs.length} total)
				</div>
			{/if}
		{/if}
	</section>

	<!-- Feed Refresh Speed Dial (Floating Action Button) -->
	<FeedRefreshSpeedDial />
</div>
