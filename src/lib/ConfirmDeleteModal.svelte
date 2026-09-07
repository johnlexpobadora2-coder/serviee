<script>
	import { fade, scale } from 'svelte/transition';

	let {
		show = $bindable(false),
		title = 'Delete Message?',
		message = 'Are you sure you want to delete this message? This action cannot be undone.',
		loading = false,
		onConfirm
	} = $props();

	function handleClose() {
		if (loading) return;
		show = false;
	}

	async function handleConfirm() {
		if (loading) return;
		if (onConfirm) {
			await onConfirm();
		}
		show = false;
	}

	function handleKeydown(e) {
		if (e.key === 'Escape') {
			handleClose();
		}
	}
</script>

{#if show}
	<div 
		class="confirm-modal-backdrop" 
		onclick={handleClose} 
		onkeydown={handleKeydown}
		role="dialog" 
		aria-modal="true"
		tabindex="-1"
		transition:fade={{ duration: 75 }}
	>
		<div 
			class="confirm-modal-card card" 
			onclick={(e) => e.stopPropagation()} 
			role="document"
			transition:scale={{ duration: 75, start: 0.98 }}
		>
			<h3 class="confirm-modal-title">{title}</h3>
			<p class="confirm-modal-message">{message}</p>

			<div class="confirm-modal-actions">
				<button 
					type="button" 
					class="btn btn-secondary" 
					onclick={handleClose}
					disabled={loading}
				>
					Cancel
				</button>

				<button 
					type="button" 
					class="btn btn-primary confirm-delete-btn" 
					onclick={handleConfirm}
					disabled={loading}
				>
					{#if loading}
						<span class="spinner spinner-sm"></span>
						<span>Deleting...</span>
					{:else}
						<span>Delete Message</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.confirm-modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.78);
		backdrop-filter: blur(5px);
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.confirm-modal-card {
		max-width: 420px;
		width: 100%;
		border: 1px solid var(--border-color);
		box-shadow: var(--shadow-lg);
		padding: 1.75rem;
		text-align: center;
		border-radius: var(--radius-lg);
		background: var(--bg-card);
	}

	.confirm-modal-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.4rem;
	}

	.confirm-modal-message {
		font-size: 0.9rem;
		color: var(--text-secondary);
		line-height: 1.5;
		margin-bottom: 1.5rem;
	}

	.confirm-modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
	}

	.confirm-delete-btn {
		background-color: var(--accent) !important;
		border-color: var(--accent) !important;
		color: #ffffff !important;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		box-shadow: 0 4px 14px hsla(252, 78%, 62%, 0.35);
	}

	.confirm-delete-btn:hover:not(:disabled) {
		background-color: var(--accent-hover) !important;
		border-color: var(--accent-hover) !important;
	}
</style>
