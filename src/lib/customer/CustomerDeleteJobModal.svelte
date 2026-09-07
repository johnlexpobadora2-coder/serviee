<script>
	import { fade, scale } from 'svelte/transition';
	import { enhance } from '$app/forms';

	let { 
		deleteJobModal = $bindable({ open: false, id: null, title: '', deleting: false }), 
		onclose 
	} = $props();
</script>

{#if deleteJobModal.open}
	<div 
		class="modal-backdrop" 
		style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem;"
		transition:fade={{ duration: 75 }}
	>
		<div 
			class="card" 
			style="max-width: 440px; width: 100%; border: 1px solid var(--border-color); box-shadow: var(--shadow-lg); padding: 1.75rem; text-align: center; border-radius: var(--radius-lg); background: var(--bg-card);"
			transition:scale={{ duration: 75, start: 0.98 }}
		>
			<h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">
				Delete Job Post?
			</h3>
			
			<p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1.5rem;">
				Are you sure you want to delete <strong>"{deleteJobModal.title}"</strong>? This action cannot be undone.
			</p>

			<div style="display: flex; gap: 0.75rem; justify-content: center;">
				<button 
					type="button" 
					class="btn btn-secondary" 
					style="padding: 0.5rem 1.25rem; font-size: 0.9rem;"
					onclick={onclose}
					disabled={deleteJobModal.deleting}
				>
					Cancel
				</button>

				<form 
					method="POST" 
					action="?/deleteJob" 
					use:enhance={() => {
						deleteJobModal.deleting = true;
						return async ({ update }) => {
							deleteJobModal.deleting = false;
							onclose();
							await update();
						};
					}}
				>
					<input type="hidden" name="jobId" value={deleteJobModal.id} />
					<button 
						type="submit" 
						class="btn btn-primary" 
						style="background-color: var(--accent); border-color: var(--accent); padding: 0.5rem 1.25rem; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 0.4rem; box-shadow: 0 4px 14px hsla(252, 78%, 62%, 0.35);"
						disabled={deleteJobModal.deleting}
					>
						{#if deleteJobModal.deleting}
							<span class="spinner spinner-sm"></span>
							<span>Deleting...</span>
						{:else}
							<span>Confirm Delete</span>
						{/if}
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
