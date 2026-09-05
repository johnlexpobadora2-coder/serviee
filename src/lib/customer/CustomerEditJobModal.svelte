<script>
	import { enhance } from '$app/forms';
	import { Pencil, X, MapPin } from 'lucide-svelte';

	let { 
		editJobModal = $bindable({ open: false, id: null, title: '', category: '', description: '', location: '', budget: 0, target_date: '', latitude: null, longitude: null, saving: false }), 
		showEditJobLocationModal = $bindable(false), 
		onclose 
	} = $props();
</script>

{#if editJobModal.open}
	<div class="modal-backdrop" style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; overflow-y: auto;">
		<div class="card" style="max-width: 550px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 1.5rem; border-radius: var(--radius-lg); background: var(--bg-card); border: 1px solid var(--border-color);">
			<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
				<h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 0.5rem;">
					<Pencil size={18} color="var(--accent)" /> Edit Job Post
				</h3>
				<button type="button" class="btn btn-outline" style="padding: 0.25rem; border: none; color: var(--text-muted);" onclick={onclose}>
					<X size={20} />
				</button>
			</div>

			<form 
				method="POST" 
				action="?/updateJob" 
				use:enhance={() => {
					editJobModal.saving = true;
					return async ({ update }) => {
						editJobModal.saving = false;
						onclose();
						await update();
					};
				}}
			>
				<input type="hidden" name="jobId" value={editJobModal.id} />
				<input type="hidden" name="latitude" value={editJobModal.latitude || ''} />
				<input type="hidden" name="longitude" value={editJobModal.longitude || ''} />

				<div class="form-group" style="margin-bottom: 1rem;">
					<label for="edit-title" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Job Title / Service Needed</label>
					<input type="text" id="edit-title" name="title" class="form-control" bind:value={editJobModal.title} required style="width: 100%; padding: 0.6rem 0.8rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-main); color: var(--text-primary);" />
				</div>

				<div class="form-group" style="margin-bottom: 1rem;">
					<label for="edit-category" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Category</label>
					<select id="edit-category" name="category" class="form-control" bind:value={editJobModal.category} required style="width: 100%; padding: 0.6rem 0.8rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-main); color: var(--text-primary);">
						<option value="Plumbing / Tubero">Plumbing / Tubero</option>
						<option value="Roofing / Ayos Yero">Roofing / Ayos Yero</option>
						<option value="Excavation / Hukay Lupa">Excavation / Hukay Lupa</option>
						<option value="Gardening">Gardening</option>
						<option value="Carpentry">Carpentry</option>
						<option value="Electrical / Kuryente">Electrical / Kuryente</option>
						<option value="General Handyman">General Handyman</option>
					</select>
				</div>

				<div class="form-group" style="margin-bottom: 1rem;">
					<label for="edit-description" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Description & Requirements</label>
					<textarea id="edit-description" name="description" rows="4" class="form-control" bind:value={editJobModal.description} required style="width: 100%; padding: 0.6rem 0.8rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-main); color: var(--text-primary); resize: vertical;"></textarea>
				</div>

				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
					<div class="form-group">
						<label for="edit-budget" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Budget (₱)</label>
						<input type="number" id="edit-budget" name="budget" min="1" step="any" class="form-control" bind:value={editJobModal.budget} required style="width: 100%; padding: 0.6rem 0.8rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-main); color: var(--text-primary);" />
					</div>

					<div class="form-group">
						<label for="edit-target_date" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Target Date & Time</label>
						<input type="datetime-local" id="edit-target_date" name="target_date" class="form-control" bind:value={editJobModal.target_date} required style="width: 100%; padding: 0.6rem 0.8rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-main); color: var(--text-primary);" />
					</div>
				</div>

				<div class="form-group" style="margin-bottom: 1.25rem;">
					<label for="edit-location" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Location / Address</label>
					<div style="display: flex; gap: 0.5rem;">
						<input type="text" id="edit-location" name="location" class="form-control" bind:value={editJobModal.location} required style="flex: 1; padding: 0.6rem 0.8rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-main); color: var(--text-primary);" />
						<button type="button" class="btn btn-outline" style="padding: 0.6rem 0.85rem; font-size: 0.8rem; display: flex; align-items: center; gap: 0.3rem; border-color: var(--accent); color: var(--accent-hover);" onclick={() => showEditJobLocationModal = true}>
							<MapPin size={14} /> Pin GPS
						</button>
					</div>
					{#if editJobModal.latitude && editJobModal.longitude}
						<span style="font-size: 0.72rem; color: var(--accent-hover); display: block; margin-top: 0.25rem;">
							📍 GPS Pinned: {editJobModal.latitude}, {editJobModal.longitude}
						</span>
					{/if}
				</div>

				<div style="display: flex; gap: 0.75rem; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: 1rem;">
					<button type="button" class="btn btn-secondary" style="padding: 0.5rem 1.25rem; font-size: 0.9rem;" onclick={onclose} disabled={editJobModal.saving}>
						Cancel
					</button>
					<button type="submit" class="btn btn-primary" style="padding: 0.5rem 1.25rem; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 0.4rem;" disabled={editJobModal.saving}>
						{#if editJobModal.saving}
							<span class="spinner spinner-sm"></span>
							<span>Saving...</span>
						{:else}
							<span>Save Changes</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
