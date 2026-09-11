<script>
	import { enhance } from '$app/forms';
	import { Star, User, MessageSquare, UserCheck, Pencil, Trash2, MapPin, ExternalLink, Clock, Loader2 } from 'lucide-svelte';
	import { getGoogleMapsUrl, getEmbedMapUrl } from '$lib/gpsUtils.js';

	let { 
		activeJobs = [], 
		totalCount = 0,
		loading = false,
		loadingMore = false,
		hasMore = false,
		changingStatus = $bindable(false), 
		onloadmore,
		onopeneditjob, 
		onopendeletejob, 
		onopenviewprofile, 
		onopenchat, 
		onopenratingmodal 
	} = $props();

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

	function handleWindowScroll() {
		if (typeof window === 'undefined' || loading || loadingMore || !hasMore) return;
		const scrollPosition = window.innerHeight + window.scrollY;
		const threshold = document.documentElement.scrollHeight - 300;
		if (scrollPosition >= threshold) {
			if (onloadmore) {
				onloadmore();
			}
		}
	}

	$effect(() => {
		if (typeof window !== 'undefined') {
			window.addEventListener('scroll', handleWindowScroll, { passive: true });
			return () => {
				window.removeEventListener('scroll', handleWindowScroll);
			};
		}
	});
</script>

