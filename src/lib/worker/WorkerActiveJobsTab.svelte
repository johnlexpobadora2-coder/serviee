<script>
	import { User, MessageSquare, MapPin, ExternalLink } from 'lucide-svelte';
	import { getGoogleMapsUrl, getEmbedMapUrl } from '$lib/gpsUtils.js';

	let { 
		sortedMyJobs = [], 
		visibleMyJobs = [], 
		visibleMyJobsLimit = $bindable(20), 
		onopenviewprofile, 
		onopenchat, 
		onloadmoremyjobs, 
		onmyjobsscroll 
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

<section
	style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 900px; margin: 0 auto; max-height: calc(100vh - 180px); overflow-y: auto; padding-right: 0.5rem;"
	onscroll={onmyjobsscroll}
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
				Head over to the **Sideline Feed** tab to browse and apply for available jobs.
			</p>
		</div>
	{:else}
		{#each visibleMyJobs as job (job.id)}
			<div
				class="card active-job-card"
				style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.85rem;"
			>
				<div class="active-job-header">
					<div>
						<div
							style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.35rem;"
						>
							<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
							<span class="status status-{job.status}">
								{job.status === "assigned" ? "Assigned" : "In Progress"}
							</span>
							{#if job.created_at}
								<span style="font-size: 0.75rem; color: var(--text-muted);">
									Posted: {new Date(job.created_at).toLocaleDateString("en-PH", {
										month: "short",
										day: "numeric",
										year: "numeric",
										hour: "numeric",
										minute: "2-digit",
									})}
								</span>
							{/if}
						</div>
						<h3
							class="active-job-title"
							style="font-size: 1.25rem; color: var(--text-primary);"
						>
							{job.title}
						</h3>
					</div>
					<strong
						class="active-job-budget"
						style="color: var(--success); font-size: 1.25rem;"
					>₱{job.budget.toLocaleString()}</strong>
				</div>

				<p
					class="active-job-desc"
					style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;"
				>
					{job.description}
				</p>

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
					<div><strong>Loc:</strong> {job.location}</div>
					<div>
						<strong>Target:</strong>
						{new Date(job.target_date).toLocaleDateString("en-PH", {
							month: "short",
							day: "numeric",
							hour: "2-digit",
							minute: "2-digit",
						})}
					</div>
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

		{#if visibleMyJobsLimit < sortedMyJobs.length}
			<div style="text-align: center; padding: 1rem 0;">
				<button
					type="button"
					class="btn btn-secondary"
					onclick={onloadmoremyjobs}
					style="padding: 0.6rem 1.5rem;"
				>
					Load 20 More Jobs ({sortedMyJobs.length - visibleMyJobsLimit} remaining)
				</button>
			</div>
		{/if}
	{/if}
</section>
