<script>
	import { enhance } from '$app/forms';
	import { Trash2 } from 'lucide-svelte';

	let { 
		deleteJobModal = $bindable({ open: false, id: null, title: '', deleting: false }), 
		onclose 
	} = $props();
</script>

{#if deleteJobModal.open}
	<div class="modal-backdrop" style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem;">
		<div class="card" style="max-width: 440px; width: 100%; border: 1px solid rgba(239, 68, 68, 0.3); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); padding: 1.75rem; text-align: center; border-radius: var(--radius-lg); background: var(--bg-card);">
			<div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); color: #ef4444; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto;">
				<Trash2 size={24} />
			</div>
			
			<h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">
				Delete Job Post?
			</h3>
			
			<p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1.5rem;">
				Sigurado ka bang gusto mong tanggalin ang <strong>"{deleteJobModal.title}"</strong>? Hindi na ito mababawi kapag na-delete.
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
						style="background-color: #ef4444; border-color: #ef4444; padding: 0.5rem 1.25rem; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 0.4rem;"
						disabled={deleteJobModal.deleting}
					>
						{#if deleteJobModal.deleting}
							<span class="spinner spinner-sm"></span>
							<span>Deleting...</span>
						{:else}
							<Trash2 size={15} />
							<span>Confirm Delete</span>
						{/if}
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
