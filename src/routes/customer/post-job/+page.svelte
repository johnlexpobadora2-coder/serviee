<script>
	import { enhance } from '$app/forms';
	let { form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Post a New Job | Serviee</title>
</svelte:head>

<div style="max-width: 600px; margin: 2rem auto; width: 100%;">
	<div style="margin-bottom: 1.5rem;">
		<a href="/customer" class="btn btn-outline" style="display: inline-flex; align-items: center; gap: 0.5rem; width: auto; font-size: 0.9rem; padding: 0.5rem 1rem;">
			&larr; Back to Dashboard
		</a>
	</div>

	<div class="card" style="position: relative; overflow: hidden; padding: 2rem;">
		<!-- Top accent line -->
		<div style="position: absolute; top: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, var(--accent), var(--accent-hover));"></div>

		<h2 style="font-size: 2rem; margin-bottom: 0.5rem;">Post a New Job</h2>
		<p style="color: var(--text-secondary); margin-bottom: 2rem; font-size: 0.95rem;">
			Describe the service you need so handymen and sideline workers can find and apply.
		</p>

		{#if form?.error}
			<div style="background-color: var(--error-light); border: 1px solid var(--error); color: var(--text-primary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.9rem;">
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
						<option value="" disabled selected>Select a category...</option>
						<option value="Plumbing / Tubero">Plumbing / Tubero</option>
						<option value="Roofing / Ayos Yero">Roofing / Ayos Yero</option>
						<option value="Excavation / Hukay Lupa">Excavation / Hukay Lupa</option>
						<option value="Gardening">Gardening / Landscape</option>
						<option value="Carpentry">Carpentry / Karpintero</option>
						<option value="General Manual Labor">General Manual Labor</option>
					</select>
				</div>

				<div class="form-group">
					<label for="location">Location / Barangay</label>
					<input 
						type="text" 
						id="location" 
						name="location" 
						placeholder="E.g. Brgy. San Jose, Pasig City" 
						value={form?.location ?? ''}
						required 
					/>
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

			<div class="form-group" style="margin-bottom: 2rem;">
				<label for="description">Detailed Description</label>
				<textarea 
					id="description" 
					name="description" 
					placeholder="Share details like required tools, size of the job, or special instructions..." 
					required
				>{form?.description ?? ''}</textarea>
			</div>

			<div style="display: flex; gap: 1rem; justify-content: flex-end;">
				<a href="/customer" class="btn btn-secondary">Cancel</a>
				<button type="submit" class="btn btn-primary" disabled={loading}>
					{loading ? 'Posting...' : 'Post Job'}
				</button>
			</div>
		</form>
	</div>
</div>
