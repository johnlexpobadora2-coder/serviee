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
		Eye
	} from "lucide-svelte";
	import AvatarViewerModal from "$lib/AvatarViewerModal.svelte";

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
	let showAvatarViewer = $state(false);

	$effect(() => {
		if (show && userId) {
			fetchUserProfile(userId);
		} else if (!show) {
			profileData = null;
			error = "";
			activeTab = "overview";
		}
	});

	$effect(() => {
		if (show) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
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
		class="fixed inset-0 w-screen h-screen bg-black/75 backdrop-blur-sm flex items-center justify-center max-sm:items-end z-99999 p-4 max-sm:p-0 box-border"
		onclick={handleBackdropClick}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === "Escape" && closeModal()}
	>
		<div 
			class="max-w-180 w-full max-h-[90vh] max-sm:max-h-[92dvh] max-sm:h-[92dvh] overflow-hidden rounded-lg max-sm:rounded-t-2xl max-sm:rounded-b-none bg-(--bg-card) border border-(--border-color) max-sm:border-b-0 shadow-[0_20px_45px_rgba(0,0,0,0.5)] relative box-border flex flex-col"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			tabindex="-1"
			aria-modal="true"
		>
			<!-- Close Button Floating Header -->
			<button
				type="button"
				class="absolute top-3 right-3 bg-slate-900/70 backdrop-blur-md border border-white/20 text-white w-8 h-8 rounded-full flex items-center justify-center cursor-pointer z-30 transition-all duration-200 hover:bg-slate-900/90 hover:scale-105 active:scale-95 shadow-md"
				onclick={closeModal}
				aria-label="Close modal"
			>
				<X size={18} />
			</button>

			{#if loading}
				<div class="py-20 px-8 text-center text-(--text-secondary) flex-1 flex flex-col items-center justify-center">
					<div class="spinner spinner-accent spinner-lg mb-4"></div>
					<p class="text-[0.95rem] m-0">Loading user profile details...</p>
				</div>
			{:else if error}
				<div class="py-16 px-8 text-center text-(--error) flex-1 flex flex-col items-center justify-center">
					<h4 class="text-[1.2rem] mb-2 font-bold">Unable to load profile</h4>
					<p class="text-[0.9rem] mb-6 text-(--text-secondary) max-w-90">{error}</p>
					<button
						type="button"
						class="btn btn-secondary"
						onclick={closeModal}>Close</button
					>
				</div>
			{:else if profileData && profileData.user}
				{@const user = profileData.user}
				{@const stats = profileData.stats || {}}
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

				<!-- Scrollable Content Area -->
				<div class="flex-1 overflow-y-auto overflow-x-hidden">
					<!-- Header Cover & Avatar Section -->
					<div class="relative bg-(--bg-card)">
						<!-- Cover Banner -->
						<div class="h-28 sm:h-32 bg-linear-to-r from-slate-900 via-indigo-950 to-purple-950 relative overflow-hidden">
							<div class="absolute -right-10 -bottom-10 w-36 h-36 bg-purple-500/15 rounded-full blur-2xl pointer-events-none"></div>
							<div class="absolute -left-10 -top-10 w-36 h-36 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none"></div>
						</div>

						<!-- Profile Info Area -->
						<div class="px-5 sm:px-6 pb-4 relative">
							<!-- Main Row -->
							<div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
								<!-- Left: Avatar + Identity Info -->
								<div class="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-4 min-w-0 w-full sm:w-auto text-center sm:text-left">
									<!-- Avatar with negative margin so ONLY the avatar overlaps the cover -->
									{#if user.avatar}
										<button 
											type="button" 
											class="-mt-10 sm:-mt-12 w-20 h-20 sm:w-22 sm:h-22 rounded-full border-4 border-(--bg-card) bg-linear-to-br from-(--accent) via-purple-600 to-indigo-700 flex items-center justify-center text-[1.85rem] sm:text-[2.2rem] font-extrabold text-white shadow-xl ring-1 ring-black/5 dark:ring-white/10 shrink-0 select-none z-2 overflow-hidden cursor-pointer group focus:outline-none focus:ring-2 focus:ring-(--accent)"
											onclick={() => showAvatarViewer = true}
											title="Click to view photo"
											aria-label="View full size profile photo"
										>
											<img src={user.avatar} alt={user.name} class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
											<div class="absolute inset-0 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
												<Eye size={22} class="drop-shadow-md" />
											</div>
										</button>
									{:else}
										<div class="-mt-10 sm:-mt-12 w-20 h-20 sm:w-22 sm:h-22 rounded-full border-4 border-(--bg-card) bg-linear-to-br from-(--accent) via-purple-600 to-indigo-700 flex items-center justify-center text-[1.85rem] sm:text-[2.2rem] font-extrabold text-white shadow-xl ring-1 ring-black/5 dark:ring-white/10 shrink-0 select-none z-2 overflow-hidden">
											{user.name ? user.name.charAt(0).toUpperCase() : "U"}
										</div>
									{/if}

									<!-- User Name and meta badges (placed safely below banner in the card body) -->
									<div class="pt-0.5 sm:pt-0 pb-1 flex flex-col items-center sm:items-start gap-1.5 min-w-0 flex-1 w-full">
										<div class="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
											<h2 class="text-[1.25rem] sm:text-[1.4rem] font-bold leading-tight m-0 text-(--text-primary) wrap-break-word">
												{user.name}
											</h2>
											{#if isSelf}
												<span class="text-[0.68rem] font-semibold py-0.5 px-2 bg-(--accent-light) text-(--accent-hover) rounded-full">You</span>
											{/if}
										</div>

										<div class="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
											<span
												class="badge {user.role === 'worker'
													? 'badge-gardening'
													: 'badge-roofing'} text-[0.72rem] py-0.5 px-2"
											>
												{user.role === "worker"
													? "Worker"
													: "Client"}
											</span>
											{#if user.role === "worker"}
												{#if user.availability_status === 'busy'}
													<span class="bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[0.72rem] inline-flex items-center gap-1 py-0.5 px-2 rounded-full font-medium">
														<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
														Busy
													</span>
												{:else}
													<span class="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[0.72rem] inline-flex items-center gap-1 py-0.5 px-2 rounded-full font-medium">
														<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.25)]"></span>
														Available
													</span>
												{/if}
											{/if}
											{#if user.address}
												<span class="text-[0.76rem] text-(--text-muted) inline-flex items-center gap-1">
													<MapPin size={12} class="shrink-0 text-sky-400" />
													<span class="truncate max-w-50">{user.address}</span>
												</span>
											{/if}
										</div>
									</div>
								</div>

								<!-- Right / Bottom: Quick Stat Cards -->
								<div class="flex gap-2 items-center shrink-0 max-sm:w-full max-sm:grid max-sm:grid-cols-2 pt-1 sm:pt-0">
									{#if user.role === "worker"}
										<div class="flex flex-col items-center justify-center bg-(--bg-input) border border-(--border-color) py-2 px-3.5 rounded-md min-w-22.5 max-sm:min-w-0 transition-colors">
											<span
												class="rating-badge {stats.average_rating >
												0
													? 'rating-badge-positive'
													: stats.average_rating < 0
														? 'rating-badge-negative'
														: 'rating-badge-zero'} text-[0.75rem]"
											>
												<Star
													size={11}
													fill="currentColor"
												/>
												{stats.average_rating > 0
													? `+${stats.average_rating}`
													: stats.average_rating || 0}
											</span>
											<span class="text-[0.62rem] text-(--text-muted) font-semibold uppercase tracking-wider mt-1">Rating</span>
										</div>
										<div class="flex flex-col items-center justify-center bg-(--bg-input) border border-(--border-color) py-2 px-3.5 rounded-md min-w-22.5 max-sm:min-w-0 transition-colors">
											<span class="text-[1.15rem] max-sm:text-[1.05rem] font-extrabold text-(--success) leading-none">
												{stats.completed_jobs_count || 0}
											</span>
											<span class="text-[0.62rem] text-(--text-muted) font-semibold uppercase tracking-wider mt-1">Completed</span>
										</div>
									{:else}
										<div class="flex flex-col items-center justify-center bg-(--bg-input) border border-(--border-color) py-2 px-3.5 rounded-md min-w-22.5 max-sm:min-w-0 transition-colors">
											<span class="text-[1.15rem] max-sm:text-[1.05rem] font-extrabold text-(--text-primary) leading-none">
												{stats.total_posts_count || 0}
											</span>
											<span class="text-[0.62rem] text-(--text-muted) font-semibold uppercase tracking-wider mt-1">Total Posts</span>
										</div>
										<div class="flex flex-col items-center justify-center bg-(--bg-input) border border-(--border-color) py-2 px-3.5 rounded-md min-w-22.5 max-sm:min-w-0 transition-colors">
											<span class="text-[1.15rem] max-sm:text-[1.05rem] font-extrabold text-(--success) leading-none">
												{stats.completed_jobs_count || 0}
											</span>
											<span class="text-[0.62rem] text-(--text-muted) font-semibold uppercase tracking-wider mt-1">Done Jobs</span>
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>

					<!-- Sticky Navigation Tabs within Modal -->
					<div class="sticky top-0 z-20 pt-2 px-5 max-sm:px-3 bg-(--bg-card) border-y border-(--border-color) flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none tabs-header" style="margin-bottom: 0 !important;">
						<button
							type="button"
							class="tab-btn {activeTab === 'overview' ? 'active' : ''} text-[0.82rem] max-sm:text-[0.76rem] py-2 px-3 max-sm:py-1.5 max-sm:px-2.5 flex items-center gap-1.5"
							onclick={() => (activeTab = "overview")}
						>
							<UserCheck size={14} /> <span>About Profile</span>
						</button>
						{#if user.role === "worker"}
							<button
								type="button"
								class="tab-btn {activeTab === 'reviews' ? 'active' : ''} text-[0.82rem] max-sm:text-[0.76rem] py-2 px-3 max-sm:py-1.5 max-sm:px-2.5 flex items-center gap-1.5"
								onclick={() => (activeTab = "reviews")}
							>
								<Star size={14} fill="currentColor" /> <span>Reviews ({stats.total_reviews || 0})</span>
							</button>
						{/if}
						<button
							type="button"
							class="tab-btn {activeTab === 'history' ? 'active' : ''} text-[0.82rem] max-sm:text-[0.76rem] py-2 px-3 max-sm:py-1.5 max-sm:px-2.5 flex items-center gap-1.5"
							onclick={() => (activeTab = "history")}
						>
							<ClipboardList size={14} />
							<span>{user.role === "worker" ? "Service History" : "Job History"}</span>
						</button>
					</div>

					<!-- Tab Content Body Container -->
					<div class="p-5 max-sm:p-3.5 flex flex-col gap-4 max-sm:gap-3">
						<!-- TAB 1: OVERVIEW & CONTACT -->
						{#if activeTab === "overview"}
							<div class="grid grid-cols-2 max-sm:grid-cols-1 gap-3.5 max-sm:gap-3">
								<!-- Bio / About Me Card -->
								<div class="col-span-2 max-sm:col-span-1 bg-(--bg-input) border border-(--border-color) rounded-md p-4 max-sm:p-3">
									<h4 class="text-[0.92rem] font-semibold mb-2 text-(--text-primary) flex items-center gap-1.5">
										<FileText size={15} class="text-(--accent)" />
										About
									</h4>
									{#if user.bio && user.bio.trim()}
										<p class="text-(--text-primary) text-[0.85rem] leading-relaxed whitespace-pre-line m-0 bg-(--bg-card) p-3 rounded-sm border border-(--border-color) wrap-break-word">
											{user.bio.trim()}
										</p>
									{:else}
										<p class="text-(--text-muted) text-[0.82rem] italic m-0">
											No bio provided yet.
										</p>
									{/if}
								</div>

								{#if user.role === "worker"}
									<!-- Skills & Services Offered Card -->
									<div class="col-span-2 max-sm:col-span-1 bg-(--bg-input) border border-(--border-color) rounded-md p-4 max-sm:p-3">
										<div class="flex items-center justify-between flex-wrap gap-1.5 mb-2">
											<h4 class="text-[0.92rem] font-semibold text-(--text-primary) flex items-center gap-1.5 m-0">
												<Wrench size={15} class="text-(--accent)" />
												Skills & Services Offered
											</h4>
											{#if user.skills && user.skills.length > 0}
												<span class="text-[0.7rem] text-(--accent-hover) font-semibold bg-(--accent-light) py-0.5 px-2 rounded-full">
													{user.skills.length} {user.skills.length === 1 ? 'service' : 'services'}
												</span>
											{/if}
										</div>
										{#if user.skills && user.skills.length > 0}
											<div class="flex flex-wrap gap-1.5">
												{#each user.skills as skill}
													<span
														class="badge {getCategoryBadge(skill)} text-[0.75rem] py-0.5 px-2.5 rounded-full inline-flex items-center gap-1 font-medium"
													>
														<Check size={11} />
														{skill}
													</span>
												{/each}
											</div>
										{:else}
											<p class="text-(--text-muted) text-[0.82rem] italic m-0">
												No specific skills listed yet.
											</p>
										{/if}
									</div>
								{/if}

								<!-- Contact & Info Box -->
								<div class="col-span-1 max-sm:col-span-1 bg-(--bg-input) border border-(--border-color) rounded-md p-4 max-sm:p-3">
									<h4 class="text-[0.92rem] font-semibold mb-2.5 text-(--text-primary) flex items-center gap-1.5">
										<UserCheck size={15} class="text-(--accent)" />
										User Details
									</h4>
									<div class="flex flex-col gap-2.5">
										{#if user.role === "worker"}
											<div class="flex items-start gap-2">
												<Activity
													size={14}
													style="color: {user.availability_status === 'busy' ? '#f59e0b' : 'var(--success)'}; flex-shrink: 0;"
													class="mt-0.5"
												/>
												<div class="min-w-0 wrap-break-word flex flex-col">
													<span class="text-[0.68rem] text-(--text-muted)">Availability Status</span>
													<strong
														class="text-[0.82rem] font-semibold"
														style="color: {user.availability_status === 'busy' ? '#f59e0b' : 'var(--success)'};"
													>
														{user.availability_status === 'busy' ? 'Busy / On Leave' : 'Available for Jobs'}
													</strong>
												</div>
											</div>
										{/if}

										<div class="flex items-start gap-2">
											<Mail size={14} class="text-(--text-muted) shrink-0 mt-0.5" />
											<div class="min-w-0 break-all flex flex-col">
												<span class="text-[0.68rem] text-(--text-muted)">Email</span>
												<strong class="text-[0.82rem] text-(--text-primary) font-semibold">{user.email || "Not provided"}</strong>
											</div>
										</div>

										<div class="flex items-start gap-2">
											<Phone size={14} class="text-(--text-muted) shrink-0 mt-0.5" />
											<div class="min-w-0 wrap-break-word flex flex-col">
												<span class="text-[0.68rem] text-(--text-muted)">Phone Number</span>
												<strong class="text-[0.82rem] text-(--accent-hover) font-mono font-semibold">{user.phone || "Not provided"}</strong>
											</div>
										</div>

										<div class="flex items-start gap-2">
											<MapPin size={14} class="text-(--text-muted) shrink-0 mt-0.5" />
											<div class="min-w-0 wrap-break-word flex flex-col">
												<span class="text-[0.68rem] text-(--text-muted)">City / Municipality</span>
												<strong class="text-[0.82rem] text-(--text-primary) font-semibold">{user.address || "Not specified"}</strong>
											</div>
										</div>

										{#if user.created_at}
											<div class="flex items-start gap-2">
												<Calendar size={14} class="text-(--text-muted) shrink-0 mt-0.5" />
												<div class="min-w-0 wrap-break-word flex flex-col">
													<span class="text-[0.68rem] text-(--text-muted)">Member Since</span>
													<strong class="text-[0.82rem] text-(--text-secondary) font-medium">
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
								<div class="col-span-1 max-sm:col-span-1 bg-(--bg-input) border border-(--border-color) rounded-md p-4 max-sm:p-3 flex flex-col justify-between">
									<div>
										<h4 class="text-[0.92rem] font-semibold mb-2.5 text-(--text-primary) flex items-center gap-1.5">
											<Award size={15} class="text-(--warning)" />
											Account Performance
										</h4>

										{#if user.role === "worker"}
											<div class="flex flex-col gap-2">
												<div class="flex justify-between items-center gap-2 border-b border-(--border-color) pb-2">
													<span class="text-(--text-secondary) text-[0.78rem]">Rating Score:</span>
													<span
														class="rating-badge {stats.average_rating > 0
															? 'rating-badge-positive'
															: stats.average_rating < 0
																? 'rating-badge-negative'
																: 'rating-badge-zero'} text-[0.75rem]"
													>
														<Star size={10} fill="currentColor" />
														{stats.average_rating > 0
															? `+${stats.average_rating}`
															: stats.average_rating || 0}
													</span>
												</div>
												<div class="flex justify-between items-center gap-2 border-b border-(--border-color) pb-2">
													<span class="text-(--text-secondary) text-[0.78rem]">Total Reviews:</span>
													<strong class="text-(--text-primary) text-[0.82rem]">{stats.total_reviews || 0} reviews</strong>
												</div>
												<div class="flex justify-between items-center gap-2">
													<span class="text-(--text-secondary) text-[0.78rem]">Completed Tasks:</span>
													<strong class="text-(--success) text-[0.82rem]">{stats.completed_jobs_count || 0} completed</strong>
												</div>
											</div>
										{:else}
											<div class="flex flex-col gap-2">
												<div class="flex justify-between items-center gap-2 border-b border-(--border-color) pb-2">
													<span class="text-(--text-secondary) text-[0.78rem]">Total Jobs Posted:</span>
													<strong class="text-(--text-primary) text-[0.82rem]">{stats.total_posts_count || 0} jobs</strong>
												</div>
												<div class="flex justify-between items-center gap-2">
													<span class="text-(--text-secondary) text-[0.78rem]">Successfully Finished:</span>
													<strong class="text-(--success) text-[0.82rem]">{stats.completed_jobs_count || 0} finished</strong>
												</div>
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/if}

						<!-- TAB 2: REVIEWS & FEEDBACK (FOR WORKERS) -->
						{#if activeTab === "reviews" && user.role === "worker"}
							<div class="flex flex-col gap-3">
								{#if !stats.reviews || stats.reviews.length === 0}
									<div class="bg-(--bg-input) border border-dashed border-(--border-color) rounded-md text-center p-8">
										<h4 class="text-[0.95rem] text-(--text-primary) mb-1 font-semibold">No reviews yet</h4>
										<p class="text-(--text-secondary) text-[0.8rem] m-0">This worker has not received any feedback ratings yet.</p>
									</div>
								{:else}
									{@const sortedReviews = [...stats.reviews].sort(
										(a, b) =>
											new Date(b.created_at).getTime() -
											new Date(a.created_at).getTime(),
									)}
									{#each sortedReviews as rev (rev.id)}
										<div class="bg-(--bg-input) border border-(--border-color) rounded-md p-3.5 max-sm:p-3 flex flex-col gap-2">
											<div class="flex justify-between items-center gap-2 flex-wrap">
												<div class="flex items-center gap-1.5 flex-wrap">
													<strong class="text-(--text-primary) text-[0.86rem]">{rev.customer_name}</strong>
													<span class="text-[0.7rem] text-(--text-muted)">
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
															: 'rating-badge-zero'} text-[0.72rem]"
												>
													<Star size={10} fill="currentColor" />
													{rev.rating > 0 ? `+${rev.rating}` : rev.rating} Star{Math.abs(rev.rating) === 1 ? "" : "s"}
												</span>
											</div>
											{#if rev.review_text}
												<p class="text-[0.82rem] text-(--text-secondary) leading-relaxed italic m-0">
													"{rev.review_text}"
												</p>
											{/if}
										</div>
									{/each}
								{/if}
							</div>
						{/if}

						<!-- TAB 3: SERVICE / JOB HISTORY -->
						{#if activeTab === "history"}
							<div class="flex flex-col gap-3">
								{#if user.role === "customer"}
									<!-- Sub-tabs header for customer modal view -->
									<div class="mb-2 flex gap-1.5 border-b border-(--border-color) overflow-x-auto whitespace-nowrap scrollbar-none pt-1 tabs-header">
										<button
											type="button"
											class="tab-btn {customerSubTab === 'posted' ? 'active' : ''} text-[0.78rem] py-1.5 px-2.5"
											onclick={() => (customerSubTab = "posted")}
										>
											<ClipboardList size={13} /> Job Posted
										</button>
										<button
											type="button"
											class="tab-btn {customerSubTab === 'completed' ? 'active' : ''} text-[0.78rem] py-1.5 px-2.5"
											onclick={() => (customerSubTab = "completed")}
										>
											<CheckCircle2 size={13} /> Completed Jobs
										</button>
									</div>

									{#if customerSubTab === "posted"}
										{#if allPosts.length === 0}
											<div class="bg-(--bg-input) border border-dashed border-(--border-color) rounded-md text-center p-8">
												<h4 class="text-[0.95rem] text-(--text-primary) mb-1 font-semibold">No jobs posted yet</h4>
												<p class="text-(--text-secondary) text-[0.8rem] m-0">This customer has not posted any jobs yet.</p>
											</div>
										{:else}
											{#each allPosts as job (job.id)}
												<div class="bg-(--bg-input) border border-(--border-color) rounded-md p-3.5 max-sm:p-3 flex flex-col gap-2">
													<div class="flex justify-between items-start gap-2">
														<div class="min-w-0 flex-1">
															<h4 class="text-[0.9rem] text-(--text-primary) m-0 mb-1 font-semibold wrap-break-word leading-tight">{job.title}</h4>
															<div class="flex gap-1.5 items-center flex-wrap">
																<span class="badge {getCategoryBadge(job.category)} text-[0.66rem] py-0.5 px-1.5">
																	{job.category}
																</span>
																{#if job.status === "completed"}
																	<span class="status status-completed text-[0.66rem] py-0.5 px-1.5">Completed</span>
																{:else if job.status === "in_progress"}
																	<span class="status status-in-progress text-[0.66rem] py-0.5 px-1.5">In Progress</span>
																{:else}
																	<span class="status status-open text-[0.66rem] py-0.5 px-1.5">Open</span>
																{/if}
																{#if job.created_at}
																	<span class="text-[0.66rem] text-(--text-muted)">
																		{new Date(job.created_at).toLocaleDateString("en-PH", {
																			month: "short",
																			day: "numeric",
																			year: "numeric",
																		})}
																	</span>
																{/if}
															</div>
														</div>
														<strong class="text-(--accent) text-[0.95rem] whitespace-nowrap shrink-0">₱{Number(job.budget || 0).toLocaleString()}</strong>
													</div>
													{#if job.description}
														<p class="text-[0.8rem] text-(--text-secondary) leading-relaxed m-0 line-clamp-3">{job.description}</p>
													{/if}
													<div class="text-[0.72rem] text-(--text-muted) flex items-center justify-between mt-1 border-t border-(--border-color) pt-2 flex-wrap gap-1.5">
														<span class="inline-flex items-center gap-1 truncate"><MapPin size={11} class="text-sky-400 shrink-0" /> {job.location}</span>
														{#if job.assignedWorker}
															<span>Worker: <strong class="text-(--text-primary)">{job.assignedWorker.name}</strong></span>
														{/if}
													</div>
												</div>
											{/each}
										{/if}
									{:else if customerSubTab === "completed"}
										{#if completedJobs.length === 0}
											<div class="bg-(--bg-input) border border-dashed border-(--border-color) rounded-md text-center p-8">
												<h4 class="text-[0.95rem] text-(--text-primary) mb-1 font-semibold">No completed jobs recorded</h4>
												<p class="text-(--text-secondary) text-[0.8rem] m-0">No completed job transactions recorded for this customer profile.</p>
											</div>
										{:else}
											{#each completedJobs as job (job.id)}
												<div class="bg-(--bg-input) border border-(--border-color) rounded-md p-3.5 max-sm:p-3 flex flex-col gap-2">
													<div class="flex justify-between items-start gap-2">
														<div class="min-w-0 flex-1">
															<h4 class="text-[0.9rem] text-(--text-primary) m-0 mb-1 font-semibold wrap-break-word leading-tight">{job.title}</h4>
															<span class="badge {getCategoryBadge(job.category)} text-[0.66rem] py-0.5 px-1.5">
																{job.category}
															</span>
														</div>
														<strong class="text-(--accent) text-[0.95rem] whitespace-nowrap shrink-0">₱{Number(job.budget || 0).toLocaleString()}</strong>
													</div>
													{#if job.description}
														<p class="text-[0.8rem] text-(--text-secondary) leading-relaxed m-0 line-clamp-3">{job.description}</p>
													{/if}

													<div class="border-t border-(--border-color) pt-2 mt-1 flex flex-col gap-1.5">
														<div class="text-[0.72rem] text-(--text-muted) flex items-center justify-between flex-wrap gap-1.5">
															<span>Completed by: <strong class="text-(--text-primary)">{job.assignedWorker?.name || "Worker"}</strong></span>
															{#if job.review}
																<span
																	class="rating-badge {job.review.rating > 0
																		? 'rating-badge-positive'
																		: job.review.rating < 0
																			? 'rating-badge-negative'
																			: 'rating-badge-zero'} text-[0.68rem] py-0.5 px-1.5"
																>
																	<Star size={10} fill="currentColor" />
																	{job.review.rating > 0 ? `+${job.review.rating}` : job.review.rating} Star{Math.abs(job.review.rating) === 1 ? "" : "s"}
																</span>
															{/if}
														</div>

														{#if job.review && job.review.review_text}
															<div class="bg-(--bg-card) p-2 rounded-sm text-[0.76rem] text-(--text-secondary) italic border border-(--border-color)">
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
										<div class="bg-(--bg-input) border border-dashed border-(--border-color) rounded-md text-center p-8">
											<h4 class="text-[0.95rem] text-(--text-primary) mb-1 font-semibold">No completed jobs recorded</h4>
											<p class="text-(--text-secondary) text-[0.8rem] m-0">No past completed job records found for this profile.</p>
										</div>
									{:else}
										{#each completedJobs as job (job.id)}
											<div class="bg-(--bg-input) border border-(--border-color) rounded-md p-3.5 max-sm:p-3 flex flex-col gap-2">
												<div class="flex justify-between items-start gap-2">
													<div class="min-w-0 flex-1">
														<h4 class="text-[0.9rem] text-(--text-primary) m-0 mb-1 font-semibold wrap-break-word leading-tight">{job.title}</h4>
														<span class="badge {getCategoryBadge(job.category)} text-[0.66rem] py-0.5 px-1.5">
															{job.category}
														</span>
													</div>
													<strong class="text-(--accent) text-[0.95rem] whitespace-nowrap shrink-0">₱{Number(job.budget || 0).toLocaleString()}</strong>
												</div>
												{#if job.description}
													<p class="text-[0.8rem] text-(--text-secondary) leading-relaxed m-0 line-clamp-3">{job.description}</p>
												{/if}
												<div class="text-[0.72rem] text-(--text-muted) flex items-center justify-between mt-1 border-t border-(--border-color) pt-2 flex-wrap gap-1.5">
													<span class="inline-flex items-center gap-1 truncate"><MapPin size={11} class="text-sky-400 shrink-0" /> {job.location}</span>
													<span class="text-(--success) inline-flex items-center gap-1 font-medium">
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
				</div>

				<!-- Fixed Modal Footer Actions -->
				<div class="p-3.5 max-sm:p-3 border-t border-(--border-color) bg-(--bg-card) flex justify-end max-sm:flex-col-reverse gap-2 shrink-0">
					<button
						type="button"
						class="btn btn-secondary text-[0.85rem] py-2.5 px-4 max-sm:w-full justify-center inline-flex items-center gap-1.5"
						onclick={closeModal}
					>
						Close Profile
					</button>
					{#if canChat}
						<button
							type="button"
							class="btn btn-primary text-[0.85rem] py-2.5 px-4 max-sm:w-full justify-center inline-flex items-center gap-1.5 shadow-md"
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

<AvatarViewerModal 
	isOpen={showAvatarViewer} 
	imageUrl={profileData?.user?.avatar} 
	title={profileData?.user?.name || 'Profile Photo'} 
	onclose={() => showAvatarViewer = false} 
/>

