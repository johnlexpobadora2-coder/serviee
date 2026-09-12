<script>
	import {
		X,
		Star,
		MessageSquare,
		MapPin,
		Phone,
		Mail,
		Award,
		CheckCircle2,
		Calendar,
		UserCheck,
		ClipboardList,
		Wrench,
		FileText,
		Check,
		Activity,
		Sparkles
	} from "lucide-svelte";

	let {
		userId = null,
		currentUserId = "",
		currentUserRole = "",
		show = $bindable(false),
		onclose = () => {},
		onopenchat = null,
	} = $props();

	let loading = $state(false);
	let error = $state("");
	/** @type {any} */
	let profileData = $state(null);
	let activeTab = $state("overview"); // 'overview' | 'reviews' | 'history'
	let customerSubTab = $state("posted"); // 'posted' | 'completed'

	$effect(() => {
		if (show && userId) {
			fetchUserProfile(userId);
		} else if (!show) {
			profileData = null;
			error = "";
			activeTab = "overview";
		}
	});

	async function fetchUserProfile(id) {
		loading = true;
		error = "";
		profileData = null;
		try {
			const res = await fetch(`/api/profile/${id}`);
			if (!res.ok) {
				const errJson = await res.json();
				throw new Error(errJson.error || "Failed to load profile");
			}
			const data = await res.json();
			profileData = data;
		} catch (err) {
			console.error("Error in ViewProfileModal:", err);
			error = err.message || "Could not load user details.";
		} finally {
			loading = false;
		}
	}

	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			closeModal();
		}
	}

	function closeModal() {
		show = false;
		if (onclose) onclose();
	}

	function handleMessageClick() {
		closeModal();
		if (onopenchat && profileData?.user) {
			const latestJob = (profileData.allPosts && profileData.allPosts.length > 0) ? profileData.allPosts[0] : null;
			onopenchat(profileData.user.id, {
				user: profileData.user,
				job: latestJob,
				allPosts: profileData.allPosts || []
			});
		}
	}

	function getCategoryBadge(category) {
		const lower = (category || "").toLowerCase();
		if (lower.includes("plumb") || lower.includes("tubero")) return "badge-plumbing";
		if (lower.includes("roof") || lower.includes("yero")) return "badge-roofing";
		if (lower.includes("excavat") || lower.includes("hukay")) return "badge-excavation";
		if (lower.includes("garden") || lower.includes("landscape")) return "badge-gardening";
		if (lower.includes("carpent") || lower.includes("karpintero")) return "badge-carpentry";
		if (lower.includes("electr") || lower.includes("wiring")) return "badge-electrical";
		if (lower.includes("appliance") || lower.includes("aircon")) return "badge-appliance";
		if (lower.includes("clean")) return "badge-cleaning";
		if (lower.includes("paint") || lower.includes("pintura")) return "badge-painting";
		if (lower.includes("mason")) return "badge-masonry";
		if (lower.includes("weld") || lower.includes("steel")) return "badge-welding";
		return "badge-general";
	}
</script>

