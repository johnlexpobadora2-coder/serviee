<script>
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	// Modal State
	let showRatingModal = $state(false);
	let activeJobForRating = $state(null);
	let ratingValue = $state(5);
	let reviewText = $state('');

	// Client-side loading state
	let postingJob = $state(false);
	let changingStatus = $state(false);

	// Category mapping for badge styling helper
	function getCategoryBadge(category) {
		switch (category) {
			case 'Plumbing / Tubero': return 'badge-plumbing';
			case 'Roofing / Ayos Yero': return 'badge-roofing';
			case 'Excavation / Hukay Lupa': return 'badge-excavation';
			case 'Gardening': return 'badge-gardening';
			case 'Carpentry': return 'badge-carpentry';
			default: return 'badge-general';
		}
	}

	function openRatingModal(job) {
		activeJobForRating = job;
		ratingValue = 5;
		reviewText = '';
		showRatingModal = true;
	}

	function selectStar(val) {
		ratingValue = val;
	}
</script>

<svelte:head>
	<title>Customer Dashboard | Serviee</title>
</svelte:head>

<div style="max-width: 900px; margin: 0 auto; width: 100%;">
	
	<!-- Dashboard Header -->
	<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
		<h2 style="font-size: 1.75rem; margin: 0;">My Job Postings ({data.posts.length})</h2>
		<a href="/customer/post-job" class="btn btn-primary" style="width: auto; padding: 0.6rem 1.5rem;" id="post-new-job-btn">
			+ Post a New Job
		</a>
	</div>

	<div style="display: flex; flex-direction: column; gap: 1.5rem;">
		{#if data.posts.length === 0}
			<div class="card" style="text-align: center; padding: 5rem 2rem; border-style: dashed;">
				<h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">You haven't posted any jobs yet.</h4>
				<p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 450px; margin: 0 auto 1.5rem auto;">
					Post a job describing what you need to connect with local sideline workers and handymen in your area.
				</p>
				<a href="/customer/post-job" class="btn btn-primary" style="width: auto; display: inline-flex; margin: 0 auto;">
					Post Your First Job
				</a>
			</div>
		{:else}
			{#each data.posts as job (job.id)}
				<div class="card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem;">
					
					<!-- Job Header -->
					<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
						<div>
							<h3 style="font-size: 1.35rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
								{job.title}
							</h3>
							<div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
								<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
								<span style="color: var(--text-muted); font-size: 0.85rem;">
									Posted on: {new Date(job.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
								</span>
							</div>
						</div>

						<div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem;">
							<!-- Status badge representation -->
							<span class="status status-{job.status}">
								{#if job.status === 'open'} Naghahanap
								{:else if job.status === 'assigned'} Assigned
								{:else if job.status === 'in_progress'} In Progress
								{:else} Completed
								{/if}
							</span>
							<strong style="color: var(--accent); font-size: 1.2rem;">₱{job.budget.toLocaleString()}</strong>
						</div>
					</div>

					<!-- Details Info -->
					<div style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; border-left: 2px solid var(--border-color); padding-left: 1rem;">
						<p>{job.description}</p>
					</div>

					<!-- Metadata details bar -->
					<div class="metadata-bar">
						<div><strong>Location:</strong> {job.location}</div>
						<div><strong>Target Date:</strong> {new Date(job.target_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
					</div>

					<!-- WORKER ASSIGNMENT & STATUS ACTIONS -->
					<div style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 0.5rem;">
						{#if job.status === 'open'}
							<h4 style="font-size: 0.95rem; margin-bottom: 0.75rem; color: var(--text-primary);">
								Applicants ({job.applicants.length})
							</h4>
							{#if job.applicants.length === 0}
								<p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">
									Waiting for interested handymen or workers to apply...
								</p>
							{:else}
								<div style="display: flex; flex-direction: column; gap: 0.75rem;">
									{#each job.applicants as applicant (applicant.id)}
										<div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-md); flex-wrap: wrap; gap: 0.5rem;">
											<div>
												<strong style="color: var(--text-primary);">{applicant.name}</strong>
												<div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; font-size: 0.8rem; color: var(--text-secondary);">
													<span>Rating: {applicant.average_rating > 0 ? `${applicant.average_rating}/5.0` : 'No rating'}</span>
													<span>•</span>
													<span>Completed: {applicant.completed_jobs_count} sidelines</span>
													<span>•</span>
													<span>Phone: {applicant.phone}</span>
												</div>
												<span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 0.25rem;">Address: {applicant.address}</span>
											</div>
											<form method="POST" action="?/assignWorker" use:enhance={() => {
												changingStatus = true;
												return async ({ update }) => {
													changingStatus = false;
													await update();
												};
											}}>
												<input type="hidden" name="jobId" value={job.id} />
												<input type="hidden" name="workerId" value={applicant.id} />
												<button type="submit" class="btn btn-primary" style="padding: 0.4rem 1rem; font-size: 0.85rem;" disabled={changingStatus}>
													Assign Worker
												</button>
											</form>
										</div>
									{/each}
								</div>
							{/if}
						{:else if job.status === 'assigned'}
							<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
								<div>
									<span style="color: var(--text-muted); font-size: 0.85rem; display: block;">Assigned Worker:</span>
									<strong>{job.assignedWorker?.name}</strong> 
									<span style="color: var(--text-secondary); font-size: 0.85rem;">(Rating: {job.assignedWorker?.average_rating > 0 ? job.assignedWorker.average_rating : 'New'})</span>
									<span style="color: var(--text-secondary); font-size: 0.85rem; margin-left: 0.5rem;">Phone: {job.assignedWorker?.phone}</span>
								</div>
								
								<form method="POST" action="?/startJob" use:enhance={() => {
									changingStatus = true;
									return async ({ update }) => {
										changingStatus = false;
										await update();
									};
								}}>
									<input type="hidden" name="jobId" value={job.id} />
									<button type="submit" class="btn btn-secondary" style="border-color: var(--accent); color: var(--accent);" disabled={changingStatus}>
										Start Job
									</button>
								</form>
							</div>
						{:else if job.status === 'in_progress'}
							<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
								<div>
									<span style="color: var(--text-muted); font-size: 0.85rem; display: block;">Currently worked on by:</span>
									<strong>{job.assignedWorker?.name}</strong>
									<span style="color: var(--text-secondary); font-size: 0.85rem; margin-left: 0.5rem;">Phone: {job.assignedWorker?.phone}</span>
								</div>
								
								<button type="button" class="btn btn-primary" style="background-color: var(--success); box-shadow: 0 4px 14px rgba(74, 222, 128, 0.2);" onclick={() => openRatingModal(job)}>
									Mark Completed & Rate
								</button>
							</div>
						{:else if job.status === 'completed'}
							<div style="font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem;">
								<span>
									This project has been successfully completed by <strong>{job.assignedWorker?.name}</strong>.
								</span>
							</div>
						{/if}
					</div>

				</div>
			{/each}
		{/if}
	</div>
</div>

<!-- COMPLETED RATING & REVIEW MODAL -->
{#if showRatingModal}
	<div class="modal-backdrop">
		<div class="modal-content">
			<h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Mark Job as Completed</h3>
			<p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1.5rem;">
				Leave a review for <strong>{activeJobForRating?.assignedWorker?.name}</strong> to help them build their profile.
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

				<!-- Star Selector UI -->
				<div class="form-group">
					<span style="font-weight: 500; font-size: 0.9rem; color: var(--text-secondary);">How many stars would you give? (Rating)</span>
					<div class="star-rating">
						{#each [1, 2, 3, 4, 5] as star}
							<button 
								type="button"
								class="star" 
								class:active={star <= ratingValue}
								onclick={() => selectStar(star)}
								aria-label="Star {star}"
								style="font-size: 2.5rem; background: none; border: none; cursor: pointer; padding: 0; outline: none; line-height: 1;"
							>
								★
							</button>
						{/each}
					</div>
				</div>


				<div class="form-group" style="margin-bottom: 2rem;">
					<label for="reviewText">Comment / Review</label>
					<textarea 
						id="reviewText" 
						name="reviewText" 
						bind:value={reviewText}
						placeholder="E.g. Great worker, arrived on time, and did very clean work..." 
						required
					></textarea>
				</div>

				<div style="display: flex; gap: 1rem; justify-content: flex-end;">
					<button type="button" class="btn btn-secondary" onclick={() => showRatingModal = false}>
						Cancel
					</button>
					<button type="submit" class="btn btn-primary" style="background-color: var(--success);" disabled={changingStatus}>
						{changingStatus ? 'Submitting...' : 'Submit & Complete'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
