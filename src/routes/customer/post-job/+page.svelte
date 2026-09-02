<script>
	import { enhance } from '$app/forms';
	import { CITIES_MUNICIPALITIES } from '$lib/locations.js';
	let { form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Post a New Job | Serviee</title>
</svelte:head>

<div class="post-job-container" style="max-width: 600px; margin: 1rem auto; width: 100%;">
	<div style="margin-bottom: 1rem;">
		<a href="/customer" class="btn btn-outline" style="display: inline-flex; align-items: center; gap: 0.35rem; width: auto; font-size: 0.85rem; padding: 0.4rem 0.85rem;">
			&larr; Back to Dashboard
		</a>
	</div>

	<div class="card post-job-card" style="position: relative; overflow: hidden; padding: 1.25rem;">
		<!-- Top accent line -->
		<div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--accent), var(--accent-hover));"></div>

		<h2 class="post-job-heading" style="font-size: 1.4rem; margin-bottom: 0.25rem;">Post a New Job</h2>
		<p class="post-job-subtext" style="color: var(--text-secondary); margin-bottom: 1.25rem; font-size: 0.85rem;">
			Describe the service you need so handymen and sideline workers can find and apply.
		</p>

		{#if form?.error}
			<div style="background-color: var(--error-light); border: 1px solid var(--error); color: var(--text-primary); padding: 0.75rem 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; font-size: 0.85rem;">
				{form.error}
			</div>
		{/if}

		<form method="POST" use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update();
			};
		}}>
			<div class="form-group">
				<label for="title">Job Title</label>
				<input 
					type="text" 
					id="title" 
					name="title" 
					placeholder="E.g. Leaking Bathroom Pipe Repair" 
					value={form?.title ?? ''}
					required 
				/>
			</div>

			<div class="form-grid-2">
				<div class="form-group">
					<label for="category">Category</label>
					<select id="category" name="category" required value={form?.category ?? ''}>
						<option value="" disabled selected>Select category...</option>
						<option value="Plumbing / Tubero">Plumbing / Tubero</option>
						<option value="Roofing / Ayos Yero">Roofing / Ayos Yero</option>
						<option value="Excavation / Hukay Lupa">Excavation / Hukay Lupa</option>
						<option value="Gardening">Gardening / Landscape</option>
						<option value="Carpentry">Carpentry / Karpintero</option>
						<option value="General Manual Labor">General Manual Labor</option>
					</select>
				</div>

				<div class="form-group">
					<label for="location">City/Municipality</label>
					<select 
						id="location" 
						name="location" 
						required 
						value={form?.location ?? ''}
					>
						<option value="" disabled selected={!form?.location}>Select City / Municipality...</option>
						{#each CITIES_MUNICIPALITIES as city}
							<option value={city}>{city}</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="form-grid-2">
				<div class="form-group">
					<label for="budget">Budget (₱)</label>
					<input 
						type="number" 
						id="budget" 
						name="budget" 
						placeholder="E.g. 1000" 
						min="1" 
						value={form?.budget ?? ''}
						required 
					/>
				</div>

				<div class="form-group">
					<label for="target_date">Target Date & Time</label>
					<input 
						type="datetime-local" 
						id="target_date" 
						name="target_date" 
						value={form?.target_date ?? ''}
						required 
					/>
				</div>
			</div>

			<div class="form-group" style="margin-bottom: 1.25rem;">
				<label for="description">Detailed Description</label>
				<textarea 
					id="description" 
					name="description" 
					placeholder="Share details like required tools, size of the job, or special instructions..." 
					style="min-height: 80px;"
					required
				>{form?.description ?? ''}</textarea>
			</div>

			<div class="post-job-actions" style="display: flex; gap: 0.75rem; justify-content: flex-end;">
				<a href="/customer" class="btn btn-secondary">Cancel</a>
				<button type="submit" class="btn btn-primary" disabled={loading}>
					{loading ? 'Posting...' : 'Post Job'}
				</button>
			</div>
		</form>
	</div>
</div>