{#if show}
	<!-- Modal Backdrop -->
	<div
		class="modal-backdrop profile-modal-backdrop"
		onclick={handleBackdropClick}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === "Escape" && closeModal()}
	>
		<div class="modal-content profile-modal-content">
			<!-- Close Button Floating Header -->
			<button
				type="button"
				class="close-modal-btn"
				onclick={closeModal}
				aria-label="Close modal"
			>
				<X size={20} />
			</button>

			{#if loading}
				<div
					style="padding: 4rem 2rem; text-align: center; color: var(--text-secondary);"
				>
					<div
						class="spinner spinner-accent spinner-lg"
						style="margin: 0 auto 1rem auto;"
					></div>
					<p style="font-size: 0.95rem;">
						Loading user profile details...
					</p>
				</div>
			{:else if error}
				<div
					style="padding: 3rem 2rem; text-align: center; color: var(--error);"
				>
					<h4 style="font-size: 1.2rem; margin-bottom: 0.5rem;">
						Unable to load profile
					</h4>
					<p
						style="font-size: 0.9rem; margin-bottom: 1.5rem; color: var(--text-secondary);"
					>
						{error}
					</p>
					<button
						type="button"
						class="btn btn-secondary"
						onclick={closeModal}>Close</button
					>
				</div>
			{:else if profileData && profileData.user}
				{@const user = profileData.user}
				{@const stats = profileData.stats}
				{@const completedJobs = [
					...(profileData.completedJobs || []),
				].sort(
					(a, b) =>
						new Date(b.created_at || 0).getTime() -
						new Date(a.created_at || 0).getTime(),
				)}
				{@const allPosts = [...(profileData.allPosts || [])].sort(
					(a, b) =>
						new Date(b.created_at || 0).getTime() -
						new Date(a.created_at || 0).getTime(),
				)}
				{@const isSelf = user.id === currentUserId}
				{@const isClientViewingClient = (currentUserRole === 'customer' || currentUserRole === 'client') && (user.role === 'customer' || user.role === 'client')}
				{@const isWorkerViewingWorker = currentUserRole === 'worker' && user.role === 'worker'}
				{@const canChat = Boolean(onopenchat && !isSelf && !isClientViewingClient && !isWorkerViewingWorker)}

				<!-- Header Cover & Avatar Section -->
				<div class="modal-profile-header">
					<div class="modal-cover-banner"></div>
					<div class="modal-header-content">
						<div class="modal-header-row">
							<!-- User Avatar & Core Header Info -->
							<div class="modal-user-left">
								<div class="modal-avatar">
									{user.name
										? user.name.charAt(0).toUpperCase()
										: "U"}
								</div>
								<div class="modal-user-text">
									<div class="modal-user-name-row">
										<h2 class="modal-user-name">
											{user.name}
										</h2>
										{#if isSelf}
											<span class="modal-self-badge">You</span>
										{/if}
									</div>
									<div class="modal-user-badges">
										<span
											class="badge {user.role === 'worker'
												? 'badge-gardening'
												: 'badge-roofing'}"
										>
											{user.role === "worker"
												? "Handyman / Worker"
												: "Client / Customer"}
										</span>
										{#if user.role === "worker"}
											{#if user.availability_status === 'busy'}
												<span
													class="badge badge-status-busy"
												>
													<span class="status-dot-busy"></span>
													Busy / On Leave
												</span>
											{:else}
												<span
													class="badge badge-status-available"
												>
													<span class="status-dot-available"></span>
													Available for Jobs
												</span>
											{/if}
										{/if}
										{#if user.address}
											<span class="modal-user-location">
												<MapPin size={12} />
												{user.address}
											</span>
										{/if}
									</div>
								</div>
							</div>

							<!-- Quick Stat Pills -->
							<div class="modal-stats-group">
								{#if user.role === "worker"}
									<div class="modal-stat-item">
										<span
											class="rating-badge {stats.average_rating >
											0
												? 'rating-badge-positive'
												: stats.average_rating < 0
													? 'rating-badge-negative'
													: 'rating-badge-zero'}"
										>
											<Star
												size={12}
												fill="currentColor"
											/>
											{stats.average_rating > 0
												? `+${stats.average_rating}`
												: stats.average_rating || 0}
										</span>
										<span class="modal-stat-label">Rating</span>
									</div>
									<div class="modal-stat-item">
										<span class="modal-stat-value success-val">
											{stats.completed_jobs_count || 0}
										</span>
										<span class="modal-stat-label">Completed</span>
									</div>
								{:else}
									<div class="modal-stat-item">
										<span class="modal-stat-value">
											{stats.total_posts_count || 0}
										</span>
										<span class="modal-stat-label">Total Posts</span>
									</div>
									<div class="modal-stat-item">
										<span class="modal-stat-value success-val">
											{stats.completed_jobs_count || 0}
										</span>
										<span class="modal-stat-label">Done Jobs</span>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Navigation Tabs within Modal -->
				<div class="modal-tabs-wrapper">
					<div class="modal-tabs-nav">
						<button
							type="button"
							class="modal-tab-btn {activeTab === 'overview' ? 'active' : ''}"
							onclick={() => (activeTab = "overview")}
						>
							About Profile
						</button>
						{#if user.role === "worker"}
							<button
								type="button"
								class="modal-tab-btn {activeTab === 'reviews' ? 'active' : ''}"
								onclick={() => (activeTab = "reviews")}
							>
								Reviews & Feedback ({stats.reviews?.length || 0})
							</button>
						{/if}
						<button
							type="button"
							class="modal-tab-btn {activeTab === 'history' ? 'active' : ''}"
							onclick={() => (activeTab = "history")}
						>
							{user.role === "worker"
								? "Service History"
								: "Job History"} ({completedJobs.length})
						</button>
					</div>
				</div>

				<!-- Tab Content Container -->
				<div class="modal-body-container">
					<!-- TAB 1: OVERVIEW & CONTACT -->
					{#if activeTab === "overview"}
						<div class="overview-grid">
							<!-- Bio / About Me Card -->
							<div class="modal-card full-span">
								<h4 class="modal-card-title">
									<FileText size={15} class="card-icon-accent" />
									About / Pagpapakilala
								</h4>
								{#if user.bio && user.bio.trim()}
									<p class="modal-bio-text">
										{user.bio.trim()}
									</p>
								{:else}
									<p class="modal-empty-text">
										No bio provided yet.
									</p>
								{/if}
							</div>

							{#if user.role === "worker"}
								<!-- Skills & Services Offered Card -->
								<div class="modal-card full-span">
									<div class="modal-card-header-flex">
										<h4 class="modal-card-title">
											<Wrench size={15} class="card-icon-accent" />
											Skills & Services Offered
										</h4>
										{#if user.skills && user.skills.length > 0}
											<span class="service-count-pill">
												{user.skills.length} {user.skills.length === 1 ? 'service' : 'services'}
											</span>
										{/if}
									</div>
									{#if user.skills && user.skills.length > 0}
										<div class="modal-skills-wrap">
											{#each user.skills as skill}
												<span
													class="badge {getCategoryBadge(skill)} skill-pill"
												>
													<Check size={11} />
													{skill}
												</span>
											{/each}
										</div>
									{:else}
										<p class="modal-empty-text">
											No specific skills listed yet.
										</p>
									{/if}
								</div>
							{/if}

							<!-- Contact & Info Box -->
							<div class="modal-card">
								<h4 class="modal-card-title">
									<UserCheck size={15} class="card-icon-accent" />
									User Details
								</h4>
								<div class="details-list">
									{#if user.role === "worker"}
										<div class="detail-row">
											<Activity
												size={15}
												style="color: {user.availability_status === 'busy' ? '#f59e0b' : 'var(--success)'}; flex-shrink: 0;"
											/>
											<div class="detail-info">
												<span class="detail-label">Availability Status</span>
												<strong
													class="detail-value"
													style="color: {user.availability_status === 'busy' ? '#f59e0b' : 'var(--success)'};"
												>
													{user.availability_status === 'busy' ? 'Busy / On Leave' : 'Available for Jobs'}
												</strong>
											</div>
										</div>
									{/if}

									<div class="detail-row">
										<Mail size={15} class="detail-icon" />
										<div class="detail-info">
											<span class="detail-label">Email</span>
											<strong class="detail-value">{user.email || "Not provided"}</strong>
										</div>
									</div>

									<div class="detail-row">
										<Phone size={15} class="detail-icon" />
										<div class="detail-info">
											<span class="detail-label">Phone Number</span>
											<strong class="detail-value phone-value">{user.phone || "Not provided"}</strong>
										</div>
									</div>

									<div class="detail-row">
										<MapPin size={15} class="detail-icon" />
										<div class="detail-info">
											<span class="detail-label">City / Municipality</span>
											<strong class="detail-value">{user.address || "Not specified"}</strong>
										</div>
									</div>

									{#if user.created_at}
										<div class="detail-row">
											<Calendar size={15} class="detail-icon" />
											<div class="detail-info">
												<span class="detail-label">Member Since</span>
												<strong class="detail-value muted-val">
													{new Date(user.created_at).toLocaleDateString("en-PH", {
														month: "long",
														year: "numeric",
													})}
												</strong>
											</div>
										</div>
									{/if}
								</div>
							</div>

							<!-- Account Performance Summary Box -->
							<div class="modal-card performance-card">
								<div>
									<h4 class="modal-card-title">
										<Award size={15} style="color: var(--warning);" />
										Account Performance
									</h4>

									{#if user.role === "worker"}
										<div class="perf-list">
											<div class="perf-row">
												<span class="perf-label">Overall Rating Score:</span>
												<span
													class="rating-badge {stats.average_rating > 0
														? 'rating-badge-positive'
														: stats.average_rating < 0
															? 'rating-badge-negative'
															: 'rating-badge-zero'}"
												>
													<Star size={11} fill="currentColor" />
													{stats.average_rating > 0
														? `+${stats.average_rating}`
														: stats.average_rating || 0}
												</span>
											</div>
											<div class="perf-row">
												<span class="perf-label">Total Reviews Received:</span>
												<strong class="perf-val">{stats.total_reviews || 0} reviews</strong>
											</div>
											<div class="perf-row">
												<span class="perf-label">Completed Tasks:</span>
												<strong class="perf-val success-val">{stats.completed_jobs_count || 0} completed</strong>
											</div>
										</div>
									{:else}
										<div class="perf-list">
											<div class="perf-row">
												<span class="perf-label">Total Jobs Posted:</span>
												<strong class="perf-val">{stats.total_posts_count || 0} jobs</strong>
											</div>
											<div class="perf-row">
												<span class="perf-label">Successfully Completed:</span>
												<strong class="perf-val success-val">{stats.completed_jobs_count || 0} finished</strong>
											</div>
										</div>
									{/if}
								</div>

								{#if canChat}
									<div class="perf-chat-btn-wrap">
										<button
											type="button"
											class="btn btn-primary chat-direct-btn"
											onclick={handleMessageClick}
										>
											<MessageSquare size={15} /> Send Direct Message
										</button>
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<!-- TAB 2: REVIEWS & FEEDBACK (FOR WORKERS) -->
					{#if activeTab === "reviews" && user.role === "worker"}
						<div class="reviews-container">
							{#if !stats.reviews || stats.reviews.length === 0}
								<div class="modal-card empty-card">
									<h4>No reviews yet</h4>
									<p>This worker has not received any feedback ratings yet.</p>
								</div>
							{:else}
								{@const sortedReviews = [...stats.reviews].sort(
									(a, b) =>
										new Date(b.created_at).getTime() -
										new Date(a.created_at).getTime(),
								)}
								{#each sortedReviews as rev (rev.id)}
									<div class="modal-card review-item-card">
										<div class="review-header">
											<div class="review-user-info">
												<strong class="review-author">{rev.customer_name}</strong>
												<span class="review-date">
													{new Date(rev.created_at).toLocaleDateString("en-PH", {
														month: "short",
														day: "numeric",
														year: "numeric",
													})}
												</span>
											</div>
											<span
												class="rating-badge {rev.rating > 0
													? 'rating-badge-positive'
													: rev.rating < 0
														? 'rating-badge-negative'
														: 'rating-badge-zero'}"
											>
												<Star size={11} fill="currentColor" />
												{rev.rating > 0 ? `+${rev.rating}` : rev.rating} Star{Math.abs(rev.rating) === 1 ? "" : "s"}
											</span>
										</div>
										<p class="review-body">
											"{rev.review_text}"
										</p>
									</div>
								{/each}
							{/if}
						</div>
					{/if}

					<!-- TAB 3: SERVICE / JOB HISTORY -->
					{#if activeTab === "history"}
						<div class="history-container">
							{#if user.role === "customer"}
								<!-- Sub-tabs header for customer modal view -->
								<div class="history-subtabs">
									<button
										type="button"
										class="subtab-btn {customerSubTab === 'posted' ? 'active' : ''}"
										onclick={() => (customerSubTab = "posted")}
									>
										<ClipboardList size={13} /> Job Posted ({allPosts.length})
									</button>
									<button
										type="button"
										class="subtab-btn {customerSubTab === 'completed' ? 'active' : ''}"
										onclick={() => (customerSubTab = "completed")}
									>
										<CheckCircle2 size={13} /> Completed Jobs ({completedJobs.length})
									</button>
								</div>

								{#if customerSubTab === "posted"}
									{#if allPosts.length === 0}
										<div class="modal-card empty-card">
											<h4>No jobs posted yet</h4>
											<p>This customer has not posted any jobs yet.</p>
										</div>
									{:else}
										{#each allPosts as job (job.id)}
											<div class="modal-card job-history-card">
												<div class="job-card-top">
													<div class="job-card-title-group">
														<h4 class="job-card-title">{job.title}</h4>
														<div class="job-card-meta">
															<span class="badge {getCategoryBadge(job.category)} meta-badge">
																{job.category}
															</span>
															{#if job.status === "completed"}
																<span class="status status-completed meta-status">Completed</span>
															{:else if job.status === "in_progress"}
																<span class="status status-in-progress meta-status">In Progress</span>
															{:else}
																<span class="status status-open meta-status">Open</span>
															{/if}
															{#if job.created_at}
																<span class="job-card-date">
																	{new Date(job.created_at).toLocaleDateString("en-PH", {
																		month: "short",
																		day: "numeric",
																		year: "numeric",
																	})}
																</span>
															{/if}
														</div>
													</div>
													<strong class="job-card-budget">₱{job.budget?.toLocaleString()}</strong>
												</div>
												{#if job.description}
													<p class="job-card-desc">{job.description}</p>
												{/if}
												<div class="job-card-bottom">
													<span><MapPin size={11} /> {job.location}</span>
													{#if job.assignedWorker}
														<span>Worker: <strong class="highlight-worker">{job.assignedWorker.name}</strong></span>
													{/if}
												</div>
											</div>
										{/each}
									{/if}
								{:else if customerSubTab === "completed"}
									{#if completedJobs.length === 0}
										<div class="modal-card empty-card">
											<h4>No completed jobs recorded</h4>
											<p>No completed job transactions recorded for this customer profile.</p>
										</div>
									{:else}
										{#each completedJobs as job (job.id)}
											<div class="modal-card job-history-card">
												<div class="job-card-top">
													<div class="job-card-title-group">
														<h4 class="job-card-title">{job.title}</h4>
														<span class="badge {getCategoryBadge(job.category)} meta-badge">
															{job.category}
														</span>
													</div>
													<strong class="job-card-budget">₱{job.budget?.toLocaleString()}</strong>
												</div>
												{#if job.description}
													<p class="job-card-desc">{job.description}</p>
												{/if}

												<div class="completed-job-meta-box">
													<div class="completed-job-meta-row">
														<span>Completed by: <strong class="highlight-worker">{job.assignedWorker?.name || "Worker"}</strong></span>
														{#if job.review}
															<span
																class="rating-badge {job.review.rating > 0
																	? 'rating-badge-positive'
																	: job.review.rating < 0
																		? 'rating-badge-negative'
																		: 'rating-badge-zero'} compact-rating"
															>
																<Star size={10} fill="currentColor" />
																{job.review.rating > 0 ? `+${job.review.rating}` : job.review.rating} Star{Math.abs(job.review.rating) === 1 ? "" : "s"}
															</span>
														{/if}
													</div>

													{#if job.review && job.review.review_text}
														<div class="completed-job-review-quote">
															"{job.review.review_text}"
														</div>
													{/if}
												</div>
											</div>
										{/each}
									{/if}
								{/if}
							{:else}
								<!-- Worker Service History -->
								{#if completedJobs.length === 0}
									<div class="modal-card empty-card">
										<h4>No completed jobs recorded</h4>
										<p>No past completed job records found for this profile.</p>
									</div>
								{:else}
									{#each completedJobs as job (job.id)}
										<div class="modal-card job-history-card">
											<div class="job-card-top">
												<div class="job-card-title-group">
													<h4 class="job-card-title">{job.title}</h4>
													<span class="badge {getCategoryBadge(job.category)} meta-badge">
														{job.category}
													</span>
												</div>
												<strong class="job-card-budget">₱{job.budget?.toLocaleString()}</strong>
											</div>
											{#if job.description}
												<p class="job-card-desc">{job.description}</p>
											{/if}
											<div class="job-card-bottom">
												<span><MapPin size={11} /> {job.location}</span>
												<span class="job-completed-tag">
													<CheckCircle2 size={12} /> Completed
												</span>
											</div>
										</div>
									{/each}
								{/if}
							{/if}
						</div>
					{/if}
				</div>

				<!-- Modal Footer Actions -->
				<div class="modal-footer">
					<button
						type="button"
						class="btn btn-secondary modal-footer-btn"
						onclick={closeModal}
					>
						Close Profile
					</button>
					{#if canChat}
						<button
							type="button"
							class="btn btn-primary modal-footer-btn"
							onclick={handleMessageClick}
						>
							<MessageSquare size={14} /> Open Chat
						</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Modal Backdrop & Container */
	.profile-modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background-color: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 99999;
		padding: 1.5rem;
		box-sizing: border-box;
	}

	.profile-modal-content {
		max-width: 680px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 0 !important;
		border-radius: var(--radius-lg);
		background-color: var(--bg-card);
		border: 1px solid var(--border-color);
		box-shadow: 0 20px 45px rgba(0, 0, 0, 0.5);
		position: relative;
		animation: modalSlideUp var(--transition-smooth);
		box-sizing: border-box;
	}

	/* Floating Close Button */
	.close-modal-btn {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		background: rgba(15, 23, 42, 0.65);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.25);
		color: #ffffff;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 30;
		transition: all 0.2s ease;
	}
	.close-modal-btn:hover {
		background: rgba(15, 23, 42, 0.9);
		border-color: rgba(255, 255, 255, 0.6);
		transform: scale(1.05);
	}

	/* Modal Header Layout */
	.modal-profile-header {
		position: relative;
		border-bottom: 1px solid var(--border-color);
		background: var(--bg-card);
	}

	.modal-cover-banner {
		height: 120px;
		background: linear-gradient(135deg, hsl(230, 40%, 15%) 0%, hsl(260, 50%, 20%) 50%, hsl(280, 45%, 15%) 100%);
		position: relative;
	}

	.modal-header-content {
		padding: 0 1.25rem 1.15rem 1.25rem;
		position: relative;
	}

	.modal-header-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.modal-user-left {
		display: flex;
		align-items: flex-end;
		gap: 1rem;
		margin-top: -42px;
	}

	.modal-avatar {
		width: 82px;
		height: 82px;
		border-radius: var(--radius-full);
		border: 4px solid var(--bg-card);
		background: linear-gradient(135deg, var(--accent) 0%, hsl(265, 75%, 45%) 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2rem;
		font-weight: 800;
		color: #ffffff;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
		z-index: 2;
		flex-shrink: 0;
	}

	.modal-user-text {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
	}

	.modal-user-name-row {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex-wrap: wrap;
	}

	.modal-user-name {
		font-size: 1.35rem;
		font-weight: 700;
		line-height: 1.2;
		margin: 0;
		color: var(--text-primary);
		word-break: break-word;
	}

	.modal-self-badge {
		font-size: 0.72rem;
		font-weight: 600;
		padding: 0.12rem 0.45rem;
		background: var(--accent-light);
		color: var(--accent-hover);
		border-radius: var(--radius-full);
	}

	.modal-user-badges {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.badge-status-busy {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
		border: 1px solid rgba(245, 158, 11, 0.3);
		font-size: 0.74rem;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}

	.status-dot-busy {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #f59e0b;
	}

	.badge-status-available {
		background: rgba(16, 185, 129, 0.15);
		color: #10b981;
		border: 1px solid rgba(16, 185, 129, 0.3);
		font-size: 0.74rem;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}

	.status-dot-available {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #10b981;
		box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
	}

	.modal-user-location {
		font-size: 0.78rem;
		color: var(--text-muted);
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
	}

	.modal-stats-group {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.modal-stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		padding: 0.4rem 0.8rem;
		border-radius: var(--radius-md);
		min-width: 85px;
	}

	.modal-stat-value {
		font-size: 1.15rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.2;
	}

	.modal-stat-value.success-val {
		color: var(--success);
	}

	.modal-stat-label {
		font-size: 0.65rem;
		color: var(--text-muted);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-top: 0.15rem;
	}

	/* Modal Tabs */
	.modal-tabs-wrapper {
		padding: 0 1rem;
		border-bottom: 1px solid var(--border-color);
		background: var(--bg-card);
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}
	.modal-tabs-wrapper::-webkit-scrollbar {
		display: none;
	}

	.modal-tabs-nav {
		display: flex;
		gap: 0.4rem;
		white-space: nowrap;
		margin-bottom: -1px;
	}

	.modal-tab-btn {
		padding: 0.65rem 0.85rem;
		font-size: 0.84rem;
		font-weight: 600;
		color: var(--text-secondary);
		border: none;
		border-bottom: 2px solid transparent;
		background: transparent;
		cursor: pointer;
		transition: all 0.2s ease;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}
	.modal-tab-btn:hover {
		color: var(--text-primary);
	}
	.modal-tab-btn.active {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}

	/* Modal Body Container */
	.modal-body-container {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.15rem;
	}

	.overview-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.modal-card {
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: 1.1rem;
	}

	.modal-card.full-span {
		grid-column: 1 / -1;
	}

	.modal-card-title {
		font-size: 0.95rem;
		font-weight: 600;
		margin-bottom: 0.6rem;
		color: var(--text-primary);
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.modal-card-header-flex {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.6rem;
	}
	.modal-card-header-flex .modal-card-title {
		margin-bottom: 0;
	}

	:global(.card-icon-accent) {
		color: var(--accent);
	}

	.service-count-pill {
		font-size: 0.72rem;
		color: var(--accent-hover);
		font-weight: 600;
		background: var(--accent-light);
		padding: 0.12rem 0.5rem;
		border-radius: var(--radius-full);
	}

	.modal-bio-text {
		color: var(--text-primary);
		font-size: 0.88rem;
		line-height: 1.55;
		white-space: pre-line;
		margin: 0;
		background: var(--bg-card);
		padding: 0.75rem 0.9rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-color);
		word-break: break-word;
	}

	.modal-empty-text {
		color: var(--text-muted);
		font-size: 0.85rem;
		font-style: italic;
		margin: 0;
	}

	.modal-skills-wrap {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.skill-pill {
		font-size: 0.78rem;
		padding: 0.28rem 0.65rem;
		border-radius: var(--radius-full);
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-weight: 500;
	}

	/* Details List */
	.details-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.detail-row {
		display: flex;
		align-items: flex-start;
		gap: 0.55rem;
	}

	:global(.detail-icon) {
		color: var(--text-muted);
		flex-shrink: 0;
		margin-top: 2px;
	}

	.detail-info {
		min-width: 0;
		overflow-wrap: break-word;
		word-break: break-word;
		display: flex;
		flex-direction: column;
	}

	.detail-label {
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.detail-value {
		font-size: 0.85rem;
		color: var(--text-primary);
		font-weight: 600;
	}

	.detail-value.phone-value {
		color: var(--accent-hover);
		font-family: monospace;
		font-size: 0.92rem;
	}

	.detail-value.muted-val {
		color: var(--text-secondary);
		font-weight: 500;
	}

	/* Performance Box */
	.performance-card {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.perf-list {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.perf-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 0.45rem;
	}
	.perf-row:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.perf-label {
		color: var(--text-secondary);
		font-size: 0.8rem;
	}

	.perf-val {
		color: var(--text-primary);
		font-size: 0.84rem;
	}

	.perf-val.success-val {
		color: var(--success);
	}

	.perf-chat-btn-wrap {
		margin-top: 1rem;
	}

	.chat-direct-btn {
		width: 100%;
		padding: 0.55rem;
		font-size: 0.85rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
	}

	/* Reviews Tab */
	.reviews-container,
	.history-container {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.empty-card {
		text-align: center;
		padding: 2.5rem 1.25rem;
		border-style: dashed;
	}
	.empty-card h4 {
		font-size: 1rem;
		margin-bottom: 0.3rem;
		color: var(--text-primary);
	}
	.empty-card p {
		color: var(--text-secondary);
		font-size: 0.82rem;
		margin: 0;
	}

	.review-item-card {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		padding: 0.9rem 1.1rem;
	}

	.review-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.review-user-info {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex-wrap: wrap;
	}

	.review-author {
		color: var(--text-primary);
		font-size: 0.9rem;
	}

	.review-date {
		font-size: 0.72rem;
		color: var(--text-muted);
	}

	.review-body {
		font-size: 0.85rem;
		color: var(--text-secondary);
		line-height: 1.45;
		font-style: italic;
		margin: 0;
	}

	/* History Tab */
	.history-subtabs {
		display: flex;
		gap: 0.4rem;
		margin-bottom: 0.25rem;
	}

	.subtab-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8rem;
		padding: 0.35rem 0.7rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-color);
		background: var(--bg-card);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.subtab-btn.active {
		background: var(--accent);
		color: #ffffff;
		border-color: var(--accent);
	}

	.job-history-card {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		padding: 0.9rem 1.1rem;
	}

	.job-card-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.job-card-title-group {
		min-width: 0;
	}

	.job-card-title {
		font-size: 0.95rem;
		color: var(--text-primary);
		margin: 0 0 0.2rem 0;
		font-weight: 600;
		word-break: break-word;
	}

	.job-card-meta {
		display: flex;
		gap: 0.35rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.meta-badge {
		font-size: 0.68rem;
		padding: 0.1rem 0.4rem;
	}

	.meta-status {
		font-size: 0.68rem;
		padding: 0.08rem 0.35rem;
	}

	.job-card-date {
		font-size: 0.68rem;
		color: var(--text-muted);
	}

	.job-card-budget {
		color: var(--accent);
		font-size: 1rem;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.job-card-desc {
		font-size: 0.82rem;
		color: var(--text-secondary);
		line-height: 1.4;
		margin: 0;
	}

	.job-card-bottom {
		font-size: 0.74rem;
		color: var(--text-muted);
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 0.2rem;
		border-top: 1px solid var(--border-color);
		padding-top: 0.45rem;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.highlight-worker {
		color: var(--text-primary);
	}

	.job-completed-tag {
		color: var(--success);
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.completed-job-meta-box {
		border-top: 1px solid var(--border-color);
		padding-top: 0.45rem;
		margin-top: 0.2rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.completed-job-meta-row {
		font-size: 0.74rem;
		color: var(--text-muted);
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.compact-rating {
		font-size: 0.7rem;
		padding: 0.1rem 0.35rem;
	}

	.completed-job-review-quote {
		background: var(--bg-card);
		padding: 0.45rem 0.7rem;
		border-radius: var(--radius-sm);
		font-size: 0.78rem;
		color: var(--text-secondary);
		font-style: italic;
		border: 1px solid var(--border-color);
	}

	/* Modal Footer */
	.modal-footer {
		padding: 0.85rem 1.25rem;
		border-top: 1px solid var(--border-color);
		background: var(--bg-card);
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
	}

	.modal-footer-btn {
		font-size: 0.85rem;
		padding: 0.5rem 1rem;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	/* Responsive Media Queries */
	@media (max-width: 640px) {
		.profile-modal-backdrop {
			padding: 0.5rem 0.35rem;
			align-items: center;
		}

		.profile-modal-content {
			width: 100%;
			max-height: 94vh;
			border-radius: var(--radius-md);
		}

		.modal-cover-banner {
			height: 90px;
		}

		.modal-header-content {
			padding: 0 0.85rem 0.85rem 0.85rem;
		}

		.modal-header-row {
			flex-direction: column;
			align-items: center;
			text-align: center;
			gap: 0.65rem;
		}

		.modal-user-left {
			flex-direction: column;
			align-items: center;
			margin-top: -38px;
			gap: 0.5rem;
			width: 100%;
		}

		.modal-avatar {
			width: 74px;
			height: 74px;
			font-size: 1.75rem;
			border-width: 3px;
		}

		.modal-user-text {
			align-items: center;
			width: 100%;
		}

		.modal-user-name-row {
			justify-content: center;
		}

		.modal-user-name {
			font-size: 1.18rem;
		}

		.modal-user-badges {
			justify-content: center;
		}

		.modal-stats-group {
			width: 100%;
			justify-content: center;
			gap: 0.45rem;
			margin-top: 0.15rem;
		}

		.modal-stat-item {
			flex: 1;
			max-width: 140px;
			min-width: 0;
			padding: 0.35rem 0.5rem;
		}

		.modal-stat-value {
			font-size: 1.05rem;
		}

		.modal-tab-btn {
			padding: 0.55rem 0.65rem;
			font-size: 0.78rem;
		}

		.modal-body-container {
			padding: 0.85rem;
			gap: 0.85rem;
		}

		.overview-grid {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}

		.modal-card {
			padding: 0.85rem;
		}

		.modal-footer {
			flex-direction: column-reverse;
			padding: 0.75rem 0.85rem;
			gap: 0.5rem;
		}

		.modal-footer-btn {
			width: 100%;
			justify-content: center;
			padding: 0.6rem;
		}
	}
</style>
