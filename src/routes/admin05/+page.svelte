<script>
	import { onDestroy } from 'svelte';
	import { enhance } from '$app/forms';
	import { fade, slide, scale } from 'svelte/transition';
	import { CITIES_MUNICIPALITIES } from '$lib/locations.js';
	import { 
		Shield, 
		Users, 
		Briefcase, 
		Star, 
		Settings, 
		Lock, 
		Unlock, 
		Search, 
		Trash2, 
		ExternalLink, 
		RefreshCw, 
		CheckCircle, 
		AlertTriangle, 
		ArrowRight, 
		User, 
		Wrench, 
		TrendingUp, 
		Activity,
		DollarSign,
		MapPin,
		Pencil
	} from 'lucide-svelte';

	let { data, form } = $props();

	// Secret Passcode Verification State
	let passcode = $state('');
	let isAuthenticated = $state(false);
	let passError = $state('');
	
	function lockAdmin() {
		isAuthenticated = false;
		passcode = '';
		if (typeof window !== 'undefined') {
			sessionStorage.removeItem('admin05_authed');
		}
	}

	// Always lock admin panel on page unmount / navigating away / tab hide
	onDestroy(() => {
		lockAdmin();
	});

	if (typeof window !== 'undefined') {
		// Also lock when tab is hidden or page is unloaded
		window.addEventListener('pagehide', lockAdmin);
		window.addEventListener('beforeunload', lockAdmin);
	}

	function handlePasscodeSubmit(e) {
		e.preventDefault();
		if (passcode.trim() === '1473') {
			isAuthenticated = true;
			passError = '';
			if (typeof window !== 'undefined') {
				sessionStorage.setItem('admin05_authed', 'true');
			}
		} else {
			passError = 'Invalid Secret Passcode. Access denied.';
		}
	}

	// Navigation Tabs
	let activeTab = $state('overview'); // 'overview' | 'users' | 'jobs' | 'reviews' | 'system'

	// Search & Filters
	let userSearch = $state('');
	let userRoleFilter = $state('all');

	let jobSearch = $state('');
	let jobStatusFilter = $state('all');

	let reviewSearch = $state('');
	let reviewRatingFilter = $state('all');

	// Delete Modal State
	let deleteModal = $state({
		open: false,
		type: null,
		id: null,
		name: ''
	});

	function openDeleteModal(type, id, name) {
		deleteModal = { open: true, type, id, name };
	}

	function closeDeleteModal() {
		deleteModal = { open: false, type: null, id: null, name: '' };
	}

	// Edit Address Modal State
	let editAddressModal = $state({
		open: false,
		userId: null,
		name: '',
		address: ''
	});

	function openEditAddressModal(user) {
		editAddressModal = {
			open: true,
			userId: user.id,
			name: user.name,
			address: user.address || ''
		};
	}

	function closeEditAddressModal() {
		editAddressModal = { open: false, userId: null, name: '', address: '' };
	}

	// Svelte 5 Derived Reactive Filters
	let filteredUsers = $derived(
		(data.users || []).filter(u => {
			const matchesSearch = !userSearch || 
				u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
				u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
				u.phone?.includes(userSearch);
			const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
			return matchesSearch && matchesRole;
		})
	);

	let filteredJobs = $derived(
		(data.jobs || []).filter(j => {
			const matchesSearch = !jobSearch || 
				j.title?.toLowerCase().includes(jobSearch.toLowerCase()) ||
				j.category?.toLowerCase().includes(jobSearch.toLowerCase()) ||
				j.location?.toLowerCase().includes(jobSearch.toLowerCase());
			const matchesStatus = jobStatusFilter === 'all' || j.status === jobStatusFilter;
			return matchesSearch && matchesStatus;
		})
	);

	let filteredReviews = $derived(
		(data.reviews || []).filter(r => {
			const matchesSearch = !reviewSearch ||
				r.review_text?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
				r.customer_name?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
				r.worker_name?.toLowerCase().includes(reviewSearch.toLowerCase());
			const matchesRating = reviewRatingFilter === 'all' || Math.round(r.rating) === parseInt(reviewRatingFilter);
			return matchesSearch && matchesRating;
		})
	);

	function formatDate(isoStr) {
		if (!isoStr) return 'N/A';
		try {
			return new Date(isoStr).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return isoStr;
		}
	}

	function formatCurrency(val) {
		const num = parseFloat(val) || 0;
		return '₱' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}
</script>

<svelte:head>
	<title>Admin Panel - Serviee [Admin05]</title>
</svelte:head>

