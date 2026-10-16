<script>
	import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-svelte';
	import { getEmbedMapUrl, getServieeMapUrl } from '$lib/gpsUtils.js';

	/**
	 * @typedef {Object} Props
	 * @property {number} latitude
	 * @property {number} longitude
	 * @property {string} [title='']
	 * @property {string} [location='']
	 * @property {boolean} [defaultOpen=false]
	 * @property {string} [customClass='']
	 */

	/** @type {Props} */
	let {
		latitude,
		longitude,
		title = '',
		location = '',
		defaultOpen = false,
		customClass = ''
	} = $props();

	let isExpanded = $state(false);

	$effect(() => {
		if (defaultOpen) {
			isExpanded = true;
		}
	});

	function toggleMap(e) {
		e.stopPropagation();
		isExpanded = !isExpanded;
	}
</script>

{#if latitude && longitude}
	<div class="job-map-preview-wrapper {customClass}">
		<!-- Map Banner Bar -->
		<div class="job-map-bar">
			<div class="job-map-bar-left">
				<span class="job-map-label">
					Pinned on Map
					{#if location}
						<span class="job-map-location-sub">• {location}</span>
					{/if}
				</span>
			</div>

			<div class="job-map-bar-actions flex items-stretch gap-1.5 shrink-0">
				<button
					type="button"
					class="btn btn-secondary h-7 text-xs px-2.5 rounded-md inline-flex items-center gap-1.5 transition-colors cursor-pointer {isExpanded ? 'border-(--accent)! text-(--accent)! bg-(--accent-light)!' : 'text-(--text-secondary) hover:text-(--text-primary)'}"
					onclick={toggleMap}
					title={isExpanded ? 'Hide Map Preview' : 'Show Map Preview'}
					aria-expanded={isExpanded}
				>
					{#if isExpanded}
						<span>Hide Map</span>
						<ChevronUp size={13} />
					{:else}
						<span>Preview Map</span>
						<ChevronDown size={13} />
					{/if}
				</button>

				<a
					href={getServieeMapUrl(latitude, longitude, title, location)}
					class="btn btn-outline h-7 text-xs px-2.5 rounded-md inline-flex items-center justify-center gap-1.5 no-underline transition-colors cursor-pointer self-stretch text-(--text-secondary) hover:text-(--accent) hover:border-(--accent) hover:bg-(--accent-light)"
					title="Open Fullscreen Interactive Map"
					aria-label="Open Fullscreen Interactive Map"
					onclick={(e) => e.stopPropagation()}
				>
					<ExternalLink size={12} />
					<span class="max-[480px]:hidden">View Map</span>
				</a>
			</div>
		</div>

		<!-- Interactive Map Embed (Rendered on-demand when expanded) -->
		{#if isExpanded}
			<div class="job-map-iframe-box animate-fade-in">
				<div class="feed-job-map-iframe-container">
					<iframe
						title="Pinned Job Location Map"
						src={getEmbedMapUrl(latitude, longitude)}
						loading="lazy"
					></iframe>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.job-map-preview-wrapper {
		margin-top: 0.6rem;
		margin-bottom: 0.4rem;
		border-radius: var(--radius-md, 12px);
		border: 1px solid var(--border-color);
		background: var(--bg-card);
		overflow: hidden;
		transition: border-color 0.2s ease;
	}

	.job-map-preview-wrapper:hover {
		border-color: var(--border-focus);
	}

	.job-map-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.45rem 0.75rem;
		background: rgba(255, 255, 255, 0.02);
		font-size: 0.8rem;
		min-height: 38px;
	}

	.job-map-bar-left {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-width: 0;
		flex: 1;
	}

	.job-map-label {
		font-weight: 600;
		color: var(--text-primary);
		font-size: 0.78rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.job-map-location-sub {
		font-weight: 400;
		color: var(--text-secondary);
		margin-left: 0.25rem;
	}

	.job-map-bar-actions {
		display: flex;
		align-items: stretch;
		gap: 0.35rem;
		flex-shrink: 0;
	}

	.job-map-iframe-box {
		border-top: 1px solid var(--border-color);
		position: relative;
		overflow: hidden;
	}

	.feed-job-map-iframe-container {
		position: relative;
		width: 100%;
		height: 160px;
		overflow: hidden;
	}

	.feed-job-map-iframe-container iframe {
		position: absolute;
		top: -85px;
		left: -10px;
		width: calc(100% + 20px);
		height: calc(100% + 170px);
		border: 0;
	}


	.animate-fade-in {
		animation: fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
