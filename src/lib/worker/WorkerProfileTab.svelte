<script>
	import { Star, ClipboardList, Check } from 'lucide-svelte';

	let { 
		user = {}, 
		stats = {}, 
		completedJobs = [], 
		profileSubTab = $bindable('history') 
	} = $props();

	function getCategoryBadge(category) {
		switch (category) {
			case "Plumbing / Tubero": return "badge-plumbing";
			case "Roofing / Ayos Yero": return "badge-roofing";
			case "Excavation / Hukay Lupa": return "badge-excavation";
			case "Gardening": return "badge-gardening";
			case "Carpentry": return "badge-carpentry";
			default: return "badge-general";
		}
	}
</script>

<div class="profile-container">
	<!-- Cover Banner & Header Card -->
	<div class="profile-header-card">
		<div class="profile-cover-banner"></div>
		<div class="profile-header-content">
			<div class="profile-header-row">
				<!-- Left Side: Avatar + Name + Role Badge -->
				<div class="profile-user-left">
					<div class="profile-avatar-wrapper">
						{user?.name ? user.name.charAt(0).toUpperCase() : "W"}
					</div>
					<div class="profile-user-text">
						<h2 style="font-size: 1.6rem; margin-bottom: 0.25rem;">
							{user?.name}
						</h2>
						<span class="badge badge-general" style="font-size: 0.75rem;">Worker Account</span>
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
							style="font-size: 1.1rem; padding: 0.3rem 0.8rem; display: inline-flex; align-items: center; gap: 0.25rem;"
						>
							<Star size={14} fill="currentColor" /> {stats?.average_rating > 0
								? `+${stats.average_rating}`
								: stats?.average_rating || "0"}
						</span>
						<span class="profile-stat-label" style="margin-top: 0.3rem;">Total Rating</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Main 2-Column Grid -->
	<div class="profile-main-grid">
		<!-- Left Column: Introduction / Details -->
		<aside class="card" style="padding: 1.5rem;">
			<h4 style="font-size: 1.25rem; margin-bottom: 1.25rem; color: var(--text-primary);">
				Introduction
			</h4>
			<div style="display: flex; flex-direction: column; gap: 1rem; font-size: 0.9rem;">
				<div>
					<span style="color: var(--text-muted); font-size: 0.8rem; display: block; text-transform: uppercase;">Email Address</span>
					<strong style="color: var(--text-primary);">{user?.email}</strong>
				</div>
				<div>
					<span style="color: var(--text-muted); font-size: 0.8rem; display: block; text-transform: uppercase;">Phone Number</span>
					<strong style="color: var(--text-primary);">{user?.phone}</strong>
				</div>
				<div>
					<span style="color: var(--text-muted); font-size: 0.8rem; display: block; text-transform: uppercase;">Address / City</span>
					<strong style="color: var(--text-primary);">{user?.address}</strong>
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
