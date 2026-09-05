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
				<div class="text-xl sm:text-3xl font-extrabold text-white mb-2">{stats.totalUsers || 0}</div>
			</div>
			<div class="flex flex-wrap items-center gap-1 text-[10px] sm:text-xs">
				<span class="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">{stats.totalCustomers || 0} Clients</span>
				<span class="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-medium">{stats.totalWorkers || 0} Workers</span>
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
				<div class="text-xl sm:text-3xl font-extrabold text-white mb-2">{stats.totalJobs || 0}</div>
			</div>
			<div class="flex flex-wrap items-center gap-1 text-[10px] sm:text-xs">
				<span class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">{stats.openJobs || 0} Open</span>
				<span class="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">{stats.inProgressJobs || 0} Active</span>
				<span class="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-medium">{stats.completedJobs || 0} Done</span>
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
				<div class="text-lg sm:text-2xl font-extrabold text-emerald-400 mb-1 truncate">{formatCurrency(stats.totalBudget)}</div>
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
				<div class="text-xl sm:text-3xl font-extrabold text-white mb-1">{stats.avgRating || '0.0'} <span class="text-slate-500 text-xs sm:text-base font-normal">/ 5</span></div>
			</div>
			<p class="text-[10px] sm:text-xs text-slate-500 truncate">{stats.totalReviews || 0} reviews</p>
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
				<button onclick={onviewallusers} class="text-xs font-medium text-[#7261ef] hover:text-[#8374f2] transition-colors flex items-center gap-1">
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
						{#each users.slice(0, 5) as u}
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
				{#each users.slice(0, 5) as u}
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
				<button onclick={onviewalljobs} class="text-xs font-medium text-[#7261ef] hover:text-[#8374f2] transition-colors flex items-center gap-1">
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
						{#each jobs.slice(0, 5) as j}
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
				{#each jobs.slice(0, 5) as j}
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
