<script>
	import { enhance } from '$app/forms';
	import { 
		Bookmark, 
		X, 
		Trash2, 
		MessageSquare, 
		MapPin, 
		Calendar, 
		Share2 
	} from 'lucide-svelte';
	import { savedJobs } from '$lib/savedJobs.svelte.js';
	import { getPhilippineCityCoordinates } from '$lib/philippinesLocations.js';
	import { getServieeMapUrl, getEmbedMapUrl } from '$lib/gpsUtils.js';
	import JobMapPreview from '$lib/JobMapPreview.svelte';
	import JobDescription from '$lib/JobDescription.svelte';
	import { formatRelativeTime, formatFullDateTime, getScheduleUrgency } from '$lib/jobCardUtils.js';

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

	function getJobCoordinates(job) {
		if (!job) return null;
		let lat = job.latitude !== null && job.latitude !== undefined && job.latitude !== '' ? parseFloat(job.latitude) : null;
		let lng = job.longitude !== null && job.longitude !== undefined && job.longitude !== '' ? parseFloat(job.longitude) : null;
		if ((lat === null || isNaN(lat) || lng === null || isNaN(lng)) && job.location) {
			const cityCoords = getPhilippineCityCoordinates(job.location);
			if (cityCoords) {
				lat = cityCoords.latitude;
				lng = cityCoords.longitude;
			}
		}
		if (lat !== null && !isNaN(lat) && lng !== null && !isNaN(lng)) {
			return { latitude: lat, longitude: lng };
		}
		return null;
	}

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

	$effect(() => {
		if (savedJobs.isDrawerOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if savedJobs.isDrawerOpen}
	<!-- Backdrop -->
	<div 
		class="fixed inset-0 bg-black/65 backdrop-blur-[4px] z-[9998] flex justify-end max-sm:items-end" 
		onclick={() => savedJobs.closeDrawer()}
		role="presentation"
	>
		<!-- Slide-in Drawer Container -->
		<div 
			class="bg-[var(--bg-card)] border-l max-sm:border-l-0 max-sm:border-t border-[var(--border-color)] w-full max-w-[440px] h-full max-sm:h-[88vh] max-sm:rounded-t-lg flex flex-col shadow-2xl outline-none" 
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			tabindex="-1"
			aria-labelledby="saved-drawer-title"
			aria-modal="true"
		>
			<!-- Header without icon box -->
			<div class="p-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-card)]">
				<div class="flex flex-col gap-0.5">
					<h3 id="saved-drawer-title" class="text-[1.15rem] font-bold m-0 text-[var(--text-primary)] flex items-center gap-2">
						Saved Jobs
						<span class="text-[0.72rem] bg-[var(--accent)] text-white py-0.5 px-2 rounded-[var(--radius-sm)] font-bold">{savedJobs.count}</span>
					</h3>
					<p class="text-[0.78rem] m-0 text-[var(--text-muted)]">Your bookmarked sideline jobs</p>
				</div>
				<div class="flex items-center gap-2">
					{#if savedJobs.count > 0}
						<button 
							type="button" 
							class="btn btn-outline py-1.5 px-2.5 text-[0.75rem] border-red-500/40 text-[var(--error)] flex items-center gap-1.5"
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
						class="bg-transparent border-none text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 cursor-pointer p-1.5 rounded-[var(--radius-sm)] flex items-center justify-center transition-all duration-150"
						onclick={() => savedJobs.closeDrawer()}
						aria-label="Close saved jobs drawer"
					>
						<X size={18} />
					</button>
				</div>
			</div>

			<!-- Drawer Body -->
			<div class="flex-1 overflow-y-auto p-5 flex flex-col">
				{#if savedJobs.count === 0}
					<div class="flex-1 flex flex-col items-center justify-center text-center py-10 px-4 text-[var(--text-muted)]">
						<div class="w-16 h-16 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-dashed border-[var(--border-color)] flex items-center justify-center mb-4 text-[var(--text-muted)]">
							<Bookmark size={32} />
						</div>
						<h4 class="text-[1.1rem] text-[var(--text-primary)] mb-1.5 font-semibold">No Saved Jobs</h4>
						<p class="text-[0.85rem] leading-normal m-0 max-w-[290px]">
							Click the <strong>Bookmark icon</strong> on any job card in the feed to save and view it here later.
						</p>
						<button 
							type="button" 
							class="btn btn-primary mt-4 text-[0.85rem]" 
							onclick={() => savedJobs.closeDrawer()}
						>
							Browse Available Jobs
						</button>
					</div>
				{:else}
					<div class="flex flex-col gap-3.5">
						{#each savedJobs.list as job (job.id)}
							{@const coords = getJobCoordinates(job)}
							<div class="card p-4 flex flex-col gap-2 transition-colors duration-150 hover:border-[var(--accent)]">
								<div class="flex items-center justify-between">
									<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
									<div class="flex items-center gap-1">
										<button 
											type="button" 
											class="bg-transparent border border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 cursor-pointer p-1.5 rounded-[var(--radius-sm)] flex items-center justify-center transition-all duration-150"
											onclick={() => onopenshare(job)}
											title="Share Job"
											aria-label="Share Job"
										>
											<Share2 size={15} />
										</button>
										<button 
											type="button" 
											class="bg-transparent border border-transparent text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 cursor-pointer p-1.5 rounded-[var(--radius-sm)] flex items-center justify-center transition-all duration-150"
											onclick={() => savedJobs.remove(job.id)}
											title="Remove from saved"
											aria-label="Remove from saved"
										>
											<Trash2 size={15} />
										</button>
									</div>
								</div>

								<h4 class="text-[0.98rem] font-semibold m-0 text-[var(--text-primary)] leading-[1.35]">{job.title}</h4>

								<JobDescription text={job.description} maxLines={2} thresholdLength={90} />

								<div class="flex flex-wrap items-center gap-3 text-[0.76rem] text-[var(--text-secondary)]">
									<div class="inline-flex items-center gap-1.5">
										<MapPin size={13} class="text-sky-400" />
										<span>{job.location}</span>
									</div>
									<div class="inline-flex items-center gap-1.5 flex-wrap">
										<Calendar size={13} class="text-violet-400" />
										<span>
											{new Date(job.target_date || job.created_at).toLocaleDateString('en-PH', {
												month: 'short',
												day: 'numeric'
											})}
										</span>
										{#if job.target_date && getScheduleUrgency(job.target_date)}
											{@const urgency = getScheduleUrgency(job.target_date)}
											<span class="schedule-urgency-badge {urgency.type} text-[0.68rem] px-1.5 py-0.5">
												{urgency.label}
											</span>
										{/if}
									</div>
								</div>

								{#if coords}
									<JobMapPreview
										latitude={coords.latitude}
										longitude={coords.longitude}
										title={job.title}
										location={job.location}
									/>
								{/if}

								<div class="flex items-center justify-between mt-1 pt-2.5 border-t border-[var(--border-color)]">
									<div class="flex flex-col">
										<span class="text-[0.68rem] text-[var(--text-muted)] uppercase font-semibold">Budget</span>
										<strong class="text-[1.05rem] font-bold text-[var(--text-primary)]">₱{Number(job.budget || 0).toLocaleString()}</strong>
									</div>

									<div class="flex items-center gap-1.5">
										{#if coords}
											<a 
												href={getServieeMapUrl(coords.latitude, coords.longitude, job.title, job.location)} 
												class="btn btn-outline py-1.5 px-2.5 text-[0.78rem] inline-flex items-center gap-1 hover:border-emerald-500 hover:text-emerald-500 no-underline"
												onclick={() => savedJobs.closeDrawer()}
												title="View Map"
												aria-label="View Map"
											>
												<MapPin size={13} class="text-emerald-500 shrink-0" />
												<span class="text-[0.75rem]">View Map</span>
											</a>
										{/if}
										{#if userRole === 'worker'}
											{#if (jobs.find(j => j.id === job.id)?.hasApplied || job.hasApplied)}
												<button
													type="button"
													class="btn btn-outline py-1.5 px-3 text-[0.78rem] border-[var(--accent)] text-[var(--accent-hover)] inline-flex items-center gap-1.5"
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
													class="inline-flex"
												>
													<input type="hidden" name="jobId" value={job.id} />
													<input type="hidden" name="customerId" value={job.customer_id} />
													<input type="hidden" name="initialMessage" value="Hello! Inquiring po ako sa sideline job na ito: {job.title}." />
													<button
														type="submit"
														class="btn btn-primary py-1.5 px-3 text-[0.78rem] inline-flex items-center gap-1.5"
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
