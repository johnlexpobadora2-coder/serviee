<script>
	import { enhance } from '$app/forms';
	import { 
		Bookmark, 
		X, 
		Trash2, 
		MessageSquare, 
		MapPin, 
		Calendar, 
		ExternalLink, 
		Share2, 
		Tag
	} from 'lucide-svelte';
	import { savedJobs } from '$lib/savedJobs.svelte.js';
	import { mapModal } from '$lib/mapViewerModal.svelte.js';

	/**
	 * @type {{
	 *  jobs?: any[],
	 *  userRole?: string,
	 *  onopenchat?: (jobId: string, customerId: string, extraData?: any) => void,
	 *  onopenviewprofile?: (customerId: string) => void,
	 *  onopenshare?: (job: any) => void
	 * }}
	 */
	let {
		jobs = [],
		userRole = 'worker',
		onopenchat = () => {},
		onopenviewprofile = () => {},
		onopenshare = () => {}
	} = $props();

	let applyingJobId = $state(null);

	function handleKeydown(e) {
		if (e.key === 'Escape' && savedJobs.isDrawerOpen) {
			savedJobs.closeDrawer();
		}
	}

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
</script>

<svelte:window onkeydown={handleKeydown} />

{#if savedJobs.isDrawerOpen}
	<!-- Backdrop -->
	<div 
		class="saved-drawer-backdrop" 
		onclick={() => savedJobs.closeDrawer()}
		role="presentation"
	>
		<!-- Slide-in Drawer Container -->
		<div 
			class="saved-drawer-panel" 
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			tabindex="-1"
			aria-labelledby="saved-drawer-title"
			aria-modal="true"
		>
			<!-- Header without icon box -->
			<div class="saved-drawer-header">
				<div class="saved-drawer-header-title">
					<h3 id="saved-drawer-title" class="saved-drawer-title">
						Saved Jobs
						<span class="saved-count-pill">{savedJobs.count}</span>
					</h3>
					<p class="saved-drawer-subtitle">Your bookmarked sideline jobs</p>
				</div>
				<div style="display: flex; align-items: center; gap: 0.5rem;">
					{#if savedJobs.count > 0}
						<button 
							type="button" 
							class="btn btn-outline feed-job-delete-btn"
							style="padding: 0.35rem 0.65rem; font-size: 0.75rem; border-color: rgba(239, 68, 68, 0.4); color: var(--error);"
							onclick={() => {
								if (confirm('Are you sure you want to remove all saved jobs?')) {
									savedJobs.clear();
								}
							}}
							title="Clear all saved jobs"
						>
							<Trash2 size={13} />
							<span>Clear All</span>
						</button>
					{/if}
					<button 
						type="button" 
						class="saved-drawer-close-btn"
						onclick={() => savedJobs.closeDrawer()}
						aria-label="Close saved jobs drawer"
					>
						<X size={18} />
					</button>
				</div>
			</div>

			<!-- Drawer Body -->
			<div class="saved-drawer-body">
				{#if savedJobs.count === 0}
					<div class="saved-empty-state">
						<div class="saved-empty-icon-box">
							<Bookmark size={32} />
						</div>
						<h4>No Saved Jobs</h4>
						<p>
							Click the <strong>Bookmark icon</strong> on any job card in the feed to save and view it here later.
						</p>
						<button 
							type="button" 
							class="btn btn-primary" 
							style="margin-top: 1rem; font-size: 0.85rem;"
							onclick={() => savedJobs.closeDrawer()}
						>
							Browse Available Jobs
						</button>
					</div>
				{:else}
					<div class="saved-jobs-list">
						{#each savedJobs.list as job (job.id)}
							<div class="card saved-job-card">
								<div class="saved-job-top">
									<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
									<div class="saved-job-top-actions">
										<button 
											type="button" 
											class="saved-card-action-icon"
											onclick={() => onopenshare(job)}
											title="Share Job"
											aria-label="Share Job"
										>
											<Share2 size={15} />
										</button>
										<button 
											type="button" 
											class="saved-card-action-icon delete"
											onclick={() => savedJobs.remove(job.id)}
											title="Remove from saved"
											aria-label="Remove from saved"
										>
											<Trash2 size={15} />
										</button>
									</div>
								</div>

								<h4 class="saved-job-title">{job.title}</h4>

								{#if job.description}
									<p class="saved-job-desc">{job.description}</p>
								{/if}

								<div class="saved-job-meta">
									<div class="saved-job-meta-item">
										<MapPin size={13} style="color: #38bdf8;" />
										<span>{job.location}</span>
									</div>
									<div class="saved-job-meta-item">
										<Calendar size={13} style="color: #a78bfa;" />
										<span>
											{new Date(job.target_date || job.created_at).toLocaleDateString('en-PH', {
												month: 'short',
												day: 'numeric'
											})}
										</span>
									</div>
								</div>

								<div class="saved-job-footer">
									<div class="saved-job-budget">
										<span class="budget-label">Budget</span>
										<strong class="budget-val">₱{Number(job.budget || 0).toLocaleString()}</strong>
									</div>

									<div style="display: flex; align-items: center; gap: 0.4rem;">
										{#if job.latitude && job.longitude}
											<button 
												type="button"
												class="btn btn-outline"
												style="padding: 0.35rem 0.65rem; font-size: 0.78rem;"
												onclick={() => {
													mapModal.openModal({
														latitude: job.latitude,
														longitude: job.longitude,
														title: job.title,
														address: job.location
													});
												}}
												title="View location map"
											>
												<MapPin size={13} />
											</button>
										{/if}
										{#if userRole === 'worker'}
											{#if (jobs.find(j => j.id === job.id)?.hasApplied || job.hasApplied)}
												<button
													type="button"
													class="btn btn-outline"
													style="padding: 0.4rem 0.85rem; font-size: 0.78rem; border-color: var(--accent); color: var(--accent-hover); display: inline-flex; align-items: center; gap: 0.35rem;"
													onclick={() => {
														savedJobs.closeDrawer();
														onopenchat(job.id, job.customer_id);
													}}
												>
													<MessageSquare size={13} />
													<span>Open Chat</span>
												</button>
											{:else}
												<form
													method="POST"
													action="?/inquireJob"
													use:enhance={() => {
														applyingJobId = job.id;
														const initMsg = `Hello! Inquiring po ako sa sideline job na ito: ${job.title}.`;
														return async ({ update, result }) => {
															applyingJobId = null;
															await update();
															savedJobs.closeDrawer();
															const sentMessage = result?.type === 'success' && result?.data ? result.data.sentMessage : null;
															onopenchat(job.id, job.customer_id, {
																initialMessage: initMsg,
																sentMessage,
																jobTitle: job.title,
																customerName: job.customerName
															});
														};
													}}
													style="display: inline-flex;"
												>
													<input type="hidden" name="jobId" value={job.id} />
													<input type="hidden" name="customerId" value={job.customer_id} />
													<input type="hidden" name="initialMessage" value="Hello! Inquiring po ako sa sideline job na ito: {job.title}." />
													<button
														type="submit"
														class="btn btn-primary"
														style="padding: 0.4rem 0.85rem; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 0.35rem;"
														disabled={applyingJobId === job.id}
														id="saved-inquire-btn-{job.id}"
													>
														{#if applyingJobId === job.id}
															<span class="spinner spinner-sm"></span>
															<span>Connecting...</span>
														{:else}
															<MessageSquare size={13} />
															<span>Apply / Chat</span>
														{/if}
													</button>
												</form>
											{/if}
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.saved-drawer-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		z-index: 9998;
		display: flex;
		justify-content: flex-end;
		animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.saved-drawer-panel {
		background: var(--bg-card, #1e293b);
		border-left: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
		width: 100%;
		max-width: 440px;
		height: 100%;
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-lg, -8px 0 32px rgba(0, 0, 0, 0.5));
		animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
		outline: none;
	}

	@media (max-width: 640px) {
		.saved-drawer-backdrop {
			align-items: flex-end;
		}
		.saved-drawer-panel {
			max-width: 100%;
			height: 88vh;
			border-left: none;
			border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
			border-top-left-radius: var(--radius-lg, 8px);
			border-top-right-radius: var(--radius-lg, 8px);
			animation: slideInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
		}
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes slideInRight {
		from { transform: translateX(100%); }
		to { transform: translateX(0); }
	}

	@keyframes slideInUp {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}

	.saved-drawer-header {
		padding: 1.25rem;
		border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--bg-card, #1e293b);
	}

	.saved-drawer-header-title {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.saved-drawer-title {
		font-size: 1.15rem;
		font-weight: 700;
		margin: 0;
		color: var(--text-primary, #ffffff);
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.saved-count-pill {
		font-size: 0.72rem;
		background: var(--accent, #6366f1);
		color: #ffffff;
		padding: 0.1rem 0.5rem;
		border-radius: var(--radius-sm, 4px);
		font-weight: 700;
	}

	.saved-drawer-subtitle {
		font-size: 0.78rem;
		margin: 0;
		color: var(--text-muted, #94a3b8);
	}

	.saved-drawer-close-btn {
		background: transparent;
		border: none;
		color: var(--text-muted, #94a3b8);
		cursor: pointer;
		padding: 0.35rem;
		border-radius: var(--radius-sm, 4px);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
	}

	.saved-drawer-close-btn:hover {
		color: var(--text-primary, #ffffff);
		background: rgba(255, 255, 255, 0.08);
	}

	.saved-drawer-body {
		flex: 1;
		overflow-y: auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
	}

	.saved-empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 2.5rem 1rem;
		color: var(--text-muted, #94a3b8);
	}

	.saved-empty-icon-box {
		width: 64px;
		height: 64px;
		border-radius: var(--radius-md, 6px);
		background: var(--bg-input, rgba(255, 255, 255, 0.04));
		border: 1px dashed var(--border-color, rgba(255, 255, 255, 0.15));
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1rem;
		color: var(--text-muted, #64748b);
	}

	.saved-empty-state h4 {
		font-size: 1.1rem;
		color: var(--text-primary, #ffffff);
		margin: 0 0 0.4rem 0;
		font-weight: 600;
	}

	.saved-empty-state p {
		font-size: 0.85rem;
		line-height: 1.45;
		margin: 0;
		max-width: 290px;
	}

	.saved-jobs-list {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.saved-job-card {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		transition: border-color 0.15s ease;
	}

	.saved-job-card:hover {
		border-color: var(--accent);
	}

	.saved-job-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.saved-job-top-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.saved-card-action-icon {
		background: transparent;
		border: 1px solid transparent;
		color: var(--text-muted, #94a3b8);
		cursor: pointer;
		padding: 0.35rem;
		border-radius: var(--radius-sm, 4px);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
	}

	.saved-card-action-icon:hover {
		color: var(--text-primary, #ffffff);
		background: rgba(255, 255, 255, 0.08);
	}

	.saved-card-action-icon.delete:hover {
		color: var(--error, #ef4444);
		background: var(--error-light, rgba(239, 68, 68, 0.12));
	}

	.saved-job-title {
		font-size: 0.98rem;
		font-weight: 600;
		margin: 0;
		color: var(--text-primary, #ffffff);
		line-height: 1.35;
	}

	.saved-job-desc {
		font-size: 0.82rem;
		color: var(--text-secondary, #94a3b8);
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		line-height: 1.4;
	}

	.saved-job-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		font-size: 0.76rem;
		color: var(--text-secondary, #94a3b8);
	}

	.saved-job-meta-item {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}

	.saved-job-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 0.2rem;
		padding-top: 0.6rem;
		border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
	}

	.saved-job-budget {
		display: flex;
		flex-direction: column;
	}

	.budget-label {
		font-size: 0.68rem;
		color: var(--text-muted, #64748b);
		text-transform: uppercase;
		font-weight: 600;
	}

	.budget-val {
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--text-primary, #ffffff);
	}
</style>
