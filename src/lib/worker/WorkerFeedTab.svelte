<script>
	import { enhance } from '$app/forms';
	import { 
		SlidersHorizontal, 
		ChevronUp, 
		ChevronDown, 
		Search, 
		X, 
		MapPin, 
		ExternalLink, 
		MessageSquare, 
		User, 
		Calendar, 
		Clock, 
		RotateCcw, 
		Loader2, 
		Settings,
		Bookmark,
		Share2
	} from 'lucide-svelte';
	import { getGoogleMapsUrl, getServieeMapUrl, getEmbedMapUrl } from '$lib/gpsUtils.js';
	import { mapModal } from '$lib/mapViewerModal.svelte.js';
	import FeedRefreshSpeedDial from '$lib/FeedRefreshSpeedDial.svelte';
	import FeedViewToggle from '$lib/FeedViewToggle.svelte';
	import ShareJobModal from '$lib/ShareJobModal.svelte';
	import SavedJobsDrawer from '$lib/SavedJobsDrawer.svelte';
	import JobFeedMapView from '$lib/JobFeedMapView.svelte';
	import { savedJobs } from '$lib/savedJobs.svelte.js';

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
		applyingJobId = $bindable(null), 
		onloadmore,
		onopenviewprofile, 
		onopenchat
	} = $props();

	let viewMode = $state('list'); // 'list' | 'map'
	let shareModalOpen = $state(false);
	let shareTargetJob = $state(null);

	function handleOpenShare(job) {
		shareTargetJob = job;
		shareModalOpen = true;
	}

	const mappedJobsCount = $derived(
		(jobs || []).filter(
			(j) => j && j.latitude && j.longitude && !isNaN(parseFloat(j.latitude)) && !isNaN(parseFloat(j.longitude))
		).length
	);

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
			case "Plumbing / Tubero": return "badge-plumbing";
			case "Roofing / Ayos Yero": return "badge-roofing";
			case "Excavation / Hukay Lupa": return "badge-excavation";
			case "Gardening": return "badge-gardening";
			case "Carpentry": return "badge-carpentry";
			case "Others": return "badge-general";
			default: return "badge-general";
		}
	}

	function handleWindowScroll() {
		if (typeof window === 'undefined' || loading || loadingMore || !hasMore || viewMode === 'map') return;
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
		style="position: sticky; top: 90px; padding: 1.25rem;"
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
					{#if searchLocation && !availableLocations.includes(searchLocation)}
						<option value={searchLocation}>{searchLocation}</option>
					{/if}
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
	<section style="display: flex; flex-direction: column; gap: 1rem; min-width: 0; width: 100%;">
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
			<div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
				<h2 style="font-size: 1.25rem; margin: 0;">
					Available Jobs ({totalCount || jobs.length})
				</h2>
				<button 
					type="button" 
					class="feed-saved-trigger-btn {savedJobs.count > 0 ? 'has-saved' : ''}"
					onclick={() => savedJobs.openDrawer()}
					title="View Saved Jobs"
				>
					<Bookmark size={14} style={savedJobs.count > 0 ? 'fill: currentColor;' : ''} />
					<span>Saved {savedJobs.count > 0 ? `(${savedJobs.count})` : ''}</span>
				</button>
			</div>

			<FeedViewToggle bind:viewMode={viewMode} />
		</div>

		{#if viewMode === 'map'}
			<JobFeedMapView 
				{jobs} 
				{applyingJobId} 
				{onopenchat} 
				{onopenviewprofile} 
				onopenshare={handleOpenShare} 
			/>
		{:else}
			{#if loading && jobs.length > 0}
				<div class="card" style="display: flex; align-items: center; justify-content: center; gap: 0.6rem; padding: 0.65rem 1rem; border-color: var(--accent); background: rgba(59, 130, 246, 0.05); font-size: 0.88rem; color: var(--accent); font-weight: 500;">
					<Settings size={16} class="animate-spin" />
					<span>Updating filter results...</span>
				</div>
			{/if}

			{#if loading && jobs.length === 0}
				<div class="card" style="text-align: center; padding: 4rem 2rem;">
					<Settings size={36} class="animate-spin" style="margin: 0 auto 1rem auto; color: var(--accent);" />
					<p style="color: var(--text-secondary); font-size: 0.95rem;">Fetching & filtering available jobs...</p>
				</div>
			{:else if jobs.length === 0}
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
				{#each jobs as job (job.id)}
					<div
						class="card feed-job-card"
					>
						<div class="feed-job-header">
							<!-- Top Row: Badges on left, Actions on right -->
							<div class="feed-job-top-bar">
								<div class="feed-job-badges">
									<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
								</div>
								<div class="feed-job-card-actions">
									<button 
										type="button" 
										class="feed-job-action-btn"
										onclick={(e) => {
											e.stopPropagation();
											handleOpenShare(job);
										}}
										title="Share Job"
										aria-label="Share Job"
									>
										<Share2 size={16} />
									</button>
									<button 
										type="button" 
										class="feed-job-action-btn {savedJobs.isSaved(job.id) ? 'saved' : ''}"
										onclick={(e) => {
											e.stopPropagation();
											savedJobs.toggle(job);
										}}
										title={savedJobs.isSaved(job.id) ? 'Remove from Saved Jobs' : 'Save Job for Later'}
										aria-label={savedJobs.isSaved(job.id) ? 'Remove from Saved Jobs' : 'Save Job for Later'}
									>
										<Bookmark size={16} style={savedJobs.isSaved(job.id) ? 'fill: currentColor;' : ''} />
									</button>
								</div>
							</div>

							<!-- Title Row -->
							<h3 class="feed-job-title">
								{job.title}
							</h3>

							<!-- Client Row -->
							<div class="feed-job-posted-by">
								<div style="display: inline-flex; align-items: center; gap: 0.35rem; min-width: 0;">
									<User size={13} style="color: var(--accent); flex-shrink: 0;" />
									<span>Client:</span> 
									<button 
										type="button" 
										class="posted-by-link"
										onclick={() => onopenviewprofile(job.customer_id)}
									>
										{job.customerName}
									</button>
								</div>
								<span class="feed-job-date">
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
						</div>

						<div class="feed-job-divider"></div>

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
									<div class="feed-job-map-title-wrap">
										<span class="feed-job-map-pin-icon"><MapPin size={13} /></span>
										<span class="feed-job-map-title-text">Pinned GPS Location ({job.latitude}, {job.longitude})</span>
									</div>
									<a 
										href={getServieeMapUrl(job.latitude, job.longitude, job.title, job.location)} 
										class="feed-job-directions-link"
										onclick={(e) => {
											e.preventDefault();
											mapModal.openModal({ latitude: job.latitude, longitude: job.longitude, title: job.title, address: job.location });
										}}
										title="View Map"
										aria-label="View Map"
									>
										<MapPin size={14} class="feed-job-map-btn-icon" />
										<span class="feed-job-map-btn-text">View Map</span>
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

						<div class="feed-job-footer">
							<div class="feed-job-budget-wrap">
								<span class="feed-job-budget-label">Budget</span>
								<strong class="feed-job-budget">
									₱{job.budget.toLocaleString()}
								</strong>
							</div>

							<div>
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
											const initMsg = `Hello! Inquiring po ako sa sideline job na ito: ${job.title}.`;
											return async ({ update, result }) => {
												applyingJobId = null;
												await update();
												const sentMessage = result?.type === 'success' && result?.data ? result.data.sentMessage : null;
												onopenchat(job.id, job.customer_id, {
													initialMessage: initMsg,
													sentMessage,
													jobTitle: job.title,
													customerName: job.customerName
												});
											};
										}}
										style="display: inline-flex;"
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
					</div>
				{/each}

				{#if loadingMore}
					<div style="display: flex; justify-content: center; align-items: center; padding: 1.5rem; gap: 0.5rem; color: var(--text-secondary);">
						<Loader2 size={20} class="animate-spin" style="color: var(--accent);" />
						<span style="font-size: 0.9rem;">Loading more jobs...</span>
					</div>
				{:else if !hasMore && jobs.length > 0}
					<div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.85rem; border-top: 1px dashed var(--border);">
						✓ You have viewed all available sideline jobs ({jobs.length} total)
					</div>
				{/if}
			{/if}
		{/if}
	</section>

	<!-- Feed Refresh Speed Dial (Floating Action Button) -->
	<FeedRefreshSpeedDial />

	<!-- Share Job Modal -->
	<ShareJobModal 
		isOpen={shareModalOpen} 
		job={shareTargetJob} 
		onClose={() => {
			shareModalOpen = false;
			shareTargetJob = null;
		}} 
	/>

	<!-- Saved Jobs Drawer -->
	<SavedJobsDrawer 
		{onopenchat} 
		{onopenviewprofile} 
		onopenshare={handleOpenShare} 
	/>
</div>
