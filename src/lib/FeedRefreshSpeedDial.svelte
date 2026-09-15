<script>
	import { RotateCw } from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';

	/**
	 * @typedef {Object} Props
	 * @property {() => void | Promise<void>} [onrefresh]
	 * @property {boolean} [loading=false]
	 */

	/** @type {Props} */
	let {
		onrefresh,
		loading = false
	} = $props();

	let isRefreshing = $state(false);
	let isVisible = $state(false);

	let isSpinning = $derived(isRefreshing || loading);

	function handleScroll() {
		if (typeof window !== 'undefined') {
			// Show button once user scrolls down slightly
			isVisible = window.scrollY > 80;
		}
	}

	onMount(() => {
		if (typeof window !== 'undefined') {
			window.addEventListener('scroll', handleScroll, { passive: true });
			handleScroll();
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('scroll', handleScroll);
		}
	});

	async function handleRefresh() {
		if (isSpinning) return;

		// Smoothly scroll back to top of the feed
		if (typeof window !== 'undefined') {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}

		if (onrefresh) {
			isRefreshing = true;
			try {
				await Promise.resolve(onrefresh());
			} catch (err) {
				console.error('Error refreshing feed:', err);
			} finally {
				setTimeout(() => {
					isRefreshing = false;
				}, 400);
			}
		} else if (typeof window !== 'undefined') {
			// Fallback reload if no custom onrefresh callback was provided
			window.location.reload();
		}
	}
</script>

<!-- Floating Refresh/Reload FAB Button -->
<div class="feed-refresh-fab-wrap {isVisible ? 'visible' : ''}">
	<button 
		type="button" 
		class="feed-refresh-fab {isSpinning ? 'spin-anim' : ''}" 
		onclick={handleRefresh}
		title="Refresh Feed"
		aria-label="Refresh Feed"
		disabled={isSpinning}
	>
		<span class="refresh-icon">
			<RotateCw size={22} />
		</span>
	</button>
</div>

<style>
	.feed-refresh-fab-wrap {
		position: fixed;
		bottom: 1.75rem;
		right: 1.75rem;
		z-index: 900;
		opacity: 0;
		transform: translateY(12px) scale(0.9);
		pointer-events: none;
		transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.feed-refresh-fab-wrap.visible {
		opacity: 1;
		transform: translateY(0) scale(1);
		pointer-events: auto;
	}

	.feed-refresh-fab {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-full);
		background: linear-gradient(135deg, var(--accent) 0%, hsl(265, 80%, 55%) 100%);
		color: #ffffff;
		border: 1px solid rgba(255, 255, 255, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.3), 0 0 16px hsla(252, 78%, 62%, 0.35);
		transition: transform 0.15s ease, background 0.2s ease, box-shadow 0.2s ease;
	}

	.feed-refresh-fab:hover:not(:disabled) {
		background: linear-gradient(135deg, var(--accent-hover) 0%, hsl(265, 85%, 58%) 100%);
		transform: scale(1.08);
		box-shadow: 0 12px 28px -4px rgba(0, 0, 0, 0.35), 0 0 22px hsla(252, 78%, 62%, 0.5);
	}

	.feed-refresh-fab:active:not(:disabled) {
		transform: scale(0.94);
	}

	.feed-refresh-fab:disabled {
		opacity: 0.8;
		cursor: wait;
	}

	.refresh-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.2s ease;
	}

	.feed-refresh-fab:hover .refresh-icon {
		transform: rotate(45deg);
	}

	.feed-refresh-fab.spin-anim .refresh-icon {
		animation: spinAnim 0.7s cubic-bezier(0.4, 0, 0.2, 1) infinite;
	}

	@keyframes spinAnim {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 768px) {
		.feed-refresh-fab-wrap {
			bottom: 1.25rem;
			right: 1.25rem;
		}

		.feed-refresh-fab {
			width: 44px;
			height: 44px;
		}
	}
</style>
