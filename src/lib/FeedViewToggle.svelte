<script>
	import { List, Map } from 'lucide-svelte';

	let {
		viewMode = $bindable('list') // 'list' | 'map'
	} = $props();
</script>

<div class="feed-view-toggle-container" role="radiogroup" aria-label="Job Feed View Mode">
	<button
		type="button"
		role="radio"
		aria-checked={viewMode === 'list'}
		class="feed-view-toggle-btn {viewMode === 'list' ? 'active' : ''}"
		onclick={() => (viewMode = 'list')}
	>
		<List size={15} />
		<span>List View</span>
	</button>

	<button
		type="button"
		role="radio"
		aria-checked={viewMode === 'map'}
		class="feed-view-toggle-btn {viewMode === 'map' ? 'active' : ''}"
		onclick={() => (viewMode = 'map')}
	>
		<Map size={15} />
		<span>Map View</span>
	</button>
</div>

<style>
	.feed-view-toggle-container {
		display: inline-flex;
		align-items: center;
		padding: 2px;
		background: var(--bg-card, #1e293b);
		border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
		border-radius: var(--radius-md, 6px);
		gap: 2px;
	}

	.feed-view-toggle-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.75rem;
		border-radius: var(--radius-sm, 4px);
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-secondary, #94a3b8);
		font-size: 0.82rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
		user-select: none;
	}

	.feed-view-toggle-btn:hover {
		color: var(--text-primary, #ffffff);
		background: var(--bg-input, rgba(255, 255, 255, 0.05));
	}

	.feed-view-toggle-btn.active {
		background: var(--accent, #6366f1);
		color: #ffffff;
		font-weight: 600;
	}

	@media (max-width: 640px) {
		.feed-view-toggle-btn {
			padding: 0.35rem 0.6rem;
			font-size: 0.78rem;
		}
	}
</style>
