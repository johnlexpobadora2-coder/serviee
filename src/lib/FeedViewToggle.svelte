<script>
	import { List, Map } from 'lucide-svelte';

	let {
		viewMode = $bindable('list') // 'list' | 'map'
	} = $props();
</script>

<div class="feed-view-toggle-container" role="radiogroup" aria-label="Job Feed View Mode">
	<div 
		class="toggle-indicator" 
		class:is-map={viewMode === 'map'} 
		aria-hidden="true"
	></div>

	<button
		type="button"
		role="radio"
		aria-checked={viewMode === 'list'}
		class="feed-view-toggle-btn"
		class:active={viewMode === 'list'}
		onclick={() => (viewMode = 'list')}
	>
		<List size={15} class="toggle-icon" />
		<span>List View</span>
	</button>

	<button
		type="button"
		role="radio"
		aria-checked={viewMode === 'map'}
		class="feed-view-toggle-btn"
		class:active={viewMode === 'map'}
		onclick={() => (viewMode = 'map')}
	>
		<Map size={15} class="toggle-icon" />
		<span>Map View</span>
	</button>
</div>

<style>
	.feed-view-toggle-container {
		position: relative;
		display: inline-grid;
		grid-template-columns: 1fr 1fr;
		align-items: center;
		padding: 3px;
		background: var(--bg-card, #1e293b);
		border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
		border-radius: var(--radius-md, 8px);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
		isolation: isolate;
		user-select: none;
	}

	.toggle-indicator {
		position: absolute;
		top: 3px;
		bottom: 3px;
		left: 3px;
		width: calc(50% - 3px);
		background: var(--accent, #6366f1);
		border-radius: calc(var(--radius-md, 8px) - 2px);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18), 0 1px 2px rgba(0, 0, 0, 0.1);
		transition: transform 0.28s cubic-bezier(0.34, 1.3, 0.64, 1);
		z-index: 0;
		pointer-events: none;
	}

	.toggle-indicator.is-map {
		transform: translateX(100%);
	}

	.feed-view-toggle-btn {
		position: relative;
		z-index: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.35rem 0.75rem;
		border-radius: calc(var(--radius-md, 8px) - 2px);
		border: none;
		background: transparent;
		color: var(--text-secondary, #94a3b8);
		font-size: 0.82rem;
		font-weight: 500;
		cursor: pointer;
		transition: color 0.2s ease, transform 0.1s ease;
		white-space: nowrap;
	}

	.feed-view-toggle-btn:hover:not(.active) {
		color: var(--text-primary, #ffffff);
	}

	.feed-view-toggle-btn:active {
		transform: scale(0.96);
	}

	.feed-view-toggle-btn.active {
		color: #ffffff;
		font-weight: 600;
	}

	:global(.toggle-icon) {
		transition: transform 0.2s ease;
	}

	.feed-view-toggle-btn.active :global(.toggle-icon) {
		transform: scale(1.05);
	}

	@media (max-width: 640px) {
		.feed-view-toggle-btn {
			padding: 0.35rem 0.6rem;
			font-size: 0.78rem;
		}
	}
</style>