<div class="text-slate-100 font-sans selection:bg-[#7261ef]/30 selection:text-white">
	{#if !isAuthenticated}
		<!-- Secret Passcode Protection Screen -->
		<div class="py-12 min-h-[70vh] flex items-center justify-center p-4" transition:fade={{ duration: 150 }}>
			<div class="w-full max-w-md bg-[#131722] border border-[#222736] rounded-2xl p-8 shadow-2xl text-center relative overflow-hidden" transition:scale={{ duration: 200, start: 0.95 }}>
				<!-- Top Accent Line -->
				<div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7261ef] via-purple-500 to-[#7261ef]"></div>

				<div class="w-16 h-16 mx-auto mb-5 bg-[#7261ef]/15 border border-[#7261ef]/30 text-[#7261ef] rounded-2xl flex items-center justify-center shadow-lg shadow-[#7261ef]/10">
					<Shield size={32} />
				</div>

				<h1 class="text-2xl font-bold text-white mb-1 tracking-tight">Serviee Admin Panel</h1>
				<p class="text-slate-400 text-sm mb-6">Restricted Secret Route <code class="px-2 py-0.5 bg-[#1a1e28] text-[#7261ef] rounded text-xs font-mono">/admin05</code></p>

				{#if passError}
					<div class="mb-5 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-center justify-center gap-2" transition:slide>
						<AlertTriangle size={16} />
						<span>{passError}</span>
					</div>
				{/if}

				<form onsubmit={handlePasscodeSubmit} class="space-y-4">
					<div class="text-left space-y-1.5">
						<label for="passcode" class="text-xs font-semibold uppercase tracking-wider text-slate-400">Secret Passcode</label>
						<input 
							id="passcode" 
							type="password" 
							bind:value={passcode}
							placeholder="Enter PIN..." 
							autocomplete="off"
							class="w-full px-4 py-3 bg-[#1a1e28] border border-[#222736] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#7261ef] focus:ring-1 focus:ring-[#7261ef] transition-all text-sm"
							required
						/>
					</div>

					<button 
						type="submit" 
						class="w-full py-3 px-4 bg-[#7261ef] hover:bg-[#8374f2] text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-[#7261ef]/25 active:scale-[0.98] flex items-center justify-center gap-2"
					>
						<Unlock size={18} />
						<span>Authenticate & Unlock</span>
					</button>
				</form>

				<div class="mt-8 pt-5 border-t border-[#222736]">
					<a href="/" class="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5">
						<span>← Return to Serviee Platform</span>
					</a>
				</div>
			</div>
		</div>
	{:else}
		<!-- Main Admin Dashboard -->
		<div class="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-3.5 sm:space-y-6" transition:fade={{ duration: 150 }}>
			<!-- Top Header Navigation Bar (Compact & Mobile-Optimized) -->
			<header class="bg-[#161b26] border border-[#272d3d] rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
				<div class="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-4">
					<div class="flex items-center gap-2">
						<a href="/" class="flex items-center gap-1.5 text-xl sm:text-2xl font-extrabold tracking-tight">
							<span class="bg-gradient-to-r from-slate-100 to-[#7261ef] bg-clip-text text-transparent">Serviee</span>
							<span class="w-2 h-2 rounded-full bg-[#7261ef] shadow-[0_0_12px_#7261ef]"></span>
						</a>
						<span class="px-2 py-0.5 bg-[#7261ef]/15 border border-[#7261ef]/30 text-[#7261ef] font-bold text-[10px] sm:text-xs rounded-full uppercase tracking-wider">
							ADMIN05
						</span>
					</div>
					<div class="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[11px] font-semibold">
						<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
						<span class="hidden sm:inline">Live System Connected</span>
						<span class="sm:hidden">Live</span>
					</div>
				</div>

				<div class="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
					<a 
						href="/" 
						target="_blank" 
						class="px-3 py-2 bg-[#1f2430] hover:bg-[#272d3d] text-slate-200 text-xs font-medium rounded-xl border border-[#272d3d] transition-all flex items-center justify-center gap-1.5 text-center"
					>
						<ExternalLink size={14} class="shrink-0" />
						<span class="truncate">Open Public App</span>
					</a>
					<button 
						onclick={lockAdmin}
						class="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-xl border border-red-500/20 transition-all flex items-center justify-center gap-1.5 text-center"
					>
						<Lock size={14} class="shrink-0" />
						<span>Lock Panel</span>
					</button>
				</div>
			</header>

			<!-- Action Feedback Alert Toast -->
			{#if form?.message}
				<div 
					class="p-3 sm:p-4 rounded-xl text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg border transition-all {form.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}"
					transition:slide
				>
					<div class="flex items-center gap-2">
						{#if form.success}
							<CheckCircle size={16} class="text-emerald-400 shrink-0" />
						{:else}
							<AlertTriangle size={16} class="text-red-400 shrink-0" />
						{/if}
						<span class="font-medium">{form.message}</span>
					</div>
				</div>
			{/if}

			<!-- Folder-Style Tab Navigation Bar -->
			<div class="tabs-header">
				<button 
					type="button"
					onclick={() => activeTab = 'overview'}
					class="tab-btn flex items-center gap-2 {activeTab === 'overview' ? 'active' : ''}"
				>
					<Activity size={16} />
					<span>Overview</span>
				</button>

				<button 
					type="button"
					onclick={() => activeTab = 'users'}
					class="tab-btn flex items-center gap-2 {activeTab === 'users' ? 'active' : ''}"
				>
					<Users size={16} />
					<span>Users Directory ({data.users?.length || 0})</span>
				</button>

				<button 
					type="button"
					onclick={() => activeTab = 'jobs'}
					class="tab-btn flex items-center gap-2 {activeTab === 'jobs' ? 'active' : ''}"
				>
					<Briefcase size={16} />
					<span>Job Listings ({data.jobs?.length || 0})</span>
				</button>

				<button 
					type="button"
					onclick={() => activeTab = 'reviews'}
					class="tab-btn flex items-center gap-2 {activeTab === 'reviews' ? 'active' : ''}"
				>
					<Star size={16} />
					<span>Reviews ({data.reviews?.length || 0})</span>
				</button>

				<button 
					type="button"
					onclick={() => activeTab = 'system'}
					class="tab-btn flex items-center gap-2 {activeTab === 'system' ? 'active' : ''}"
				>
					<Settings size={16} />
					<span>System Status</span>
				</button>
			</div>

			<!-- Tab Contents -->
			<main class="space-y-4 sm:space-y-6">
				{#if activeTab === 'overview'}
					<!-- Overview Dashboard -->
					<div class="space-y-4 sm:space-y-6" transition:fade={{ duration: 150 }}>
						<!-- Key Performance Metrics Grid (2 columns on mobile, 4 on desktop) -->
						<div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
							<!-- Stat Card 1 -->
							<div class="bg-[#161b26] border border-[#272d3d] rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xl hover:border-[#7261ef]/50 transition-all group flex flex-col justify-between">
								<div>
									<div class="flex items-center justify-between mb-2">
										<span class="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Total Users</span>
										<div class="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
											<Users size={16} class="sm:hidden" />
											<Users size={20} class="hidden sm:block" />
										</div>
									</div>
									<div class="text-xl sm:text-3xl font-extrabold text-white mb-2">{data.stats.totalUsers}</div>
								</div>
								<div class="flex flex-wrap items-center gap-1 text-[10px] sm:text-xs">
									<span class="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">{data.stats.totalCustomers} Clients</span>
									<span class="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-medium">{data.stats.totalWorkers} Workers</span>
								</div>
							</div>

							<!-- Stat Card 2 -->
							<div class="bg-[#161b26] border border-[#272d3d] rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xl hover:border-[#7261ef]/50 transition-all group flex flex-col justify-between">
								<div>
									<div class="flex items-center justify-between mb-2">
										<span class="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Job Posts</span>
										<div class="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
											<Briefcase size={16} class="sm:hidden" />
											<Briefcase size={20} class="hidden sm:block" />
										</div>
									</div>
									<div class="text-xl sm:text-3xl font-extrabold text-white mb-2">{data.stats.totalJobs}</div>
								</div>
								<div class="flex flex-wrap items-center gap-1 text-[10px] sm:text-xs">
									<span class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">{data.stats.openJobs} Open</span>
									<span class="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">{data.stats.inProgressJobs} Active</span>
									<span class="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-medium">{data.stats.completedJobs} Done</span>
								</div>
							</div>

							<!-- Stat Card 3 -->
							<div class="bg-[#161b26] border border-[#272d3d] rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xl hover:border-[#7261ef]/50 transition-all group flex flex-col justify-between">
								<div>
									<div class="flex items-center justify-between mb-2">
										<span class="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Budget Vol.</span>
										<div class="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
											<DollarSign size={16} class="sm:hidden" />
											<DollarSign size={20} class="hidden sm:block" />
										</div>
									</div>
									<div class="text-lg sm:text-2xl font-extrabold text-emerald-400 mb-1 truncate">{formatCurrency(data.stats.totalBudget)}</div>
								</div>
								<p class="text-[10px] sm:text-xs text-slate-500 truncate">Aggregate budget</p>
							</div>

							<!-- Stat Card 4 -->
							<div class="bg-[#161b26] border border-[#272d3d] rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xl hover:border-[#7261ef]/50 transition-all group flex flex-col justify-between">
								<div>
									<div class="flex items-center justify-between mb-2">
										<span class="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Avg Rating</span>
										<div class="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
											<Star size={16} class="sm:hidden" />
											<Star size={20} class="hidden sm:block" />
										</div>
									</div>
									<div class="text-xl sm:text-3xl font-extrabold text-white mb-1">{data.stats.avgRating} <span class="text-slate-500 text-xs sm:text-base font-normal">/ 5</span></div>
								</div>
								<p class="text-[10px] sm:text-xs text-slate-500 truncate">{data.stats.totalReviews} reviews</p>
							</div>
						</div>

						<!-- Overview Tables Split Grid -->
						<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
							<!-- Recent Users Panel -->
							<div class="bg-[#161b26] border border-[#272d3d] rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-3 sm:space-y-4">
								<div class="flex items-center justify-between border-b border-[#272d3d] pb-2.5">
									<h3 class="font-bold text-white text-sm sm:text-base flex items-center gap-2">
										<User size={16} class="text-[#7261ef]" />
										<span>Recent Registrations</span>
									</h3>
									<button onclick={() => activeTab = 'users'} class="text-xs font-medium text-[#7261ef] hover:text-[#8374f2] transition-colors flex items-center gap-1">
										<span>View All</span>
										<ArrowRight size={12} />
									</button>
								</div>

								<!-- Desktop Table -->
								<div class="hidden sm:block overflow-x-auto">
									<table class="w-full text-left text-xs">
										<thead class="text-slate-400 uppercase tracking-wider border-b border-[#272d3d]">
											<tr>
												<th class="pb-2.5 font-semibold">User</th>
												<th class="pb-2.5 font-semibold">Role</th>
												<th class="pb-2.5 font-semibold">Joined</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-[#272d3d]/50 text-slate-300">
											{#each (data.users || []).slice(0, 5) as u}
												<tr class="hover:bg-[#1f2430]/50 transition-colors">
													<td class="py-3">
														<div class="flex items-center gap-2.5">
															<div class="w-7 h-7 rounded-full bg-[#7261ef]/20 text-[#7261ef] font-bold flex items-center justify-center text-xs border border-[#7261ef]/30 shrink-0">
																{u.name?.charAt(0) || 'U'}
															</div>
															<div class="min-w-0">
																<div class="font-semibold text-white truncate">{u.name}</div>
																<div class="text-[11px] text-slate-500 truncate">{u.email}</div>
															</div>
														</div>
													</td>
													<td class="py-3">
														<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider {u.role === 'customer' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}">
															{u.role === 'customer' ? 'Client' : 'Worker'}
														</span>
													</td>
													<td class="py-3 text-slate-500 whitespace-nowrap">{formatDate(u.created_at)}</td>
												</tr>
											{:else}
												<tr><td colspan="3" class="py-6 text-center text-slate-500">No users registered yet.</td></tr>
											{/each}
										</tbody>
									</table>
								</div>

								<!-- Mobile Compact List -->
								<div class="sm:hidden space-y-2">
									{#each (data.users || []).slice(0, 5) as u}
										<div class="p-2.5 bg-[#1a1e29] border border-[#272d3d]/60 rounded-xl flex items-center justify-between gap-2 text-xs">
											<div class="flex items-center gap-2.5 min-w-0">
												<div class="w-8 h-8 rounded-full bg-[#7261ef]/20 text-[#7261ef] font-bold flex items-center justify-center text-xs border border-[#7261ef]/30 shrink-0">
													{u.name?.charAt(0) || 'U'}
												</div>
												<div class="min-w-0">
													<div class="font-semibold text-white truncate">{u.name}</div>
													<div class="text-[11px] text-slate-400 truncate">{u.email}</div>
												</div>
											</div>
											<span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider {u.role === 'customer' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}">
												{u.role === 'customer' ? 'Client' : 'Worker'}
											</span>
										</div>
									{:else}
										<p class="py-4 text-center text-slate-500 text-xs">No users registered yet.</p>
									{/each}
								</div>
							</div>

							<!-- Recent Jobs Panel -->
							<div class="bg-[#161b26] border border-[#272d3d] rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-3 sm:space-y-4">
								<div class="flex items-center justify-between border-b border-[#272d3d] pb-2.5">
									<h3 class="font-bold text-white text-sm sm:text-base flex items-center gap-2">
										<Briefcase size={16} class="text-[#7261ef]" />
										<span>Latest Job Posts</span>
									</h3>
									<button onclick={() => activeTab = 'jobs'} class="text-xs font-medium text-[#7261ef] hover:text-[#8374f2] transition-colors flex items-center gap-1">
										<span>View All</span>
										<ArrowRight size={12} />
									</button>
								</div>

								<!-- Desktop Table -->
								<div class="hidden sm:block overflow-x-auto">
									<table class="w-full text-left text-xs">
										<thead class="text-slate-400 uppercase tracking-wider border-b border-[#272d3d]">
											<tr>
												<th class="pb-2.5 font-semibold">Title</th>
												<th class="pb-2.5 font-semibold">Budget</th>
												<th class="pb-2.5 font-semibold">Status</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-[#272d3d]/50 text-slate-300">
											{#each (data.jobs || []).slice(0, 5) as j}
												<tr class="hover:bg-[#1f2430]/50 transition-colors">
													<td class="py-3">
														<div class="font-semibold text-white max-w-[200px] truncate">{j.title}</div>
														<div class="text-[11px] text-slate-500">{j.category || 'General'} • {j.location || 'PH'}</div>
													</td>
													<td class="py-3 font-semibold text-emerald-400">{formatCurrency(j.budget)}</td>
													<td class="py-3">
														<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider {j.status === 'open' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : j.status === 'in_progress' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}">
															{j.status}
														</span>
													</td>
												</tr>
											{:else}
												<tr><td colspan="3" class="py-6 text-center text-slate-500">No job postings created yet.</td></tr>
											{/each}
										</tbody>
									</table>
								</div>

								<!-- Mobile Compact List -->
								<div class="sm:hidden space-y-2">
									{#each (data.jobs || []).slice(0, 5) as j}
										<div class="p-2.5 bg-[#1a1e29] border border-[#272d3d]/60 rounded-xl flex items-center justify-between gap-2 text-xs">
											<div class="min-w-0 flex-1">
												<div class="font-semibold text-white truncate">{j.title}</div>
												<div class="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
													<span>{j.category || 'General'}</span>
													<span>•</span>
													<span class="text-emerald-400 font-semibold">{formatCurrency(j.budget)}</span>
												</div>
											</div>
											<span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider {j.status === 'open' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : j.status === 'in_progress' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}">
												{j.status}
											</span>
										</div>
									{:else}
										<p class="py-4 text-center text-slate-500 text-xs">No job postings created yet.</p>
									{/each}
								</div>
							</div>
						</div>
					</div>

				{:else if activeTab === 'users'}
					<!-- User Management Tab -->
					<div class="space-y-3.5 sm:space-y-4" transition:fade={{ duration: 150 }}>
						<!-- Search & Filters Bar -->
						<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#161b26] border border-[#272d3d] p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl">
							<div class="relative w-full sm:w-96">
								<Search size={15} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
								<input 
									type="text" 
									bind:value={userSearch} 
									placeholder="Search by name, email, phone..." 
									class="w-full pl-9 pr-3 py-2 bg-[#1f2430] border border-[#272d3d] rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#7261ef] transition-all"
								/>
							</div>

							<div class="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
								<span class="text-xs text-slate-400 font-medium shrink-0">Filter:</span>
								<select 
									bind:value={userRoleFilter}
									class="bg-[#1f2430] border border-[#272d3d] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#7261ef] flex-1 sm:flex-initial"
								>
									<option value="all">All Roles ({data.users?.length || 0})</option>
									<option value="customer">Clients ({data.stats.totalCustomers})</option>
									<option value="worker">Workers ({data.stats.totalWorkers})</option>
								</select>
							</div>
						</div>

						<!-- Desktop Users Table View -->
						<div class="hidden sm:block bg-[#161b26] border border-[#272d3d] rounded-2xl shadow-xl overflow-hidden">
							<div class="overflow-x-auto">
								<table class="w-full text-left text-xs">
									<thead class="bg-[#1f2430] text-slate-400 uppercase tracking-wider border-b border-[#272d3d]">
										<tr>
											<th class="py-3.5 px-4 font-semibold">User Details</th>
											<th class="py-3.5 px-4 font-semibold">Role</th>
											<th class="py-3.5 px-4 font-semibold">Phone</th>
											<th class="py-3.5 px-4 font-semibold">Address</th>
											<th class="py-3.5 px-4 font-semibold">Joined Date</th>
											<th class="py-3.5 px-4 font-semibold text-right">Actions</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-[#272d3d]/50 text-slate-300">
										{#each filteredUsers as u}
											<tr class="hover:bg-[#1f2430]/40 transition-colors">
												<td class="py-3.5 px-4">
													<div class="flex items-center gap-3">
														<div class="w-9 h-9 rounded-full bg-[#7261ef]/20 border border-[#7261ef]/30 text-[#7261ef] font-bold flex items-center justify-center text-sm shrink-0">
															{u.name?.charAt(0) || 'U'}
														</div>
														<div>
															<div class="font-semibold text-white text-sm">{u.name}</div>
															<div class="text-slate-400">{u.email}</div>
															<div class="text-[10px] text-slate-500 font-mono mt-0.5">ID: {u.id}</div>
														</div>
													</div>
												</td>
												<td class="py-3.5 px-4">
													<span class="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider {u.role === 'customer' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}">
														{u.role === 'customer' ? 'Client' : 'Worker'}
													</span>
												</td>
												<td class="py-3.5 px-4 text-slate-400">{u.phone || 'N/A'}</td>
												<td class="py-3.5 px-4 text-slate-400 max-w-[200px] truncate">{u.address || 'No address set'}</td>
												<td class="py-3.5 px-4 text-slate-400">{formatDate(u.created_at)}</td>
												<td class="py-3.5 px-4 text-right space-x-1.5">
													<button 
														onclick={() => openEditAddressModal(u)}
														class="p-1.5 bg-[#7261ef]/10 hover:bg-[#7261ef]/20 text-[#7261ef] rounded-lg border border-[#7261ef]/20 transition-all font-semibold inline-flex items-center"
														title="Edit Address"
													>
														<Pencil size={14} />
													</button>
													<button 
														onclick={() => openDeleteModal('user', u.id, u.name)}
														class="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-all font-semibold inline-flex items-center gap-1.5"
														title="Delete User"
													>
														<Trash2 size={14} />
														<span>Delete</span>
													</button>
												</td>
											</tr>
										{:else}
											<tr>
												<td colspan="6" class="py-8 text-center text-slate-500">No matching users found.</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>

						<!-- Mobile Responsive User Cards List -->
						<div class="sm:hidden space-y-2.5">
							{#each filteredUsers as u}
								<div class="bg-[#161b26] border border-[#272d3d] rounded-xl p-3.5 shadow-lg space-y-2.5">
									<div class="flex items-start justify-between gap-2">
										<div class="flex items-center gap-2.5 min-w-0">
											<div class="w-9 h-9 rounded-full bg-[#7261ef]/20 border border-[#7261ef]/30 text-[#7261ef] font-bold flex items-center justify-center text-sm shrink-0">
												{u.name?.charAt(0) || 'U'}
											</div>
											<div class="min-w-0">
												<div class="font-bold text-white text-xs truncate">{u.name}</div>
												<div class="text-[11px] text-slate-400 truncate">{u.email}</div>
											</div>
										</div>
										<span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider {u.role === 'customer' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}">
											{u.role === 'customer' ? 'Client' : 'Worker'}
										</span>
									</div>

									<div class="text-[11px] text-slate-400 grid grid-cols-2 gap-1.5 pt-2 border-t border-[#272d3d]/60">
										<div><span class="text-slate-500">Phone:</span> {u.phone || 'N/A'}</div>
										<div><span class="text-slate-500">Joined:</span> {formatDate(u.created_at)}</div>
										<div class="col-span-2 truncate"><span class="text-slate-500">Address:</span> {u.address || 'No address set'}</div>
									</div>

									<div class="flex items-center justify-between pt-1">
										<span class="text-[9px] text-slate-600 font-mono">ID: {u.id}</span>
										<div class="flex items-center gap-1">
											<button 
												onclick={() => openEditAddressModal(u)}
												class="p-1.5 bg-[#7261ef]/10 hover:bg-[#7261ef]/20 text-[#7261ef] rounded-lg border border-[#7261ef]/20 transition-all inline-flex items-center"
												title="Edit Address"
											>
												<Pencil size={12} />
											</button>
											<button 
												onclick={() => openDeleteModal('user', u.id, u.name)}
												class="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 text-xs font-semibold inline-flex items-center gap-1"
											>
												<Trash2 size={12} />
												<span>Delete</span>
											</button>
										</div>
									</div>
								</div>
							{:else}
								<div class="py-8 text-center text-slate-500 bg-[#161b26] border border-[#272d3d] rounded-xl text-xs">
									No matching users found.
								</div>
							{/each}
						</div>
					</div>

				{:else if activeTab === 'jobs'}
					<!-- Job Listings Management -->
					<div class="space-y-3.5 sm:space-y-4" transition:fade={{ duration: 150 }}>
						<!-- Search & Filters -->
						<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#161b26] border border-[#272d3d] p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl">
							<div class="relative w-full sm:w-96">
								<Search size={15} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
								<input 
									type="text" 
									bind:value={jobSearch} 
									placeholder="Search title, category, location..." 
									class="w-full pl-9 pr-3 py-2 bg-[#1f2430] border border-[#272d3d] rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#7261ef] transition-all"
								/>
							</div>

							<div class="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
								<span class="text-xs text-slate-400 font-medium shrink-0">Status:</span>
								<select 
									bind:value={jobStatusFilter}
									class="bg-[#1f2430] border border-[#272d3d] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#7261ef] flex-1 sm:flex-initial"
								>
									<option value="all">All Statuses</option>
									<option value="open">Open</option>
									<option value="assigned">Assigned</option>
									<option value="in_progress">In Progress</option>
									<option value="completed">Completed</option>
								</select>
							</div>
						</div>

						<!-- Desktop Jobs Table -->
						<div class="hidden sm:block bg-[#161b26] border border-[#272d3d] rounded-2xl shadow-xl overflow-hidden">
							<div class="overflow-x-auto">
								<table class="w-full text-left text-xs">
									<thead class="bg-[#1f2430] text-slate-400 uppercase tracking-wider border-b border-[#272d3d]">
										<tr>
											<th class="py-3.5 px-4 font-semibold">Job Info</th>
											<th class="py-3.5 px-4 font-semibold">Category</th>
											<th class="py-3.5 px-4 font-semibold">Location</th>
											<th class="py-3.5 px-4 font-semibold">Budget</th>
											<th class="py-3.5 px-4 font-semibold">Applicants</th>
											<th class="py-3.5 px-4 font-semibold">Status Update</th>
											<th class="py-3.5 px-4 font-semibold text-right">Actions</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-[#272d3d]/50 text-slate-300">
										{#each filteredJobs as j}
											<tr class="hover:bg-[#1f2430]/40 transition-colors">
												<td class="py-3.5 px-4">
													<div class="font-semibold text-white text-sm">{j.title}</div>
													<div class="text-[10px] text-slate-500 font-mono">ID: {j.id} • Posted: {formatDate(j.created_at)}</div>
													<div class="text-xs text-slate-400 max-w-xs truncate mt-0.5">{j.description || 'No description.'}</div>
												</td>
												<td class="py-3.5 px-4">
													<span class="px-2 py-0.5 bg-[#1f2430] border border-[#272d3d] text-slate-300 rounded text-[11px] font-medium">
														{j.category || 'General'}
													</span>
												</td>
												<td class="py-3.5 px-4 text-slate-400">{j.location || 'N/A'}</td>
												<td class="py-3.5 px-4 font-bold text-emerald-400 text-sm">{formatCurrency(j.budget)}</td>
												<td class="py-3.5 px-4">
													<span class="px-2 py-0.5 bg-[#7261ef]/15 text-[#7261ef] font-bold rounded-md text-xs">
														{j.applicants?.length || 0}
													</span>
												</td>
												<td class="py-3.5 px-4">
													<form method="POST" action="?/updateJobStatus" use:enhance>
														<input type="hidden" name="jobId" value={j.id} />
														<select 
															name="status" 
															value={j.status}
															onchange={(e) => { e.currentTarget.closest('form')?.requestSubmit(); }}
															class="bg-[#1f2430] border border-[#272d3d] text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#7261ef] font-semibold cursor-pointer"
														>
															<option value="open">Open</option>
															<option value="assigned">Assigned</option>
															<option value="in_progress">In Progress</option>
															<option value="completed">Completed</option>
														</select>
													</form>
												</td>
												<td class="py-3.5 px-4 text-right">
													<button 
														onclick={() => openDeleteModal('job', j.id, j.title)}
														class="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-all font-semibold inline-flex items-center gap-1.5"
														title="Delete Job Post"
													>
														<Trash2 size={14} />
														<span>Delete</span>
													</button>
												</td>
											</tr>
										{:else}
											<tr>
												<td colspan="7" class="py-8 text-center text-slate-500">No job posts found.</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>

						<!-- Mobile Responsive Job Cards List -->
						<div class="sm:hidden space-y-2.5">
							{#each filteredJobs as j}
								<div class="bg-[#161b26] border border-[#272d3d] rounded-xl p-3.5 shadow-lg space-y-2.5">
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0 flex-1">
											<div class="font-bold text-white text-xs truncate">{j.title}</div>
											<div class="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
												<span class="px-1.5 py-0.5 bg-[#1f2430] border border-[#272d3d] rounded text-[9px]">{j.category || 'General'}</span>
												<span>•</span>
												<span class="text-slate-400">{j.location || 'N/A'}</span>
												<span>•</span>
												<span class="text-slate-400">Posted: {formatDate(j.created_at)}</span>
											</div>
										</div>
										<div class="text-right shrink-0">
											<div class="font-extrabold text-emerald-400 text-xs">{formatCurrency(j.budget)}</div>
											<div class="text-[9px] text-[#7261ef] font-semibold">{j.applicants?.length || 0} applicants</div>
										</div>
									</div>

									{#if j.description}
										<p class="text-[11px] text-slate-400 line-clamp-2">{j.description}</p>
									{/if}

									<div class="flex items-center justify-between pt-2 border-t border-[#272d3d]/60">
										<form method="POST" action="?/updateJobStatus" use:enhance class="flex-1 mr-2">
											<input type="hidden" name="jobId" value={j.id} />
											<select 
												name="status" 
												value={j.status}
												onchange={(e) => { e.currentTarget.closest('form')?.requestSubmit(); }}
												class="w-full bg-[#1f2430] border border-[#272d3d] text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-[#7261ef] font-semibold cursor-pointer"
											>
												<option value="open">Status: Open</option>
												<option value="assigned">Status: Assigned</option>
												<option value="in_progress">Status: In Progress</option>
												<option value="completed">Status: Completed</option>
											</select>
										</form>

										<button 
											onclick={() => openDeleteModal('job', j.id, j.title)}
											class="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 text-xs font-semibold inline-flex items-center gap-1 shrink-0"
										>
											<Trash2 size={12} />
											<span>Delete</span>
										</button>
									</div>
								</div>
							{:else}
								<div class="py-8 text-center text-slate-500 bg-[#161b26] border border-[#272d3d] rounded-xl text-xs">
									No job posts found.
								</div>
							{/each}
						</div>
					</div>

				{:else if activeTab === 'reviews'}
					<!-- Reviews Moderation Tab -->
					<div class="space-y-3.5 sm:space-y-4" transition:fade={{ duration: 150 }}>
						<!-- Filter Bar -->
						<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#161b26] border border-[#272d3d] p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl">
							<div class="relative w-full sm:w-96">
								<Search size={15} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
								<input 
									type="text" 
									bind:value={reviewSearch} 
									placeholder="Search review text or users..." 
									class="w-full pl-9 pr-3 py-2 bg-[#1f2430] border border-[#272d3d] rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#7261ef] transition-all"
								/>
							</div>

							<div class="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
								<span class="text-xs text-slate-400 font-medium shrink-0">Rating:</span>
								<select 
									bind:value={reviewRatingFilter}
									class="bg-[#1f2430] border border-[#272d3d] text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#7261ef] flex-1 sm:flex-initial"
								>
									<option value="all">All Ratings</option>
									<option value="5">5 Stars ⭐⭐⭐⭐⭐</option>
									<option value="4">4 Stars ⭐⭐⭐⭐</option>
									<option value="3">3 Stars ⭐⭐⭐</option>
									<option value="2">2 Stars ⭐⭐</option>
									<option value="1">1 Star ⭐</option>
								</select>
							</div>
						</div>

						<!-- Reviews Cards Grid -->
						<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
							{#each filteredReviews as r}
								<div class="bg-[#161b26] border border-[#272d3d] rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xl flex flex-col justify-between space-y-3 hover:border-[#7261ef]/40 transition-all">
									<div class="space-y-2">
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-1 text-xs sm:text-sm {r.rating < 0 ? 'text-red-500' : 'text-amber-400'}">
												{#each Array(5) as _, i}
													<span class={i < Math.abs(r.rating) ? 'opacity-100' : 'opacity-20'}>★</span>
												{/each}
												<span class="text-[11px] ml-1 font-semibold {r.rating < 0 ? 'text-red-400' : 'text-slate-400'}">({r.rating < 0 ? r.rating.toFixed(1) : `${r.rating}.0`})</span>
											</div>
											<button 
												onclick={() => openDeleteModal('review', r.id, `Review by ${r.customer_name}`)}
												class="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-all"
												title="Delete Review"
											>
												<Trash2 size={13} />
											</button>
										</div>

										<p class="text-slate-300 text-xs italic line-clamp-3">"{r.review_text || 'No written text provided.'}"</p>
									</div>

									<div class="border-t border-[#272d3d] pt-2.5 text-[11px] text-slate-400 space-y-1">
										<div class="flex items-center justify-between gap-1">
											<span class="text-slate-200 font-medium truncate">Client: {r.customer_name}</span>
											<span class="shrink-0">➔</span>
											<span class="text-[#7261ef] font-medium truncate">Worker: {r.worker_name}</span>
										</div>
										<div class="text-slate-500 text-[10px]">{formatDate(r.created_at)}</div>
									</div>
								</div>
							{:else}
								<div class="col-span-full py-8 text-center text-slate-500 bg-[#161b26] border border-[#272d3d] rounded-xl sm:rounded-2xl text-xs">
									No reviews match your query.
								</div>
							{/each}
						</div>
					</div>

				{:else if activeTab === 'system'}
					<!-- System Info Tab -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6" transition:fade={{ duration: 150 }}>
						<div class="bg-[#161b26] border border-[#272d3d] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl space-y-3.5">
							<h3 class="font-bold text-white text-sm sm:text-base flex items-center gap-2">
								<Activity size={17} class="text-[#7261ef]" />
								<span>Platform Diagnostics</span>
							</h3>

							<div class="divide-y divide-[#272d3d] text-xs">
								<div class="py-2.5 flex items-center justify-between">
									<span class="text-slate-400">Environment</span>
									<span class="px-2 py-1 bg-[#1f2430] text-slate-200 rounded-lg font-semibold text-[11px]">Production / Vite</span>
								</div>
								<div class="py-2.5 flex items-center justify-between">
									<span class="text-slate-400">Database Engine</span>
									<span class="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg font-semibold text-[11px]">Supabase PostgreSQL</span>
								</div>
								<div class="py-2.5 flex items-center justify-between">
									<span class="text-slate-400">Secret Route</span>
									<span class="font-mono text-[#7261ef]">/admin05</span>
								</div>
								<div class="py-2.5 flex items-center justify-between">
									<span class="text-slate-400">Passcode Protection</span>
									<span class="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-semibold text-[11px]">Active (1473)</span>
								</div>
							</div>
						</div>

						<div class="bg-[#161b26] border border-[#272d3d] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl space-y-3.5">
							<h3 class="font-bold text-white text-base flex items-center gap-2">
								<Settings size={17} class="text-[#7261ef]" />
								<span>Quick Admin Actions</span>
							</h3>

							<div class="space-y-2.5">
								<button 
									onclick={() => window.location.reload()}
									class="w-full p-2.5 sm:p-3 bg-[#1f2430] hover:bg-[#272d3d] text-slate-200 rounded-xl border border-[#272d3d] transition-all text-xs font-semibold flex items-center justify-center gap-2"
								>
									<RefreshCw size={15} class="text-[#7261ef]" />
									<span>Refresh Metrics & Purge Cache</span>
								</button>

								<button 
									onclick={lockAdmin}
									class="w-full p-2.5 sm:p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all text-xs font-semibold flex items-center justify-center gap-2"
								>
									<Lock size={15} />
									<span>Lock Secret Admin Session</span>
								</button>
							</div>
						</div>
					</div>
				{/if}
			</main>
		</div>
	{/if}

	<!-- Delete Modal -->
	{#if deleteModal.open}
		<div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" transition:fade={{ duration: 150 }}>
			<div class="w-full max-w-sm sm:max-w-md bg-[#161b26] border border-[#272d3d] rounded-2xl p-5 sm:p-6 text-center space-y-3.5 shadow-2xl" transition:scale={{ duration: 150, start: 0.95 }}>
				<div class="w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-red-500/10 text-red-400 rounded-full flex items-center justify-center">
					<AlertTriangle size={22} />
				</div>

				<h3 class="text-base sm:text-lg font-bold text-white">Confirm Deletion</h3>
				<p class="text-xs text-slate-400">Are you sure you want to delete <strong class="text-white">{deleteModal.name}</strong>? This action cannot be undone.</p>

				<div class="flex items-center justify-center gap-2.5 pt-1">
					<button 
						onclick={closeDeleteModal}
						class="px-4 py-2 bg-[#1f2430] hover:bg-[#272d3d] text-slate-300 rounded-xl text-xs font-semibold transition-all"
					>
						Cancel
					</button>

					{#if deleteModal.type === 'user'}
						<form method="POST" action="?/deleteUser" use:enhance={() => { closeDeleteModal(); }}>
							<input type="hidden" name="userId" value={deleteModal.id} />
							<button type="submit" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-red-500/25">
								Delete User
							</button>
						</form>
					{:else if deleteModal.type === 'job'}
						<form method="POST" action="?/deleteJob" use:enhance={() => { closeDeleteModal(); }}>
							<input type="hidden" name="jobId" value={deleteModal.id} />
							<button type="submit" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-red-500/25">
								Delete Job
							</button>
						</form>
					{:else if deleteModal.type === 'review'}
						<form method="POST" action="?/deleteReview" use:enhance={() => { closeDeleteModal(); }}>
							<input type="hidden" name="reviewId" value={deleteModal.id} />
							<button type="submit" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-red-500/25">
								Delete Review
							</button>
						</form>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Edit User Address Modal -->
	{#if editAddressModal.open}
		<div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" transition:fade={{ duration: 150 }}>
			<div class="w-full max-w-sm sm:max-w-md bg-[#161b26] border border-[#272d3d] rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl" transition:scale={{ duration: 150, start: 0.95 }}>
				<div class="flex items-center justify-between border-b border-[#272d3d] pb-3">
					<h3 class="text-base sm:text-lg font-bold text-white flex items-center gap-2">
						<MapPin size={18} class="text-[#7261ef]" />
						<span>Edit User Address</span>
					</h3>
					<button 
						type="button" 
						onclick={closeEditAddressModal}
						class="text-slate-400 hover:text-white text-xs p-1"
					>
						✕
					</button>
				</div>

				<p class="text-xs text-slate-400">
					Updating address for <strong class="text-white">{editAddressModal.name}</strong>
				</p>

				<form method="POST" action="?/updateUserAddress" use:enhance={() => { closeEditAddressModal(); }} class="space-y-4">
					<input type="hidden" name="userId" value={editAddressModal.userId} />
					
					<div class="space-y-1.5">
						<label for="addressInput" class="text-xs font-semibold text-slate-300">City / Municipality</label>
						<select 
							id="addressInput"
							name="address" 
							bind:value={editAddressModal.address}
							class="w-full px-3 py-2 bg-[#1f2430] border border-[#272d3d] rounded-xl text-white text-xs focus:outline-none focus:border-[#7261ef] transition-all cursor-pointer"
							required
						>
							<option value="" disabled selected={!editAddressModal.address}>Select City / Municipality...</option>
							{#each CITIES_MUNICIPALITIES as city}
								<option value={city}>{city}</option>
							{/each}
						</select>
					</div>

					<div class="flex items-center justify-end gap-2.5 pt-2 border-t border-[#272d3d]">
						<button 
							type="button"
							onclick={closeEditAddressModal}
							class="px-4 py-2 bg-[#1f2430] hover:bg-[#272d3d] text-slate-300 rounded-xl text-xs font-semibold transition-all"
						>
							Cancel
						</button>
						<button 
							type="submit" 
							class="px-4 py-2 bg-[#7261ef] hover:bg-[#8374f2] text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-[#7261ef]/25 flex items-center gap-1.5"
						>
							<CheckCircle size={14} />
							<span>Save Address</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
