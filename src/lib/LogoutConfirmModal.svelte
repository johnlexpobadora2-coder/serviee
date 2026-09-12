<script>
	import { fade, scale } from 'svelte/transition';

	let {
		show = $bindable(false),
		onConfirm
	} = $props();

	let isLoggingOut = $state(false);

	function handleClose() {
		if (isLoggingOut) return;
		show = false;
	}

	async function handleConfirm() {
		if (isLoggingOut) return;
		isLoggingOut = true;
		if (onConfirm) {
			await onConfirm();
		}
	}

	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
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
		onclick={handleBackdropClick} 
		onkeydown={handleKeydown}
		role="dialog" 
		aria-modal="true"
		tabindex="-1"
		transition:fade={{ duration: 75 }}
	>
		<div 
			class="confirm-modal-card card" 
			role="document"
			transition:scale={{ duration: 75, start: 0.98 }}
		>
			<h3 class="confirm-modal-title">Log Out of Serviee?</h3>
			
			<p class="confirm-modal-message">
				Are you sure you want to log out? You will need to enter your email and password to log in again.
			</p>

			<div class="confirm-modal-actions">
				<button 
					type="button" 
					class="btn btn-secondary" 
					style="padding: 0.5rem 1.25rem; font-size: 0.9rem;"
					onclick={handleClose}
					disabled={isLoggingOut}
				>
					Cancel
				</button>

				<button 
					type="button" 
					class="btn btn-primary confirm-logout-btn" 
					style="background-color: var(--accent); border-color: var(--accent); padding: 0.5rem 1.25rem; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 0.4rem;"
					onclick={handleConfirm}
					disabled={isLoggingOut}
				>
					{#if isLoggingOut}
						<span class="spinner spinner-sm"></span>
						<span>Logging out...</span>
					{:else}
						<span>Confirm</span>
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
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(4px);
		z-index: 99999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		box-sizing: border-box;
	}

	.confirm-modal-card {
		max-width: 440px;
		width: 100%;
		border: 1px solid var(--border-color);
		box-shadow: var(--shadow-lg);
		padding: 1.75rem;
		text-align: center;
		border-radius: var(--radius-lg);
		background: var(--bg-card);
		box-sizing: border-box;
	}

	.confirm-modal-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
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

	.confirm-logout-btn {
		background-color: var(--accent) !important;
		border-color: var(--accent) !important;
		color: #ffffff !important;
	}

	.confirm-logout-btn:hover:not(:disabled) {
		background-color: var(--accent-hover, #6351e6) !important;
		border-color: var(--accent-hover, #6351e6) !important;
	}
</style>

