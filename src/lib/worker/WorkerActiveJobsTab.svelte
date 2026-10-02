<script>
	import { User, MessageSquare, MapPin, ExternalLink, Clock, Calendar, Loader2, Zap, CheckCircle2 } from 'lucide-svelte';
	import { getGoogleMapsUrl, getServieeMapUrl, getEmbedMapUrl } from '$lib/gpsUtils.js';
	import JobMapPreview from '$lib/JobMapPreview.svelte';
	import JobDescription from '$lib/JobDescription.svelte';
	import { formatRelativeTime, formatFullDateTime, getScheduleUrgency } from '$lib/jobCardUtils.js';

	let { 
		activeJobs = [], 
		totalCount = 0,
		loading = false,
		loadingMore = false,
		hasMore = false,
		onloadmore,
		onopenviewprofile, 
		onopenchat 
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

<section
	style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 900px; margin: 0 auto; padding-right: 0.5rem;"
>
	<h2 style="font-size: 1.5rem;">
		My Active Jobs ({totalCount || activeJobs.length})
	</h2>

	{#if loading && activeJobs.length === 0}
		<div class="card" style="text-align: center; padding: 4rem 2rem;">
			<Loader2 size={32} class="animate-spin" style="margin: 0 auto 1rem auto; color: var(--accent);" />
			<p style="color: var(--text-secondary); font-size: 0.95rem;">Loading your active jobs...</p>
		</div>
	{:else if activeJobs.length === 0}
		<div
			class="card"
			style="text-align: center; padding: 4rem 2rem; border-style: dashed;"
		>
			<h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">
				You have no active jobs at the moment.
			</h4>
			<p style="color: var(--text-secondary); font-size: 0.9rem;">
				Head over to the **Sideline Feed** tab to browse and apply for available jobs.
			</p>
		</div>
	{:else}
		{#each activeJobs as job (job.id)}
			<div class="card feed-job-card">
				<div class="feed-job-header">
					<!-- Top Row: Badges on left -->
					<div class="feed-job-top-bar">
						<div class="feed-job-badges">
							<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
							<span class="status status-{job.status}">
								{job.status === "assigned" ? "Assigned" : "In Progress"}
							</span>
						</div>
					</div>

					<!-- Title Row -->
					<h3 class="feed-job-title">{job.title}</h3>

					{#if job.created_at}
						<div class="feed-job-posted-by">
							<span class="feed-job-date" title={formatFullDateTime(job.created_at)}>
								<Clock size={12} />
								{formatRelativeTime(job.created_at)}
							</span>
						</div>
					{/if}
				</div>

				<div class="feed-job-divider"></div>

				<JobDescription text={job.description} />

				<!-- Client Contact Box -->
				<div
					class="active-contact-box"
					style="padding: 0.85rem 1rem; background-color: var(--accent-light); border: 1px dashed var(--accent); border-radius: var(--radius-md); font-size: 0.85rem; margin: 0.25rem 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;"
				>
					<div>
						<p style="margin-bottom: 0.2rem; font-size: 0.85rem;">
							<strong>Client:</strong> {job.customerName}
						</p>
						<p style="margin-bottom: 0;">
							<strong>Phone:</strong>
							<span style="font-family: monospace; font-size: 0.95rem; color: var(--accent-hover); font-weight: 600;">{job.customerPhone}</span>
						</p>
					</div>

					<div class="active-contact-actions" style="display: flex; gap: 0.4rem; align-items: center;">
						<button
							type="button"
							class="btn btn-outline"
							style="padding: 0.4rem 0.75rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.3rem;"
							onclick={() => onopenviewprofile(job.customer_id)}
						>
							<User size={13} /> Profile
						</button>

						<button
							type="button"
							class="btn btn-outline"
							style="padding: 0.4rem 0.75rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.3rem;"
							onclick={() => onopenchat(job.id, job.customer_id)}
						>
							<MessageSquare size={13} /> Chat
						</button>
					</div>
				</div>

				<div class="metadata-bar feed-job-meta">
					<div style="display: flex; align-items: center; gap: 0.4rem;">
						<MapPin size={15} style="color: #38bdf8; flex-shrink: 0;" />
						<span><strong style="color: var(--text-primary);">Loc:</strong> {job.location}</span>
					</div>
					<div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
						<div style="display: inline-flex; align-items: center; gap: 0.4rem;">
							<Calendar size={15} style="color: #a78bfa; flex-shrink: 0;" />
							<span>
								<strong style="color: var(--text-primary);">Target:</strong>
								{new Date(job.target_date).toLocaleDateString("en-PH", {
									month: "short",
									day: "numeric",
									hour: "2-digit",
									minute: "2-digit",
								})}
							</span>
						</div>
						{#if getScheduleUrgency(job.target_date)}
							{@const urgency = getScheduleUrgency(job.target_date)}
							<span class="schedule-urgency-badge {urgency.type}">
								{#if urgency.type === 'rush'}
									<Zap size={11} class="shrink-0" />
								{:else if urgency.type === 'urgent'}
									<Clock size={11} class="shrink-0" />
								{/if}
								<span>{urgency.label}</span>
							</span>
						{/if}
					</div>
				</div>

				{#if job.latitude && job.longitude}
					<JobMapPreview
						latitude={job.latitude}
						longitude={job.longitude}
						title={job.title}
						location={job.location}
					/>
				{/if}

				<div class="feed-job-footer">
					<div class="feed-job-budget-wrap">
						<span class="feed-job-budget-label">Budget</span>
						<strong class="feed-job-budget">₱{job.budget.toLocaleString()}</strong>
					</div>
				</div>
			</div>
		{/each}

		{#if loadingMore}
			<div style="display: flex; justify-content: center; align-items: center; padding: 1.5rem; gap: 0.5rem; color: var(--text-secondary);">
				<Loader2 size={20} class="animate-spin" style="color: var(--accent);" />
				<span style="font-size: 0.9rem;">Loading more active jobs...</span>
			</div>
		{:else if !hasMore && activeJobs.length > 0}
			<div class="flex items-center justify-center gap-1.5 text-center py-8 px-4 text-(--text-muted) text-[0.85rem] border-t border-dashed border-(--border)">
				<CheckCircle2 size={14} class="shrink-0 text-(--text-muted)" />
				<span>You have viewed all your active assigned jobs ({activeJobs.length} total)</span>
			</div>
		{/if}
	{/if}
</section>
