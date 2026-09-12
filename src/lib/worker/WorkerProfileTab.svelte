<script>
	import { 
		Star, 
		ClipboardList, 
		Check, 
		Mail, 
		Phone, 
		MapPin, 
		Wrench, 
		User as UserIcon, 
		Activity, 
		FileText, 
		Settings, 
		RefreshCw 
	} from 'lucide-svelte';

	let { 
		user = {}, 
		stats = {}, 
		completedJobs = [], 
		profileSubTab = $bindable('history') 
	} = $props();

	let updatingAvailability = $state(false);
	// svelte-ignore state_referenced_locally
	let availabilityStatus = $state(user?.availability_status || 'available');

	$effect(() => {
		if (user?.availability_status) {
			availabilityStatus = user.availability_status;
		}
	});

	async function toggleAvailability() {
		if (updatingAvailability) return;
		const nextStatus = availabilityStatus === 'available' ? 'busy' : 'available';
		const prevStatus = availabilityStatus;
		availabilityStatus = nextStatus;
		updatingAvailability = true;

		try {
			const res = await fetch('/api/user/availability', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ availability_status: nextStatus })
			});

			if (!res.ok) {
				throw new Error('Failed to update availability');
			}
			const result = await res.json();
			if (result.availability_status) {
				availabilityStatus = result.availability_status;
				user.availability_status = result.availability_status;
			}
		} catch (err) {
			console.error('Error toggling availability:', err);
			availabilityStatus = prevStatus;
		} finally {
			updatingAvailability = false;
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

<div class="profile-container">
	<!-- Cover Banner & Header Card -->
	<div class="profile-header-card">
		<div class="profile-cover-banner"></div>
		<div class="profile-header-content">
			<div class="profile-header-row">
				<!-- Left Side: Avatar + Name + Role Badge + Availability Badge -->
				<div class="profile-user-left">
					<div class="profile-avatar-wrapper">
						{user?.name ? user.name.charAt(0).toUpperCase() : "W"}
					</div>
					<div class="profile-user-text">
						<h2>{user?.name}</h2>
						<div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
							<span class="badge badge-gardening" style="font-size: 0.78rem; display: inline-flex; align-items: center; gap: 0.35rem;">
								<Wrench size={13} /> Worker Account
							</span>

							<!-- Live Availability Badge -->
							{#if availabilityStatus === 'busy'}
								<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); font-size: 0.76rem; display: inline-flex; align-items: center; gap: 0.35rem;">
									<span style="width: 7px; height: 7px; border-radius: 50%; background: #f59e0b;"></span>
									Busy / On Leave
								</span>
							{:else}
								<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 0.76rem; display: inline-flex; align-items: center; gap: 0.35rem;">
									<span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981; box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);"></span>
									Available for Jobs
								</span>
							{/if}

							{#if user?.address}
								<span style="font-size: 0.8rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 0.25rem;">
									<MapPin size={13} style="color: var(--accent);" />
									{user.address}
								</span>
							{/if}
						</div>
					</div>
				</div>

				<!-- Right Side: Stat Numbers (Tasks Completed & Star Rating) -->
				<div class="profile-stats-group">
					<div class="profile-stat-item">
						<span class="profile-stat-value" style="color: var(--success);">
							{stats?.completed_jobs_count || 0}
						</span>
						<span class="profile-stat-label">Tasks Completed</span>
					</div>
					<div class="profile-stat-item">
						<span
							class="rating-badge {stats?.average_rating > 0
								? 'rating-badge-positive'
								: stats?.average_rating < 0
									? 'rating-badge-negative'
									: 'rating-badge-zero'}"
							style="font-size: 1.05rem; padding: 0.25rem 0.65rem; display: inline-flex; align-items: center; gap: 0.25rem;"
						>
							<Star size={13} fill="currentColor" /> {stats?.average_rating > 0
								? `+${stats.average_rating}`
								: stats?.average_rating || "0"}
						</span>
						<span class="profile-stat-label" style="margin-top: 0.2rem;">Total Rating</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Main 2-Column Grid -->
	<div class="profile-main-grid">
		<!-- Left Column: Availability Quick Switch + Details + Bio + Skills -->
		<aside style="display: flex; flex-direction: column; gap: 1.25rem;">
			<!-- Quick Availability Toggle Card -->
			<div class="card" style="padding: 1.25rem; background: var(--bg-card); border: 1.5px solid {availabilityStatus === 'available' ? 'var(--success)' : '#f59e0b'};">
				<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
					<h4 style="font-size: 0.95rem; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;">
						<Activity size={16} style="color: {availabilityStatus === 'available' ? 'var(--success)' : '#f59e0b'};" />
						Job Availability
					</h4>
					<span style="font-size: 0.75rem; font-weight: 600; color: {availabilityStatus === 'available' ? 'var(--success)' : '#f59e0b'};">
						{availabilityStatus === 'available' ? 'Available' : 'Busy'}
					</span>
				</div>
				<p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.85rem; line-height: 1.4;">
					{availabilityStatus === 'available' 
						? 'Aktibo kang tumatanggap ng mga bagong trabaho. Makikita ka ng mga kliyente bilang Available.' 
						: 'Naka-set ka bilang Busy o On Leave. Hindi ka muna bibigyan ng bagong direct tasks.'}
				</p>
				<button
					type="button"
					class="btn {availabilityStatus === 'available' ? 'btn-outline' : 'btn-primary'}"
					style="width: 100%; padding: 0.5rem; font-size: 0.82rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;"
					onclick={toggleAvailability}
					disabled={updatingAvailability}
				>
					{#if updatingAvailability}
						<span class="spinner spinner-sm" style="width: 12px; height: 12px;"></span>
						<span>Updating...</span>
					{:else if availabilityStatus === 'available'}
						<span>Switch to "Busy / On Leave"</span>
					{:else}
						<span>Switch to "Available for Jobs"</span>
					{/if}
				</button>
			</div>

			<!-- Bio / About Me Card -->
			<div class="card" style="padding: 1.25rem;">
				<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
					<h4 style="font-size: 1.05rem; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;">
						<FileText size={16} style="color: var(--accent);" />
						Bio / About Me
					</h4>
					<a href="/settings" style="font-size: 0.78rem; color: var(--accent-hover); display: inline-flex; align-items: center; gap: 0.25rem; text-decoration: none; font-weight: 500;">
						Edit
					</a>
				</div>
				{#if user?.bio && user.bio.trim()}
					<p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; margin: 0; white-space: pre-line; background: var(--bg-input); padding: 0.75rem 0.85rem; border-radius: var(--radius-md);">
						{user.bio.trim()}
					</p>
				{:else}
					<div style="text-align: center; padding: 1rem; background: var(--bg-input); border-radius: var(--radius-md);">
						<p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.5rem;">
							Wala ka pang nilalagay na bio o pagpapakilala.
						</p>
						<a href="/settings" class="btn btn-secondary btn-sm" style="font-size: 0.78rem; padding: 0.25rem 0.6rem;">
							+ Maglagay ng Bio
						</a>
					</div>
				{/if}
			</div>

			<!-- Skills & Services Offered Card -->
			<div class="card" style="padding: 1.25rem;">
				<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
					<h4 style="font-size: 1.05rem; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;">
						<Wrench size={16} style="color: var(--accent);" />
						Skills & Services
					</h4>
					<a href="/settings" style="font-size: 0.78rem; color: var(--accent-hover); display: inline-flex; align-items: center; gap: 0.25rem; text-decoration: none; font-weight: 500;">
						Edit
					</a>
				</div>
				{#if user?.skills && user.skills.length > 0}
					<div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
						{#each user.skills as skill}
							<span class="badge {getCategoryBadge(skill)}" style="font-size: 0.78rem; padding: 0.25rem 0.6rem; border-radius: var(--radius-full); display: inline-flex; align-items: center; gap: 0.3rem;">
								<Check size={11} /> {skill}
							</span>
						{/each}
					</div>
				{:else}
					<div style="text-align: center; padding: 1rem; background: var(--bg-input); border-radius: var(--radius-md);">
						<p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.5rem;">
							Wala ka pang napipiling skills o serbisyo.
						</p>
						<a href="/settings" class="btn btn-secondary btn-sm" style="font-size: 0.78rem; padding: 0.25rem 0.6rem;">
							+ Pumili ng Skills
						</a>
					</div>
				{/if}
			</div>

			<!-- Worker Account Details -->
			<div class="card" style="padding: 1.25rem;">
				<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
					<h4 style="font-size: 1.05rem; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
						<UserIcon size={17} style="color: var(--accent);" />
						Account Details
					</h4>
					<a href="/settings" style="font-size: 0.78rem; color: var(--accent-hover); display: inline-flex; align-items: center; gap: 0.25rem; text-decoration: none; font-weight: 500;">
						<Settings size={13} /> Settings
					</a>
				</div>
				<div style="display: flex; flex-direction: column; gap: 1rem; font-size: 0.9rem;">
					<div style="display: flex; align-items: flex-start; gap: 0.65rem;">
						<Mail size={16} style="color: var(--text-muted); margin-top: 0.2rem; flex-shrink: 0;" />
						<div style="min-width: 0; word-break: break-all;">
							<span style="color: var(--text-muted); font-size: 0.75rem; display: block; text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em;">Email Address</span>
							<strong style="color: var(--text-primary); font-size: 0.88rem;">{user?.email || '—'}</strong>
						</div>
					</div>
					<div style="display: flex; align-items: flex-start; gap: 0.65rem;">
						<Phone size={16} style="color: var(--text-muted); margin-top: 0.2rem; flex-shrink: 0;" />
						<div>
							<span style="color: var(--text-muted); font-size: 0.75rem; display: block; text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em;">Phone Number</span>
							<strong style="color: var(--text-primary); font-size: 0.88rem;">{user?.phone || '—'}</strong>
						</div>
					</div>
					<div style="display: flex; align-items: flex-start; gap: 0.65rem;">
						<MapPin size={16} style="color: var(--text-muted); margin-top: 0.2rem; flex-shrink: 0;" />
						<div>
							<span style="color: var(--text-muted); font-size: 0.75rem; display: block; text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em;">City / Municipality</span>
							<strong style="color: var(--text-primary); font-size: 0.88rem;">{user?.address || '—'}</strong>
						</div>
					</div>
				</div>
			</div>
		</aside>

		<!-- Right Column: Service History & Feedback Sub-tabs -->
		<section style="display: flex; flex-direction: column; gap: 1.25rem; min-width: 0; width: 100%;">
			<!-- Sub-tabs header nav matching main tabs design -->
			<div class="tabs-header" style="margin-bottom: 0.5rem;">
				<button
					type="button"
					class="tab-btn {profileSubTab === 'history' ? 'active' : ''}"
					onclick={() => (profileSubTab = "history")}
					id="subtab-history-btn"
					style="display: inline-flex; align-items: center; gap: 0.4rem;"
				>
					<ClipboardList size={16} /> Service History ({completedJobs?.length || 0})
				</button>
				<button
					type="button"
					class="tab-btn {profileSubTab === 'reviews' ? 'active' : ''}"
					onclick={() => (profileSubTab = "reviews")}
					id="subtab-reviews-btn"
					style="display: inline-flex; align-items: center; gap: 0.4rem;"
				>
					<Star size={16} fill="currentColor" /> Reviews & Feedback ({stats?.reviews?.length || 0})
				</button>
			</div>

			{#if profileSubTab === "history"}
				<!-- TAB 1: SERVICE HISTORY -->
				{#if !completedJobs || completedJobs.length === 0}
					<div class="card" style="text-align: center; padding: 3.5rem 2rem; border-style: dashed;">
						<h4 style="font-size: 1.15rem; margin-bottom: 0.5rem;">
							No service history yet.
						</h4>
						<p style="color: var(--text-secondary); font-size: 0.9rem;">
							Completed jobs and work history will appear here once you finish assigned services.
						</p>
					</div>
				{:else}
					<div style="display: flex; flex-direction: column; gap: 1rem; min-width: 0; width: 100%;">
						{#each completedJobs as job (job.id)}
							<div
								class="card"
								style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; min-width: 0; max-width: 100%; box-sizing: border-box; overflow: hidden;"
							>
								<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; flex-wrap: wrap; min-width: 0; width: 100%;">
									<div style="min-width: 0; flex: 1 1 auto;">
										<div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
											<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
											<span
												class="badge"
												style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 0.25rem;"
											>
												<Check size={14} /> Completed
											</span>
										</div>
										<h4 style="font-size: 1.15rem; color: var(--text-primary); margin: 0; overflow-wrap: break-word; word-break: break-word;">
											{job.title}
										</h4>
										<span style="font-size: 0.85rem; color: var(--text-secondary); overflow-wrap: break-word;">
											Client: <strong>{job.customerName}</strong>
										</span>
									</div>
									<strong style="color: var(--success); font-size: 1.15rem; flex-shrink: 0; white-space: nowrap;">
										₱{job.budget.toLocaleString()}
									</strong>
								</div>
								<p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0; overflow-wrap: break-word; word-break: break-word;">
									{job.description}
								</p>
								<div style="font-size: 0.8rem; color: var(--text-muted); display: flex; justify-content: space-between; border-top: 1px dashed var(--border-color); padding-top: 0.5rem; flex-wrap: wrap; gap: 0.5rem; min-width: 0; width: 100%;">
									<span style="min-width: 0; overflow-wrap: break-word; word-break: break-word;">
										<strong>Location:</strong> {job.location}
									</span>
									<span style="min-width: 0; overflow-wrap: break-word; word-break: break-word;">
										<strong>Date Completed:</strong> {new Date(job.target_date || job.created_at).toLocaleDateString("en-PH", {
											month: "short",
											day: "numeric",
											year: "numeric",
										})}
									</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{:else if profileSubTab === "reviews"}
				<!-- TAB 2: CUSTOMER COMMENTS, FEEDBACK & REVIEW RATINGS -->
				{#if (stats?.reviews?.length || 0) === 0}
					<div class="card" style="text-align: center; padding: 3.5rem 2rem; border-style: dashed;">
						<h4 style="font-size: 1.15rem; margin-bottom: 0.5rem;">
							No reviews received yet.
						</h4>
						<p style="color: var(--text-secondary); font-size: 0.9rem;">
							Once clients review and rate your completed work, their feedback, comments, and ratings will be displayed here.
						</p>
					</div>
				{:else}
					<div style="display: flex; flex-direction: column; gap: 1rem; min-width: 0; width: 100%;">
						{#each stats.reviews as review (review.id)}
							<div
								class="card"
								style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; max-width: 100%; box-sizing: border-box; overflow: hidden;"
							>
								<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; min-width: 0; width: 100%;">
									<div style="min-width: 0;">
										<strong style="color: var(--text-primary); overflow-wrap: break-word;">{review.customer_name}</strong>
										<span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">
											{new Date(review.created_at).toLocaleDateString("en-PH", {
												month: "short",
												day: "numeric",
												year: "numeric",
											})}
										</span>
									</div>
									<div style="flex-shrink: 0;">
										<span
											class="rating-badge {review.rating > 0
												? 'rating-badge-positive'
												: review.rating < 0
													? 'rating-badge-negative'
													: 'rating-badge-zero'}"
											style="display: inline-flex; align-items: center; gap: 0.25rem;"
										>
											<Star size={12} fill="currentColor" /> {review.rating > 0 ? `+${review.rating}` : review.rating} Star{Math.abs(review.rating) === 1 ? "" : "s"}
										</span>
									</div>
								</div>
								<p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; font-style: italic; margin: 0; overflow-wrap: break-word; word-break: break-word;">
									"{review.review_text}"
								</p>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</section>
	</div>
</div>
