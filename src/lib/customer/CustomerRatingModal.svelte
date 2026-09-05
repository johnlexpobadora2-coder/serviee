<script>
	import { enhance } from '$app/forms';
	import { Star } from 'lucide-svelte';

	let { 
		showRatingModal = $bindable(false), 
		activeJobForRating = null, 
		ratingValue = $bindable(5), 
		reviewText = $bindable(''), 
		changingStatus = $bindable(false), 
		form = null 
	} = $props();

	function selectRating(val) {
		ratingValue = val;
	}
</script>

{#if showRatingModal}
	<div class="modal-backdrop">
		<div class="modal-content" style="max-width: 600px; width: 92%;">
			<h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Mark Job as Completed & Rate Worker</h3>
			<p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1.5rem;">
				Rate worker <strong>{activeJobForRating?.assignedWorker?.name}</strong> from <strong>-5 Stars (Very Poor)</strong> to <strong>+5 Stars (Excellent)</strong>.
			</p>

			{#if form?.error && showRatingModal}
				<div style="background-color: var(--error-light); border: 1px solid var(--error); color: var(--text-primary); padding: 0.75rem; border-radius: var(--radius-md); margin-bottom: 1rem; font-size: 0.85rem;">
					{form.error}
				</div>
			{/if}

			<form method="POST" action="?/completeAndRateJob" use:enhance={() => {
				changingStatus = true;
				return async ({ update }) => {
					changingStatus = false;
					showRatingModal = false;
					await update();
				};
			}}>
				<input type="hidden" name="jobId" value={activeJobForRating?.id} />
				<input type="hidden" name="workerId" value={activeJobForRating?.worker_id} />
				<input type="hidden" name="rating" value={ratingValue} />

				<!-- Rating Selector UI (-5 to +5 Stars) -->
				<div class="form-group">
					<div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary); display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
						<span>Select Star Rating (-5 to +5):</span>
						<span class="rating-badge {ratingValue > 0 ? 'rating-badge-positive' : ratingValue < 0 ? 'rating-badge-negative' : 'rating-badge-zero'}" style="display: inline-flex; align-items: center; gap: 0.2rem;">
							<Star size={12} fill="currentColor" /> {ratingValue > 0 ? `+${ratingValue}` : ratingValue} Star{Math.abs(ratingValue) === 1 ? '' : 's'}
						</span>
					</div>
					
					<div class="rating-options-container">
						{#each [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5] as num}
							<button 
								type="button"
								class="rating-btn {ratingValue === num ? (num > 0 ? 'active-positive' : num < 0 ? 'active-negative' : 'active-zero') : ''}"
								onclick={() => selectRating(num)}
								aria-label="Rating {num}"
							>
								<span class="rating-num">{num > 0 ? `+${num}` : num}</span>
								<span class="rating-star-icon" style="display: inline-flex; align-items: center;"><Star size={12} fill="currentColor" /></span>
							</button>
						{/each}
					</div>
				</div>

				<div class="form-group" style="margin-bottom: 2rem;">
					<label for="reviewText">Comment / Feedback Review</label>
					<textarea 
						id="reviewText" 
						name="reviewText" 
						bind:value={reviewText}
						placeholder="E.g. Excellent work, completed the sideline quickly and professionally!" 
						required
					></textarea>
				</div>

				<div style="display: flex; gap: 1rem; justify-content: flex-end;">
					<button type="button" class="btn btn-secondary" onclick={() => showRatingModal = false}>
						Cancel
					</button>
					<button type="submit" class="btn btn-primary" style="background-color: var(--success); display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;" disabled={changingStatus}>
						{#if changingStatus}
							<span class="spinner spinner-sm"></span>
							<span>Submitting...</span>
						{:else}
							Submit & Complete
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
