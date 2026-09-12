<script>
	import { fade, scale } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { AlertTriangle, Lock, Trash2 } from 'lucide-svelte';

	let {
		show = $bindable(false),
		deleteError = ''
	} = $props();

	let password = $state('');
	let confirmation = $state('');
	let isDeleting = $state(false);

	function handleClose() {
		if (isDeleting) return;
		show = false;
		password = '';
		confirmation = '';
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
			<h3 class="confirm-modal-title">Delete Account?</h3>
			
			<p class="confirm-modal-message">
				This will permanently remove your account, active job posts, reviews, and chat history. This action cannot be reversed.
			</p>

			{#if deleteError}
				<div class="modal-error-banner">
					<AlertTriangle size={15} class="error-icon" />
					<span>{deleteError}</span>
				</div>
			{/if}

			<form 
				method="POST" 
				action="?/deleteAccount" 
				class="delete-account-form"
				use:enhance={() => {
					isDeleting = true;
					return async ({ update }) => {
						isDeleting = false;
						await update();
					};
				}}
			>
				<div class="modal-form-group">
					<label for="delete-password">Confirm Your Password</label>
					<div class="input-wrapper">
						<Lock size={16} class="input-icon" />
						<input 
							type="password" 
							id="delete-password" 
							name="password" 
							bind:value={password}
							placeholder="Enter account password" 
							required
						/>
					</div>
				</div>

				<div class="modal-form-group">
					<label for="delete-confirm">Type <strong style="color: var(--error, #ef4444);">DELETE</strong> below</label>
					<input 
						type="text" 
						id="delete-confirm" 
						name="confirmation" 
						bind:value={confirmation}
						placeholder="DELETE" 
						class="text-input"
						required
					/>
				</div>

				<div class="confirm-modal-actions">
					<button 
						type="button" 
						class="btn btn-secondary" 
						style="padding: 0.5rem 1.25rem; font-size: 0.9rem;"
						onclick={handleClose}
						disabled={isDeleting}
					>
						Cancel
					</button>

					<button 
						type="submit" 
						class="btn btn-danger confirm-delete-btn" 
						style="background-color: #ef4444; border-color: #ef4444; color: #ffffff; padding: 0.5rem 1.25rem; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 0.4rem;"
						disabled={isDeleting || confirmation.trim() !== 'DELETE' || !password}
					>
						{#if isDeleting}
							<span class="spinner spinner-sm"></span>
							<span>Deleting...</span>
						{:else}
							<Trash2 size={15} />
							<span>Permanently Delete</span>
						{/if}
					</button>
				</div>
			</form>
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
		text-align: left;
		border-radius: var(--radius-lg);
		background: var(--bg-card);
		box-sizing: border-box;
	}

	.confirm-modal-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
		text-align: center;
	}

	.confirm-modal-message {
		font-size: 0.88rem;
		color: var(--text-secondary);
		line-height: 1.5;
		margin-bottom: 1.25rem;
		text-align: center;
	}

	.modal-error-banner {
		padding: 0.6rem 0.85rem;
		background: var(--error-light, rgba(239, 68, 68, 0.1));
		border: 1px solid var(--error, #ef4444);
		border-radius: var(--radius-md, 8px);
		color: var(--error, #ef4444);
		font-size: 0.82rem;
		display: flex;
		align-items: center;
		gap: 0.45rem;
		margin-bottom: 1rem;
	}

	.delete-account-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.modal-form-group {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.modal-form-group label {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.input-wrapper :global(.input-icon) {
		position: absolute;
		left: 0.85rem;
		color: var(--text-muted);
		pointer-events: none;
	}

	.input-wrapper input, .text-input {
		width: 100%;
		padding: 0.65rem 0.85rem 0.65rem 2.4rem;
		background-color: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		color: var(--text-primary);
		font-family: inherit;
		font-size: 0.88rem;
		box-sizing: border-box;
	}

	.text-input {
		padding-left: 0.85rem;
		text-align: center;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.input-wrapper input:focus, .text-input:focus {
		outline: none;
		border-color: #ef4444;
		box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
	}

	.confirm-modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 0.5rem;
	}

	.confirm-delete-btn:hover:not(:disabled) {
		background-color: #dc2626 !important;
		border-color: #dc2626 !important;
	}
</style>
