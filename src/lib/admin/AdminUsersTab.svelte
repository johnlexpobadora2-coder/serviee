<script>
	import { fade } from 'svelte/transition';
	import { Search, Pencil, Trash2, KeyRound } from 'lucide-svelte';

	let { 
		userSearch = $bindable(''), 
		userRoleFilter = $bindable('all'), 
		filteredUsers = [], 
		totalUsersCount = 0, 
		customerCount = 0, 
		workerCount = 0, 
		onopeneditaddress, 
		onopenresetpassword,
		onopendelete 
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
</script>

<div class="space-y-3.5 sm:space-y-4" transition:fade={{ duration: 150 }}>
	<!-- Search & Filters Bar -->
	<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#161138] border border-slate-200 dark:border-[#2c235b] p-3.5 sm:p-4 rounded-xl shadow-xs dark:shadow-xl transition-all">
		<div class="relative w-full sm:w-96">
			<Search size={15} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#77719f]" />
			<input 
				type="text" 
				bind:value={userSearch} 
				placeholder="Search by name, email, phone..." 
				class="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#211a4e] border border-slate-300 dark:border-[#2c235b] rounded-lg text-slate-900 dark:text-[#faf9fe] placeholder-slate-400 dark:placeholder-[#77719f] text-xs focus:outline-none focus:bg-white dark:focus:bg-[#211a4e] focus:border-[#7261ef] focus:ring-2 focus:ring-[#7261ef]/20 transition-all font-medium"
			/>
		</div>

		<div class="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
			<span class="text-xs text-slate-600 dark:text-[#b2acd6] font-semibold shrink-0">Filter:</span>
			<select 
				bind:value={userRoleFilter}
				class="bg-slate-50 dark:bg-[#211a4e] border border-slate-300 dark:border-[#2c235b] text-slate-900 dark:text-[#faf9fe] text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:bg-white dark:focus:bg-[#211a4e] focus:border-[#7261ef] focus:ring-2 focus:ring-[#7261ef]/20 flex-1 sm:flex-initial cursor-pointer font-semibold"
			>
				<option value="all">All Roles ({totalUsersCount})</option>
				<option value="customer">Clients ({customerCount})</option>
				<option value="worker">Workers ({workerCount})</option>
			</select>
		</div>
	</div>

	<!-- Scrollable Users Table View (Active for All Screens) -->
	<div class="bg-white dark:bg-[#161138] border border-slate-200 dark:border-[#2c235b] rounded-xl shadow-xs dark:shadow-xl overflow-hidden">
		<div class="overflow-x-auto w-full">
			<table class="w-full min-w-200 text-left text-xs table-auto">
				<thead class="bg-slate-100 dark:bg-[#211a4e]/70 text-slate-700 dark:text-[#b2acd6] uppercase tracking-wider border-b border-slate-200 dark:border-[#2c235b] text-[11px]">
					<tr>
						<th class="py-3.5 px-4 font-bold whitespace-nowrap min-w-55">User Details</th>
						<th class="py-3.5 px-4 font-bold whitespace-nowrap min-w-25">Role</th>
						<th class="py-3.5 px-4 font-bold whitespace-nowrap min-w-30">Phone</th>
						<th class="py-3.5 px-4 font-bold whitespace-nowrap min-w-45">Address</th>
						<th class="py-3.5 px-4 font-bold whitespace-nowrap min-w-35">Joined Date</th>
						<th class="py-3.5 px-4 font-bold whitespace-nowrap text-right min-w-32.5">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-[#2c235b]/60 text-slate-700 dark:text-[#b2acd6]">
					{#each filteredUsers as u}
						<tr class="hover:bg-slate-50/80 dark:hover:bg-[#211a4e]/40 transition-colors">
							<td class="py-3.5 px-4">
								<div class="flex items-center gap-2.5 sm:gap-3">
									<div class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-linear-to-br from-[#7261ef] to-purple-600 text-white font-bold flex items-center justify-center text-xs sm:text-sm shadow-xs shrink-0">
										{u.name?.charAt(0) || 'U'}
									</div>
									<div class="min-w-0 max-w-50">
										<div class="font-bold text-slate-900 dark:text-[#faf9fe] text-xs sm:text-sm truncate">{u.name}</div>
										<div class="text-slate-500 dark:text-[#b2acd6] font-medium text-[11px] truncate">{u.email}</div>
										<div class="text-[10px] text-slate-400 dark:text-[#77719f] font-mono mt-0.5 truncate">ID: {u.id}</div>
									</div>
								</div>
							</td>
							<td class="py-3.5 px-4 whitespace-nowrap">
								<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize {u.role === 'customer' ? 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'}">
									{u.role === 'customer' ? 'Client' : 'Worker'}
								</span>
							</td>
							<td class="py-3.5 px-4 text-slate-600 dark:text-[#b2acd6] font-medium whitespace-nowrap">{u.phone || 'N/A'}</td>
							<td class="py-3.5 px-4 text-slate-600 dark:text-[#b2acd6] font-medium max-w-50 truncate">{u.address || 'No address set'}</td>
							<td class="py-3.5 px-4 text-slate-500 dark:text-[#77719f] font-medium whitespace-nowrap">{formatDate(u.created_at)}</td>
							<td class="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
								<button 
									onclick={() => onopenresetpassword(u)}
									class="p-1.5 sm:p-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-200/60 dark:border-amber-500/20 transition-all font-semibold inline-flex items-center cursor-pointer shadow-xs"
									title="Reset / Change Password"
									aria-label="Reset Password"
								>
									<KeyRound size={14} />
								</button>
								<button 
									onclick={() => onopeneditaddress(u)}
									class="p-1.5 sm:p-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 text-[#7261ef] dark:text-purple-400 rounded-lg border border-purple-200/60 dark:border-purple-500/20 transition-all font-semibold inline-flex items-center cursor-pointer shadow-xs"
									title="Edit Address"
									aria-label="Edit Address"
								>
									<Pencil size={14} />
								</button>
								<button 
									onclick={() => onopendelete('user', u.id, u.name)}
									class="px-2.5 sm:px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200/60 dark:border-red-500/20 transition-all font-semibold inline-flex items-center gap-1 cursor-pointer shadow-xs"
									title="Delete User"
									aria-label="Delete User"
								>
									<Trash2 size={14} />
									<span class="text-xs">Delete</span>
								</button>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="py-8 text-center text-slate-400 dark:text-[#77719f] font-medium">No matching users found.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
