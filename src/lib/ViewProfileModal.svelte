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
	} from "lucide-svelte";

	let {
		userId = null,
		currentUserId = "",
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
			onopenchat(profileData.user.id);
		}
	}

	function getCategoryBadge(category) {
		switch (category) {
			case "Plumbing / Tubero":
				return "badge-plumbing";
			case "Roofing / Ayos Yero":
				return "badge-roofing";
			case "Excavation / Hukay Lupa":
				return "badge-excavation";
			case "Gardening":
				return "badge-gardening";
			case "Carpentry":
				return "badge-carpentry";
			default:
				return "badge-general";
		}
	}
</script>

{#if show}
	<!-- Modal Backdrop -->
	<div
		class="modal-backdrop"
		onclick={handleBackdropClick}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === "Escape" && closeModal()}
	>
		<div
			class="modal-content profile-modal-content"
			style="max-width: 720px; width: 95%; max-height: 90vh; overflow-y: auto; padding: 0; border-radius: var(--radius-lg);"
		>
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
						class="spinner"
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

				<!-- Header Cover & Avatar Section -->
				<div
					class="profile-header-card"
					style="border: none; border-radius: 0;"
				>
					<div
						class="profile-cover-banner"
						style="height: 140px;"
					></div>
					<div
						class="profile-header-content"
						style="padding: 0 1.5rem 1.25rem 1.5rem;"
					>
						<div class="profile-header-row">
							<!-- User Avatar & Core Header Info -->
							<div
								class="profile-user-left"
								style="margin-top: -45px;"
							>
								<div
									class="profile-avatar-wrapper"
									style="width: 90px; height: 90px; font-size: 2.25rem;"
								>
									{user.name
										? user.name.charAt(0).toUpperCase()
										: "U"}
								</div>
								<div class="profile-user-text">
									<h2
										style="font-size: 1.5rem; margin-bottom: 0.2rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;"
									>
										{user.name}
										{#if isSelf}
											<span
												style="font-size: 0.75rem; font-weight: 500; padding: 0.15rem 0.5rem; background: var(--accent-light); color: var(--accent-hover); border-radius: var(--radius-full);"
												>You</span
											>
										{/if}
									</h2>
									<div
										style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;"
									>
										<span
											class="badge {user.role === 'worker'
												? 'badge-general'
												: 'badge-roofing'}"
											style="font-size: 0.75rem;"
										>
											{user.role === "worker"
												? "Handyman / Worker"
												: "Client / Customer"}
										</span>
										<span
											style="font-size: 0.8rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 0.25rem;"
										>
											<MapPin size={13} />
											{user.address}
										</span>
									</div>
								</div>
							</div>

							<!-- Quick Stat Pills -->
							<div
								class="profile-stats-group"
								style="gap: 0.75rem;"
							>
								{#if user.role === "worker"}
									<div
										class="profile-stat-item"
										style="padding: 0.5rem 0.85rem; min-width: 90px;"
									>
										<span
											class="rating-badge {stats.average_rating >
											0
												? 'rating-badge-positive'
												: stats.average_rating < 0
													? 'rating-badge-negative'
													: 'rating-badge-zero'}"
											style="font-size: 0.95rem; padding: 0.15rem 0.5rem;"
										>
											<Star
												size={13}
												fill="currentColor"
											/>
											{stats.average_rating > 0
												? `+${stats.average_rating}`
												: stats.average_rating}
										</span>
										<span
											class="profile-stat-label"
											style="font-size: 0.68rem;"
											>Rating</span
										>
									</div>
									<div
										class="profile-stat-item"
										style="padding: 0.5rem 0.85rem; min-width: 90px;"
									>
										<span
											class="profile-stat-value"
											style="color: var(--success); font-size: 1.25rem;"
											>{stats.completed_jobs_count ||
												0}</span
										>
										<span
											class="profile-stat-label"
											style="font-size: 0.68rem;"
											>Completed</span
										>
									</div>
								{:else}
									<div
										class="profile-stat-item"
										style="padding: 0.5rem 0.85rem; min-width: 90px;"
									>
										<span
											class="profile-stat-value"
											style="font-size: 1.25rem;"
											>{stats.total_posts_count ||
												0}</span
										>
										<span
											class="profile-stat-label"
											style="font-size: 0.68rem;"
											>Total Posts</span
										>
									</div>
									<div
										class="profile-stat-item"
										style="padding: 0.5rem 0.85rem; min-width: 90px;"
									>
										<span
											class="profile-stat-value"
											style="color: var(--success); font-size: 1.25rem;"
											>{stats.completed_jobs_count ||
												0}</span
										>
										<span
											class="profile-stat-label"
											style="font-size: 0.68rem;"
											>Done Jobs</span
										>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Navigation Tabs within Modal -->
				<div
					style="padding: 0.5rem 1rem 0 1rem; border-bottom: 1px solid var(--border-color); background: hsla(222, 20%, 10%, 0.4); overflow-x: auto;"
				>
					<div
						class="tabs-header"
						style="margin-bottom: 0; border-bottom: none; gap: 0.35rem; padding: 0.25rem 0.25rem 0 0.25rem;"
					>
						<button
							type="button"
							class="tab-btn {activeTab === 'overview'
								? 'active'
								: ''}"
							onclick={() => (activeTab = "overview")}
							style="padding: 0.6rem 0.9rem; font-size: 0.85rem;"
						>
							About Profile
						</button>
						{#if user.role === "worker"}
							<button
								type="button"
								class="tab-btn {activeTab === 'reviews'
									? 'active'
									: ''}"
								onclick={() => (activeTab = "reviews")}
								style="padding: 0.6rem 0.9rem; font-size: 0.85rem;"
							>
								Reviews & Feedback ({stats.reviews?.length ||
									0})
							</button>
						{/if}
						<button
							type="button"
							class="tab-btn {activeTab === 'history'
								? 'active'
								: ''}"
							onclick={() => (activeTab = "history")}
							style="padding: 0.6rem 0.9rem; font-size: 0.85rem;"
						>
							{user.role === "worker"
								? "Service History"
								: "Job History"} ({completedJobs.length})
						</button>
					</div>
				</div>

				<!-- Tab Content Container -->
				<div
					style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem;"
				>
					<!-- TAB 1: OVERVIEW & CONTACT -->
					{#if activeTab === "overview"}
						<div
							style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;"
						>
							<!-- Contact & Info Box -->
							<div
								class="card"
								style="padding: 1.25rem; background: var(--bg-input);"
							>
								<h4
									style="font-size: 1rem; margin-bottom: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;"
								>
									<UserCheck
										size={16}
										style="color: var(--accent);"
									/> User Details
								</h4>
								<div
									style="display: flex; flex-direction: column; gap: 0.85rem; font-size: 0.9rem;"
								>
									<div
										style="display: flex; align-items: center; gap: 0.6rem;"
									>
										<Mail
											size={16}
											style="color: var(--text-muted);"
										/>
										<div>
											<span
												style="font-size: 0.75rem; color: var(--text-muted); display: block;"
												>Email</span
											>
											<strong
												style="color: var(--text-primary);"
												>{user.email}</strong
											>
										</div>
									</div>

									<div
										style="display: flex; align-items: center; gap: 0.6rem;"
									>
										<Phone
											size={16}
											style="color: var(--text-muted);"
										/>
										<div>
											<span
												style="font-size: 0.75rem; color: var(--text-muted); display: block;"
												>Phone Number</span
											>
											<strong
												style="color: var(--accent-hover); font-family: monospace; font-size: 1rem;"
												>{user.phone}</strong
											>
										</div>
									</div>

									<div
										style="display: flex; align-items: center; gap: 0.6rem;"
									>
										<MapPin
											size={16}
											style="color: var(--text-muted);"
										/>
										<div>
											<span
												style="font-size: 0.75rem; color: var(--text-muted); display: block;"
												>City/Municipality</span
											>
											<strong
												style="color: var(--text-primary);"
												>{user.address}</strong
											>
										</div>
									</div>

									{#if user.created_at}
										<div
											style="display: flex; align-items: center; gap: 0.6rem;"
										>
											<Calendar
												size={16}
												style="color: var(--text-muted);"
											/>
											<div>
												<span
													style="font-size: 0.75rem; color: var(--text-muted); display: block;"
													>Member Since</span
												>
												<strong
													style="color: var(--text-secondary);"
												>
													{new Date(
														user.created_at,
													).toLocaleDateString(
														"en-PH",
														{
															month: "long",
															year: "numeric",
														},
													)}
												</strong>
											</div>
										</div>
									{/if}
								</div>
							</div>

							<!-- Account Performance Summary Box -->
							<div
								class="card"
								style="padding: 1.25rem; background: var(--bg-input); display: flex; flex-direction: column; justify-content: space-between;"
							>
								<div>
									<h4
										style="font-size: 1rem; margin-bottom: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;"
									>
										<Award
											size={16}
											style="color: var(--warning);"
										/> Account Performance
									</h4>

									{#if user.role === "worker"}
										<div
											style="display: flex; flex-direction: column; gap: 0.75rem;"
										>
											<div
												style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;"
											>
												<span
													style="color: var(--text-secondary); font-size: 0.85rem;"
													>Overall Rating Score:</span
												>
												<span
													class="rating-badge {stats.average_rating >
													0
														? 'rating-badge-positive'
														: stats.average_rating <
															  0
															? 'rating-badge-negative'
															: 'rating-badge-zero'}"
												>
													<Star
														size={12}
														fill="currentColor"
													/>
													{stats.average_rating > 0
														? `+${stats.average_rating}`
														: stats.average_rating}
												</span>
											</div>
											<div
												style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;"
											>
												<span
													style="color: var(--text-secondary); font-size: 0.85rem;"
													>Total Reviews Received:</span
												>
												<strong
													style="color: var(--text-primary);"
													>{stats.total_reviews || 0} reviews</strong
												>
											</div>
											<div
												style="display: flex; justify-content: space-between; align-items: center;"
											>
												<span
													style="color: var(--text-secondary); font-size: 0.85rem;"
													>Completed Sideline Tasks:</span
												>
												<strong
													style="color: var(--success);"
													>{stats.completed_jobs_count ||
														0} completed</strong
												>
											</div>
										</div>
									{:else}
										<div
											style="display: flex; flex-direction: column; gap: 0.75rem;"
										>
											<div
												style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;"
											>
												<span
													style="color: var(--text-secondary); font-size: 0.85rem;"
													>Total Jobs Posted:</span
												>
												<strong
													style="color: var(--text-primary);"
													>{stats.total_posts_count ||
														0} job posts</strong
												>
											</div>
											<div
												style="display: flex; justify-content: space-between; align-items: center;"
											>
												<span
													style="color: var(--text-secondary); font-size: 0.85rem;"
													>Successfully Completed:</span
												>
												<strong
													style="color: var(--success);"
													>{stats.completed_jobs_count ||
														0} finished</strong
												>
											</div>
										</div>
									{/if}
								</div>

								{#if onopenchat && !isSelf}
									<div style="margin-top: 1.5rem;">
										<button
											type="button"
											class="btn btn-primary"
											style="width: 100%; padding: 0.65rem;"
											onclick={handleMessageClick}
										>
											<MessageSquare size={16} /> Send Direct
											Message
										</button>
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<!-- TAB 2: REVIEWS & FEEDBACK (FOR WORKERS) -->
					{#if activeTab === "reviews" && user.role === "worker"}
						<div
							style="display: flex; flex-direction: column; gap: 1rem;"
						>
							{#if !stats.reviews || stats.reviews.length === 0}
								<div
									class="card"
									style="text-align: center; padding: 3rem 1.5rem; border-style: dashed; background: var(--bg-input);"
								>
									<h4
										style="font-size: 1.1rem; margin-bottom: 0.35rem;"
									>
										No reviews yet
									</h4>
									<p
										style="color: var(--text-secondary); font-size: 0.85rem;"
									>
										This worker has not received any
										feedback ratings yet.
									</p>
								</div>
							{:else}
								{@const sortedReviews = [...stats.reviews].sort(
									(a, b) =>
										new Date(b.created_at).getTime() -
										new Date(a.created_at).getTime(),
								)}
								{#each sortedReviews as rev (rev.id)}
									<div
										class="card"
										style="padding: 1rem 1.25rem; background: var(--bg-input); display: flex; flex-direction: column; gap: 0.5rem;"
									>
										<div
											style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;"
										>
											<div
												style="display: flex; align-items: center; gap: 0.5rem;"
											>
												<strong
													style="color: var(--text-primary); font-size: 0.95rem;"
													>{rev.customer_name}</strong
												>
												<span
													style="font-size: 0.75rem; color: var(--text-muted);"
												>
													{new Date(
														rev.created_at,
													).toLocaleDateString(
														"en-PH",
														{
															month: "short",
															day: "numeric",
															year: "numeric",
														},
													)}
												</span>
											</div>
											<span
												class="rating-badge {rev.rating >
												0
													? 'rating-badge-positive'
													: rev.rating < 0
														? 'rating-badge-negative'
														: 'rating-badge-zero'}"
											>
												<Star
													size={11}
													fill="currentColor"
												/>
												{rev.rating > 0
													? `+${rev.rating}`
													: rev.rating} Star{Math.abs(
													rev.rating,
												) === 1
													? ""
													: "s"}
											</span>
										</div>
										<p
											style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; font-style: italic;"
										>
											"{rev.review_text}"
										</p>
									</div>
								{/each}
							{/if}
						</div>
					{/if}

					<!-- TAB 3: SERVICE / JOB HISTORY -->
					{#if activeTab === "history"}
						<div
							style="display: flex; flex-direction: column; gap: 1rem;"
						>
							{#if user.role === "customer"}
								<!-- Sub-tabs header for customer modal view -->
								<div
									class="tabs-header"
									style="margin-bottom: 0.25rem;"
								>
									<button
										type="button"
										class="tab-btn {customerSubTab ===
										'posted'
											? 'active'
											: ''}"
										onclick={() =>
											(customerSubTab = "posted")}
										style="display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; padding: 0.4rem 0.75rem;"
									>
										<ClipboardList size={14} /> Job Posted ({allPosts.length})
									</button>
									<button
										type="button"
										class="tab-btn {customerSubTab ===
										'completed'
											? 'active'
											: ''}"
										onclick={() =>
											(customerSubTab = "completed")}
										style="display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; padding: 0.4rem 0.75rem;"
									>
										<CheckCircle2 size={14} /> Completed Jobs
										({completedJobs.length})
									</button>
								</div>

								{#if customerSubTab === "posted"}
									{#if allPosts.length === 0}
										<div
											class="card"
											style="text-align: center; padding: 3rem 1.5rem; border-style: dashed; background: var(--bg-input);"
										>
											<h4
												style="font-size: 1.1rem; margin-bottom: 0.35rem;"
											>
												No jobs posted yet
											</h4>
											<p
												style="color: var(--text-secondary); font-size: 0.85rem;"
											>
												This customer has not posted any
												jobs yet.
											</p>
										</div>
									{:else}
										{#each allPosts as job (job.id)}
											<div
												class="card"
												style="padding: 1rem 1.25rem; background: var(--bg-input); display: flex; flex-direction: column; gap: 0.5rem;"
											>
												<div
													style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;"
												>
													<div>
														<h4
															style="font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.25rem;"
														>
															{job.title}
														</h4>
														<div
															style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;"
														>
															<span
																class="badge {getCategoryBadge(
																	job.category,
																)}"
																style="font-size: 0.7rem;"
																>{job.category}</span
															>
															{#if job.status === "completed"}
																<span
																	class="status status-completed"
																	style="font-size: 0.7rem; padding: 0.1rem 0.4rem;"
																	>Completed</span
																>
															{:else if job.status === "in_progress"}
																<span
																	class="status status-in-progress"
																	style="font-size: 0.7rem; padding: 0.1rem 0.4rem;"
																	>In Progress</span
																>
															{:else}
																<span
																	class="status status-open"
																	style="font-size: 0.7rem; padding: 0.1rem 0.4rem;"
																	>Open</span
																>
															{/if}
															{#if job.created_at}
																<span
																	style="font-size: 0.7rem; color: var(--text-muted);"
																>
																	Posted: {new Date(
																		job.created_at,
																	).toLocaleDateString(
																		"en-PH",
																		{
																			month: "short",
																			day: "numeric",
																			year: "numeric",
																			hour: "numeric",
																			minute: "2-digit",
																		},
																	)}
																</span>
															{/if}
														</div>
													</div>
													<strong
														style="color: var(--accent); font-size: 1.1rem;"
														>₱{job.budget?.toLocaleString()}</strong
													>
												</div>
												<p
													style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.45;"
												>
													{job.description}
												</p>
												<div
													style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between; margin-top: 0.25rem; border-top: 1px solid var(--border-color); padding-top: 0.5rem;"
												>
													<span
														>Location: {job.location}</span
													>
													{#if job.assignedWorker}
														<span
															>Worker: <strong
																style="color: var(--text-primary);"
																>{job
																	.assignedWorker
																	.name}</strong
															></span
														>
													{/if}
												</div>
											</div>
										{/each}
									{/if}
								{:else if customerSubTab === "completed"}
									{#if completedJobs.length === 0}
										<div
											class="card"
											style="text-align: center; padding: 3rem 1.5rem; border-style: dashed; background: var(--bg-input);"
										>
											<h4
												style="font-size: 1.1rem; margin-bottom: 0.35rem;"
											>
												No completed jobs recorded
											</h4>
											<p
												style="color: var(--text-secondary); font-size: 0.85rem;"
											>
												No completed job transactions
												recorded for this customer
												profile.
											</p>
										</div>
									{:else}
										{#each completedJobs as job (job.id)}
											<div
												class="card"
												style="padding: 1rem 1.25rem; background: var(--bg-input); display: flex; flex-direction: column; gap: 0.5rem;"
											>
												<div
													style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;"
												>
													<div>
														<h4
															style="font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.25rem;"
														>
															{job.title}
														</h4>
														<span
															class="badge {getCategoryBadge(
																job.category,
															)}"
															style="font-size: 0.7rem;"
															>{job.category}</span
														>
													</div>
													<strong
														style="color: var(--accent); font-size: 1.1rem;"
														>₱{job.budget?.toLocaleString()}</strong
													>
												</div>
												<p
													style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.45;"
												>
													{job.description}
												</p>

												<div
													style="border-top: 1px solid var(--border-color); padding-top: 0.5rem; margin-top: 0.25rem; display: flex; flex-direction: column; gap: 0.35rem;"
												>
													<div
														style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;"
													>
														<span
															>Completed by: <strong
																style="color: var(--text-primary);"
																>{job
																	.assignedWorker
																	?.name ||
																	"Worker"}</strong
															></span
														>
														{#if job.review}
															<span
																class="rating-badge {job
																	.review
																	.rating > 0
																	? 'rating-badge-positive'
																	: job.review
																				.rating <
																		  0
																		? 'rating-badge-negative'
																		: 'rating-badge-zero'}"
																style="font-size: 0.75rem; padding: 0.1rem 0.4rem;"
															>
																<Star
																	size={11}
																	fill="currentColor"
																/> Rating Given:
																{job.review
																	.rating > 0
																	? `+${job.review.rating}`
																	: job.review
																			.rating}
																Star{Math.abs(
																	job.review
																		.rating,
																) === 1
																	? ""
																	: "s"}
															</span>
														{/if}
													</div>

													{#if job.review && job.review.review_text}
														<div
															style="background: hsla(222, 20%, 14%, 0.6); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.82rem; color: var(--text-secondary); font-style: italic;"
														>
															"{job.review
																.review_text}"
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
									<div
										class="card"
										style="text-align: center; padding: 3rem 1.5rem; border-style: dashed; background: var(--bg-input);"
									>
										<h4
											style="font-size: 1.1rem; margin-bottom: 0.35rem;"
										>
											No completed jobs recorded
										</h4>
										<p
											style="color: var(--text-secondary); font-size: 0.85rem;"
										>
											No past completed job records found
											for this profile.
										</p>
									</div>
								{:else}
									{#each completedJobs as job (job.id)}
										<div
											class="card"
											style="padding: 1rem 1.25rem; background: var(--bg-input); display: flex; flex-direction: column; gap: 0.5rem;"
										>
											<div
												style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;"
											>
												<div>
													<h4
														style="font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.25rem;"
													>
														{job.title}
													</h4>
													<span
														class="badge {getCategoryBadge(
															job.category,
														)}"
														style="font-size: 0.7rem;"
														>{job.category}</span
													>
												</div>
												<strong
													style="color: var(--accent); font-size: 1.1rem;"
													>₱{job.budget?.toLocaleString()}</strong
												>
											</div>
											<p
												style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.45;"
											>
												{job.description}
											</p>
											<div
												style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between; margin-top: 0.25rem; border-top: 1px solid var(--border-color); padding-top: 0.5rem;"
											>
												<span
													>Location: {job.location}</span
												>
												<span
													style="color: var(--success); display: inline-flex; align-items: center; gap: 0.25rem;"
												>
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
				<div
					style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); background: hsla(222, 20%, 10%, 0.6); display: flex; justify-content: flex-end; gap: 0.75rem;"
				>
					<button
						type="button"
						class="btn btn-secondary"
						onclick={closeModal}
					>
						Close Profile
					</button>
					{#if onopenchat && !isSelf}
						<button
							type="button"
							class="btn btn-primary"
							onclick={handleMessageClick}
						>
							<MessageSquare size={15} /> Open Message Chat
						</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.close-modal-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 10;
		transition: all var(--transition-fast);
	}
	.close-modal-btn:hover {
		background: rgba(255, 255, 255, 0.2);
		transform: scale(1.08);
	}
	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--border-color);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