<div class="space-y-4">
	<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
		<h2 style="font-size: 1.4rem; margin: 0;">My Active Jobs ({totalCount || activeJobs.length})</h2>
		<a href="/customer/post-job" class="btn btn-primary" style="width: auto; padding: 0.5rem 1.25rem;">
			+ Post a Job
		</a>
	</div>

	<div class="active-jobs-list" style="display: flex; flex-direction: column; gap: 1rem;">
		{#if loading && activeJobs.length === 0}
			<div class="card" style="text-align: center; padding: 4rem 2rem;">
				<Loader2 size={32} class="animate-spin" style="margin: 0 auto 1rem auto; color: var(--accent);" />
				<p style="color: var(--text-secondary); font-size: 0.95rem;">Loading your active jobs...</p>
			</div>
		{:else if activeJobs.length === 0}
			<div class="card" style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted);">
				<div style="width: 56px; height: 56px; margin: 0 auto 1rem auto; background-color: var(--bg-input); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text-secondary);">
					<UserCheck size={28} />
				</div>
				<h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">You have no active jobs right now.</h4>
				<p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 450px; margin: 0 auto 1.5rem auto;">
					Post a job describing what you need to connect with local sideline workers and handymen in your area.
				</p>
				<a href="/customer/post-job" class="btn btn-primary" style="width: auto; display: inline-flex; margin: 0 auto;">
					Post Your First Job
				</a>
			</div>
		{:else}
			{#each activeJobs as job (job.id)}
				<div class="card feed-job-card">
					
					<!-- Job Header -->
					<div class="feed-job-header">
						<!-- Top Row: Badges on left -->
						<div class="feed-job-top-bar">
							<div class="feed-job-badges">
								<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
								<span class="status status-{job.status}">
									{#if job.status === 'open'} Naghahanap
									{:else if job.status === 'assigned'} Assigned
									{:else if job.status === 'in_progress'} In Progress
									{:else} Completed
									{/if}
								</span>
							</div>
						</div>

						<!-- Title Row -->
						<h3 class="feed-job-title">{job.title}</h3>

						<!-- Date Sub-row -->
						<div class="feed-job-posted-by">
							<span class="feed-job-date">
								<Clock size={12} />
								{new Date(job.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
							</span>
						</div>
					</div>

					<!-- Divider -->
					<div class="feed-job-divider"></div>

					<!-- Details Info -->
					<p class="feed-job-desc">{job.description}</p>

					<!-- Metadata details bar -->
					<div class="metadata-bar">
						<div><strong>Location:</strong> {job.location}</div>
						<div><strong>Target Date:</strong> {new Date(job.target_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
						{#if job.latitude && job.longitude}
							<div>
								<a 
									href={getGoogleMapsUrl(job.latitude, job.longitude, job.title)} 
									class="gps-badge"
								>
									<MapPin size={12} /> Google Maps
								</a>
							</div>
						{/if}
					</div>

					{#if job.latitude && job.longitude}
						<div class="feed-job-map-preview">
							<div class="feed-job-map-header">
								<div style="display: flex; align-items: center; gap: 0.35rem; color: var(--accent-hover); font-weight: 600;">
									<MapPin size={13} /> Pinned GPS Location ({job.latitude}, {job.longitude})
								</div>
								<a 
									href={getGoogleMapsUrl(job.latitude, job.longitude, job.title)} 
									target="_blank"
									rel="noopener noreferrer"
									class="feed-job-directions-link"
								>
									<ExternalLink size={12} /> Open Directions
								</a>
							</div>
							<div class="feed-job-map-iframe-container">
								<iframe 
									title="Pinned Job Location Map"
									src={getEmbedMapUrl(job.latitude, job.longitude)}
									loading="lazy"
								></iframe>
							</div>
						</div>
					{/if}

					<!-- Bottom Price & Edit/Delete Actions Bar -->
					<div class="feed-job-footer">
						<div class="feed-job-budget-wrap">
							<span class="feed-job-budget-label">Budget</span>
							<strong class="feed-job-budget">₱{job.budget.toLocaleString()}</strong>
						</div>
						<div class="feed-job-actions-group">
							<button
								type="button"
								class="btn btn-outline feed-job-edit-btn"
								onclick={() => onopeneditjob(job)}
								title="Edit Job Post"
							>
								<Pencil size={13} />
								<span>Edit</span>
							</button>
							<button
								type="button"
								class="btn btn-outline feed-job-delete-btn"
								onclick={() => onopendeletejob(job)}
								title="Delete Job Post"
							>
								<Trash2 size={13} />
								<span>Delete</span>
							</button>
						</div>
					</div>

					<!-- WORKER ASSIGNMENT & STATUS ACTIONS -->
					<div style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 0.5rem;">
						{#if job.status === 'open'}
							<h4 style="font-size: 0.95rem; margin-bottom: 0.75rem; color: var(--text-primary);">
								Applicants ({job.applicants?.length || 0})
							</h4>
							{#if !job.applicants || job.applicants.length === 0}
								<p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">
									Waiting for interested handymen or workers to apply...
								</p>
							{:else}
								<div style="display: flex; flex-direction: column; gap: 0.75rem;">
									{#each job.applicants as applicant (applicant.id)}
										<div class="applicant-card">
											<div class="applicant-info">
												<strong style="color: var(--text-primary); font-size: 0.95rem;">{applicant.name}</strong>
												<div class="applicant-meta-row">
													<span class="rating-badge {applicant.average_rating > 0 ? 'rating-badge-positive' : applicant.average_rating < 0 ? 'rating-badge-negative' : 'rating-badge-zero'}" style="display: inline-flex; align-items: center; gap: 0.2rem;">
														<Star size={11} fill="currentColor" /> {applicant.average_rating > 0 ? `+${applicant.average_rating}` : applicant.average_rating} rating
													</span>
													<span>•</span>
													<span>Completed: {applicant.completed_jobs_count}</span>
													<span>•</span>
													<span>Phone: {applicant.phone}</span>
												</div>
												{#if applicant.address}
													<span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 0.2rem;">Address: {applicant.address}</span>
												{/if}
											</div>
											<div class="applicant-actions">
												<button 
													type="button" 
													class="btn btn-outline" 
													style="padding: 0.35rem 0.65rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.3rem;"
													onclick={() => onopenviewprofile(applicant.id)}
												>
													<User size={13} /> Profile
												</button>
												<button 
													type="button" 
													class="btn btn-outline" 
													style="padding: 0.35rem 0.65rem; font-size: 0.8rem; border-color: var(--accent); color: var(--accent-hover); display: inline-flex; align-items: center; gap: 0.3rem;"
													onclick={() => onopenchat(job.id, applicant.id)}
												>
													<MessageSquare size={13} /> Open Chat
												</button>

												<form method="POST" action="?/assignWorker" use:enhance={() => {
													changingStatus = true;
													return async ({ update }) => {
														changingStatus = false;
														await update();
													};
												}}>
													<input type="hidden" name="jobId" value={job.id} />
													<input type="hidden" name="workerId" value={applicant.id} />
													<button type="submit" class="btn btn-primary" style="padding: 0.35rem 0.85rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.3rem;" disabled={changingStatus}>
														{#if changingStatus}
															<span class="spinner spinner-sm"></span>
														{:else}
															<UserCheck size={14} />
														{/if}
														Hire Worker
													</button>
												</form>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						{:else if job.status === 'assigned'}
							<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
								<div>
									<span style="color: var(--text-muted); font-size: 0.85rem; display: block;">Assigned Worker:</span>
									<button 
										type="button"
										style="background: none; border: none; color: var(--text-primary); font-weight: 700; font-size: 1rem; cursor: pointer; text-decoration: underline; padding: 0;"
										onclick={() => onopenviewprofile(job.worker_id)}
									>
										{job.assignedWorker?.name}
									</button>
									<span class="rating-badge {job.assignedWorker?.average_rating > 0 ? 'rating-badge-positive' : job.assignedWorker?.average_rating < 0 ? 'rating-badge-negative' : 'rating-badge-zero'}" style="margin-left: 0.35rem; display: inline-flex; align-items: center; gap: 0.2rem;">
										<Star size={12} fill="currentColor" /> {job.assignedWorker?.average_rating > 0 ? `+${job.assignedWorker.average_rating}` : job.assignedWorker?.average_rating || 0}
									</span>
									<span style="color: var(--text-secondary); font-size: 0.85rem; margin-left: 0.5rem;">Phone: {job.assignedWorker?.phone}</span>
								</div>
								
								<div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
									{#if job.worker_id}
										<button 
											type="button" 
											class="btn btn-outline" 
											style="padding: 0.4rem 0.85rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;"
											onclick={() => onopenviewprofile(job.worker_id)}
										>
											<User size={14} /> Profile
										</button>
										<button 
											type="button" 
											class="btn btn-outline" 
											style="padding: 0.4rem 0.85rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;"
											onclick={() => onopenchat(job.id, job.worker_id)}
										>
											<MessageSquare size={14} /> Chat Worker
										</button>
									{/if}

									<form method="POST" action="?/startJob" use:enhance={() => {
										changingStatus = true;
										return async ({ update }) => {
											changingStatus = false;
											await update();
										};
									}}>
										<input type="hidden" name="jobId" value={job.id} />
										<button type="submit" class="btn btn-primary" style="padding: 0.4rem 1rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;" disabled={changingStatus}>
											{#if changingStatus}
												<span class="spinner spinner-sm"></span>
											{/if}
											Start Job Execution
										</button>
									</form>
								</div>
							</div>
						{:else if job.status === 'in_progress'}
							<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
								<div>
									<span style="color: var(--text-muted); font-size: 0.85rem; display: block;">Job Status:</span>
									<span style="color: var(--accent); font-weight: 600;">Work In Progress by {job.assignedWorker?.name}</span>
								</div>
								
								<div style="display: flex; gap: 0.5rem; align-items: center;">
									{#if job.worker_id}
										<button 
											type="button" 
											class="btn btn-outline" 
											style="padding: 0.4rem 0.85rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;"
											onclick={() => onopenchat(job.id, job.worker_id)}
										>
											<MessageSquare size={14} /> Chat Worker
										</button>
									{/if}

									<button 
										type="button" 
										class="btn btn-primary" 
										style="padding: 0.4rem 1rem; font-size: 0.85rem;"
										onclick={() => onopenratingmodal(job)}
									>
										Mark Completed & Rate (-5 to +5 Stars)
									</button>
								</div>
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

			{#if loadingMore}
				<div style="display: flex; justify-content: center; align-items: center; padding: 1.5rem; gap: 0.5rem; color: var(--text-secondary);">
					<Loader2 size={20} class="animate-spin" style="color: var(--accent);" />
					<span style="font-size: 0.9rem;">Loading more active jobs...</span>
				</div>
			{:else if !hasMore && activeJobs.length > 0}
				<div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.85rem; border-top: 1px dashed var(--border);">
					✓ You have viewed all your active jobs ({activeJobs.length} total)
				</div>
			{/if}
		{/if}
	</div>
</div>
