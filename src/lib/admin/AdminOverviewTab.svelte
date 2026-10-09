<script>
	import { fade } from 'svelte/transition';
	import { Users, Briefcase, DollarSign, Star, User, ArrowRight } from 'lucide-svelte';

	let { 
		stats = {}, 
		users = [], 
		jobs = [], 
		onviewallusers, 
		onviewalljobs 
	} = $props();

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

<div class="space-y-4 sm:space-y-6" transition:fade={{ duration: 150 }}>
	<!-- Key Performance Metrics Grid -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
		<!-- Stat Card 1 -->
		<div class="bg-white dark:bg-[#161138] border border-slate-200/80 dark:border-[#2c235b] rounded-xl p-4 sm:p-5 shadow-xs dark:shadow-xl hover:border-purple-300 dark:hover:border-purple-500/40 transition-all group flex flex-col justify-between h-full">
			<div>
				<div class="flex items-center justify-between mb-2">
					<span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#77719f]">Total Users</span>
					<div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
						<Users size={18} />
					</div>
				</div>
				<div class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#faf9fe] mb-2 tracking-tight">{stats.totalUsers || 0}</div>
			</div>
			<div class="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs mt-auto">
				<span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300 font-semibold whitespace-nowrap">{stats.totalCustomers || 0} Clients</span>
				<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-semibold whitespace-nowrap">{stats.totalWorkers || 0} Workers</span>
			</div>
		</div>

		<!-- Stat Card 2 -->
		<div class="bg-white dark:bg-[#161138] border border-slate-200/80 dark:border-[#2c235b] rounded-xl p-4 sm:p-5 shadow-xs dark:shadow-xl hover:border-purple-300 dark:hover:border-purple-500/40 transition-all group flex flex-col justify-between h-full">
			<div>
				<div class="flex items-center justify-between mb-2">
					<span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#77719f]">Job Posts</span>
					<div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
						<Briefcase size={18} />
					</div>
				</div>
				<div class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#faf9fe] mb-2 tracking-tight">{stats.totalJobs || 0}</div>
			</div>
			<div class="flex flex-wrap items-center gap-1 text-[10px] sm:text-xs mt-auto">
				<span class="px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 font-semibold whitespace-nowrap">{stats.openJobs || 0} Open</span>
				<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 font-semibold whitespace-nowrap">{stats.inProgressJobs || 0} Active</span>
				<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-semibold whitespace-nowrap">{stats.completedJobs || 0} Done</span>
			</div>
		</div>

		<!-- Stat Card 3 -->
		<div class="bg-white dark:bg-[#161138] border border-slate-200/80 dark:border-[#2c235b] rounded-xl p-4 sm:p-5 shadow-xs dark:shadow-xl hover:border-purple-300 dark:hover:border-purple-500/40 transition-all group flex flex-col justify-between h-full">
			<div>
				<div class="flex items-center justify-between mb-2">
					<span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#77719f]">Budget Vol.</span>
					<div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
						<DollarSign size={18} />
					</div>
				</div>
				<div class="text-lg sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mb-1 truncate tracking-tight min-w-0">{formatCurrency(stats.totalBudget)}</div>
			</div>
			<p class="text-[10px] sm:text-xs text-slate-500 dark:text-[#77719f] font-medium truncate mt-auto">Aggregate budget</p>
		</div>

		<!-- Stat Card 4 -->
		<div class="bg-white dark:bg-[#161138] border border-slate-200/80 dark:border-[#2c235b] rounded-xl p-4 sm:p-5 shadow-xs dark:shadow-xl hover:border-purple-300 dark:hover:border-purple-500/40 transition-all group flex flex-col justify-between h-full">
			<div>
				<div class="flex items-center justify-between mb-2">
					<span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#77719f]">Avg Rating</span>
					<div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
						<Star size={18} />
					</div>
				</div>
				<div class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#faf9fe] mb-1 tracking-tight">{stats.avgRating || '0.0'} <span class="text-slate-400 dark:text-[#77719f] text-xs sm:text-base font-medium">/ 5</span></div>
			</div>
			<p class="text-[10px] sm:text-xs text-slate-500 dark:text-[#77719f] font-medium truncate mt-auto">{stats.totalReviews || 0} reviews</p>
		</div>
	</div>

	<!-- Overview Tables Split Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-6 items-start">
		<!-- Recent Users Panel -->
		<div class="bg-white dark:bg-[#161138] border border-slate-200/80 dark:border-[#2c235b] rounded-xl p-3.5 sm:p-5 shadow-xs dark:shadow-xl space-y-3.5 sm:space-y-4">
			<div class="flex items-center justify-between border-b border-slate-100 dark:border-[#2c235b] pb-3">
				<h3 class="font-bold text-slate-900 dark:text-[#faf9fe] text-sm sm:text-base flex items-center gap-2">
					<div class="p-1.5 bg-purple-50 dark:bg-purple-500/10 text-[#7261ef] rounded-lg">
						<User size={16} />
					</div>
					<span>Recent Registrations</span>
				</h3>
				<button onclick={onviewallusers} class="px-2.5 sm:px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 text-[#7261ef] dark:text-purple-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
					<span>View All</span>
					<ArrowRight size={12} />
				</button>
			</div>

			<!-- Desktop Table -->
			<div class="hidden sm:block overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead class="bg-slate-100 dark:bg-[#211a4e]/70 text-slate-700 dark:text-[#b2acd6] uppercase tracking-wider border-b border-slate-200 dark:border-[#2c235b] text-[11px]">
						<tr>
							<th class="py-3 px-4 font-bold rounded-l-lg">User</th>
							<th class="py-3 px-4 font-bold">Role</th>
							<th class="py-3 px-4 font-bold rounded-r-lg">Joined</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-[#2c235b]/60 text-slate-700 dark:text-[#b2acd6]">
						{#each users.slice(0, 5) as u}
							<tr class="hover:bg-slate-50/80 dark:hover:bg-[#211a4e]/40 transition-colors">
								<td class="py-3 px-4">
									<div class="flex items-center gap-3">
										<div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#7261ef] to-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
											{u.name?.charAt(0) || 'U'}
										</div>
										<div class="min-w-0">
											<div class="font-bold text-slate-900 dark:text-[#faf9fe] truncate">{u.name}</div>
											<div class="text-[11px] text-slate-500 dark:text-[#b2acd6] truncate">{u.email}</div>
										</div>
									</div>
								</td>
								<td class="py-3 px-4">
									<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider {u.role === 'customer' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20' : 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200/60 dark:border-purple-500/20'}">
										{u.role === 'customer' ? 'Client' : 'Worker'}
									</span>
								</td>
								<td class="py-3 px-4 text-slate-500 dark:text-[#77719f] font-medium whitespace-nowrap">{formatDate(u.created_at)}</td>
							</tr>
						{:else}
							<tr><td colspan="3" class="py-6 text-center text-slate-400 dark:text-[#77719f] font-medium">No users registered yet.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Mobile Compact List -->
			<div class="sm:hidden space-y-2">
				{#each users.slice(0, 5) as u}
					<div class="p-2.5 bg-slate-50 dark:bg-[#211a4e]/60 border border-slate-200/80 dark:border-[#2c235b] rounded-lg flex items-center justify-between gap-2 text-xs">
						<div class="flex items-center gap-2 min-w-0">
							<div class="w-7 h-7 rounded-full bg-gradient-to-br from-[#7261ef] to-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
								{u.name?.charAt(0) || 'U'}
							</div>
							<div class="min-w-0">
								<div class="font-bold text-slate-900 dark:text-[#faf9fe] text-xs truncate">{u.name}</div>
								<div class="text-[10px] text-slate-500 dark:text-[#b2acd6] truncate">{u.email}</div>
							</div>
						</div>
						<span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider {u.role === 'customer' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20' : 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200/60 dark:border-purple-500/20'}">
							{u.role === 'customer' ? 'Client' : 'Worker'}
						</span>
					</div>
				{:else}
					<p class="py-4 text-center text-slate-400 dark:text-[#77719f] text-xs font-medium">No users registered yet.</p>
				{/each}
			</div>
		</div>

		<!-- Recent Jobs Panel -->
		<div class="bg-white dark:bg-[#161138] border border-slate-200/80 dark:border-[#2c235b] rounded-xl p-3.5 sm:p-5 shadow-xs dark:shadow-xl space-y-3.5 sm:space-y-4">
			<div class="flex items-center justify-between border-b border-slate-100 dark:border-[#2c235b] pb-3">
				<h3 class="font-bold text-slate-900 dark:text-[#faf9fe] text-sm sm:text-base flex items-center gap-2">
					<div class="p-1.5 bg-purple-50 dark:bg-purple-500/10 text-[#7261ef] rounded-lg">
						<Briefcase size={16} />
					</div>
					<span>Latest Job Posts</span>
				</h3>
				<button onclick={onviewalljobs} class="px-2.5 sm:px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 text-[#7261ef] dark:text-purple-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
					<span>View All</span>
					<ArrowRight size={12} />
				</button>
			</div>

			<!-- Desktop Table -->
			<div class="hidden sm:block overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead class="bg-slate-100 dark:bg-[#211a4e]/70 text-slate-700 dark:text-[#b2acd6] uppercase tracking-wider border-b border-slate-200 dark:border-[#2c235b] text-[11px]">
						<tr>
							<th class="py-3 px-4 font-bold rounded-l-lg">Title</th>
							<th class="py-3 px-4 font-bold">Budget</th>
							<th class="py-3 px-4 font-bold rounded-r-lg">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-[#2c235b]/60 text-slate-700 dark:text-[#b2acd6]">
						{#each jobs.slice(0, 5) as j}
							<tr class="hover:bg-slate-50/80 dark:hover:bg-[#211a4e]/40 transition-colors">
								<td class="py-3 px-4">
									<div class="font-bold text-slate-900 dark:text-[#faf9fe] max-w-[200px] truncate">{j.title}</div>
									<div class="text-[11px] text-slate-500 dark:text-[#b2acd6] font-medium">{j.category || 'General'} • {j.location || 'PH'}</div>
								</td>
								<td class="py-3 px-4 font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(j.budget)}</td>
								<td class="py-3 px-4">
									<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider {j.status === 'open' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20' : j.status === 'in_progress' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20'}">
										{j.status}
									</span>
								</td>
							</tr>
						{:else}
							<tr><td colspan="3" class="py-6 text-center text-slate-400 dark:text-[#77719f] font-medium">No job postings created yet.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Mobile Compact List -->
			<div class="sm:hidden space-y-2">
				{#each jobs.slice(0, 5) as j}
					<div class="p-2.5 bg-slate-50 dark:bg-[#211a4e]/60 border border-slate-200/80 dark:border-[#2c235b] rounded-lg flex items-center justify-between gap-2 text-xs">
						<div class="min-w-0 flex-1">
							<div class="font-bold text-slate-900 dark:text-[#faf9fe] text-xs truncate">{j.title}</div>
							<div class="text-[10px] text-slate-500 dark:text-[#b2acd6] font-medium flex items-center gap-1.5 mt-0.5">
								<span>{j.category || 'General'}</span>
								<span>•</span>
								<span class="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(j.budget)}</span>
							</div>
						</div>
						<span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider {j.status === 'open' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20' : j.status === 'in_progress' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20'}">
							{j.status}
						</span>
					</div>
				{:else}
					<p class="py-4 text-center text-slate-400 dark:text-[#77719f] text-xs font-medium">No job postings created yet.</p>
				{/each}
			</div>
		</div>
	</div>
</div>
