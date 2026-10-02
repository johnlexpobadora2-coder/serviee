<script>
	import { enhance } from '$app/forms';
	import { Pencil, X, MapPin, AlertCircle } from 'lucide-svelte';
	import CityAutocomplete from '$lib/CityAutocomplete.svelte';

	let { 
		editJobModal = $bindable({ open: false, id: null, title: '', category: '', description: '', location: '', budget: 0, target_date: '', latitude: null, longitude: null, saving: false }), 
		showEditJobLocationModal = $bindable(false), 
		onclose 
	} = $props();

	let isLocationValid = $state(true);
	let editError = $state('');

	$effect(() => {
		if (editJobModal.open && editJobModal.location) {
			isLocationValid = true;
			editError = '';
		}
	});

	$effect(() => {
		if (editJobModal.open) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	});
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

			{#if editError}
				<div style="background-color: var(--error-light); border: 1px solid var(--error); color: var(--text-primary); padding: 0.6rem 0.8rem; border-radius: var(--radius-md); margin-bottom: 1rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">
					<AlertCircle size={16} style="color: var(--error); flex-shrink: 0;" />
					<span>{editError}</span>
				</div>
			{/if}

			<form 
				method="POST" 
				action="?/updateJob" 
				use:enhance={({ cancel }) => {
					editError = '';
					if (!editJobModal.location || !isLocationValid) {
						editError = 'Please search and select a valid City or Municipality from the suggestions.';
						cancel();
						return;
					}
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
						<option value="General Manual Labor">General Manual Labor</option>
						<option value="Others">Others</option>
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
						<input type="datetime-local" id="edit-target_date" name="target_date" class="form-control" bind:value={editJobModal.target_date} min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} required style="width: 100%; padding: 0.6rem 0.8rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-main); color: var(--text-primary);" />
					</div>
				</div>

				<div class="form-group" style="margin-bottom: 1.25rem;">
					<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
						<label for="edit-location" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0;">City / Municipality</label>
						<button type="button" class="btn btn-outline" style="padding: 0.25rem 0.6rem; font-size: 0.78rem; display: flex; align-items: center; gap: 0.3rem; border-color: var(--accent); color: var(--accent-hover);" onclick={() => showEditJobLocationModal = true}>
							<MapPin size={13} /> Pin GPS
						</button>
					</div>

					<CityAutocomplete 
						bind:value={editJobModal.location}
						bind:isValid={isLocationValid}
						name="location"
						id="edit-location"
						placeholder="Search city/municipality (e.g. Davao City, Cebu City, Makati)..."
						required={true}
					/>

					{#if editJobModal.latitude && editJobModal.longitude}
						<span style="font-size: 0.72rem; color: var(--accent-hover); display: block; margin-top: 0.35rem;">
							📍 GPS Location Pinned
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
