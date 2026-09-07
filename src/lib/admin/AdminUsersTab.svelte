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
	<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-xl shadow-xs dark:shadow-xl transition-all">
		<div class="relative w-full sm:w-96">
			<Search size={15} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
			<input 
				type="text" 
				bind:value={userSearch} 
				placeholder="Search by name, email, phone..." 
				class="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 text-xs focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#7261ef] focus:ring-2 focus:ring-[#7261ef]/20 transition-all font-medium"
			/>
		</div>

		<div class="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
			<span class="text-xs text-slate-600 dark:text-slate-400 font-semibold shrink-0">Filter:</span>
			<select 
				bind:value={userRoleFilter}
				class="bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#7261ef] focus:ring-2 focus:ring-[#7261ef]/20 flex-1 sm:flex-initial cursor-pointer font-semibold"
			>
				<option value="all">All Roles ({totalUsersCount})</option>
				<option value="customer">Clients ({customerCount})</option>
				<option value="worker">Workers ({workerCount})</option>
			</select>
		</div>
	</div>

	<!-- Desktop Users Table View -->
	<div class="hidden sm:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs dark:shadow-xl overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs">
				<thead class="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 text-[11px]">
					<tr>
						<th class="py-3.5 px-4 font-bold">User Details</th>
						<th class="py-3.5 px-4 font-bold">Role</th>
						<th class="py-3.5 px-4 font-bold">Phone</th>
						<th class="py-3.5 px-4 font-bold">Address</th>
						<th class="py-3.5 px-4 font-bold">Joined Date</th>
						<th class="py-3.5 px-4 font-bold text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
					{#each filteredUsers as u}
						<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
							<td class="py-3.5 px-4">
								<div class="flex items-center gap-3">
									<div class="w-9 h-9 rounded-full bg-gradient-to-br from-[#7261ef] to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
										{u.name?.charAt(0) || 'U'}
									</div>
									<div>
										<div class="font-bold text-slate-900 dark:text-white text-sm">{u.name}</div>
										<div class="text-slate-500 dark:text-slate-400 font-medium">{u.email}</div>
										<div class="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">ID: {u.id}</div>
									</div>
								</div>
							</td>
							<td class="py-3.5 px-4 whitespace-nowrap">
								<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider {u.role === 'customer' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20' : 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200/60 dark:border-purple-500/20'}">
									{u.role === 'customer' ? 'Client' : 'Worker'}
								</span>
							</td>
							<td class="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">{u.phone || 'N/A'}</td>
							<td class="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium max-w-[200px] truncate">{u.address || 'No address set'}</td>
							<td class="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">{formatDate(u.created_at)}</td>
							<td class="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
								<button 
									onclick={() => onopenresetpassword(u)}
									class="p-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-200/60 dark:border-amber-500/20 transition-all font-semibold inline-flex items-center cursor-pointer shadow-xs"
									title="Reset / Change Password"
								>
									<KeyRound size={14} />
								</button>
								<button 
									onclick={() => onopeneditaddress(u)}
									class="p-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 text-[#7261ef] dark:text-purple-400 rounded-lg border border-purple-200/60 dark:border-purple-500/20 transition-all font-semibold inline-flex items-center cursor-pointer shadow-xs"
									title="Edit Address"
								>
									<Pencil size={14} />
								</button>
								<button 
									onclick={() => onopendelete('user', u.id, u.name)}
									class="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200/60 dark:border-red-500/20 transition-all font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
									title="Delete User"
								>
									<Trash2 size={14} />
									<span>Delete</span>
								</button>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="py-8 text-center text-slate-400 font-medium">No matching users found.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Mobile Responsive User Cards List -->
	<div class="sm:hidden space-y-2.5">
		{#each filteredUsers as u}
			<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-2.5">
				<div class="flex items-start justify-between gap-2">
					<div class="flex items-center gap-2.5 min-w-0">
						<div class="w-9 h-9 rounded-full bg-gradient-to-br from-[#7261ef] to-purple-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
							{u.name?.charAt(0) || 'U'}
						</div>
						<div class="min-w-0">
							<div class="font-bold text-slate-900 dark:text-white text-xs truncate">{u.name}</div>
							<div class="text-[11px] text-slate-500 dark:text-slate-400 truncate">{u.email}</div>
						</div>
					</div>
					<span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider {u.role === 'customer' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20' : 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200/60 dark:border-purple-500/20'}">
						{u.role === 'customer' ? 'Client' : 'Worker'}
					</span>
				</div>

				<div class="text-[11px] text-slate-600 dark:text-slate-400 grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
					<div><span class="text-slate-400 font-semibold">Phone:</span> {u.phone || 'N/A'}</div>
					<div><span class="text-slate-400 font-semibold">Joined:</span> {formatDate(u.created_at)}</div>
					<div class="col-span-2 truncate"><span class="text-slate-400 font-semibold">Address:</span> {u.address || 'No address set'}</div>
				</div>

				<div class="flex items-center justify-between pt-1 gap-2 border-t border-slate-100/60 dark:border-slate-800/60">
					<span class="text-[9px] text-slate-400 font-mono truncate max-w-[80px]">ID: {u.id?.slice(0, 8)}...</span>
					<div class="flex items-center gap-1.5 shrink-0">
						<button 
							onclick={() => onopenresetpassword(u)}
							class="p-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-200/60 dark:border-amber-500/20"
							title="Reset Password"
							aria-label="Reset Password"
						>
							<KeyRound size={13} />
						</button>
						<button 
							onclick={() => onopeneditaddress(u)}
							class="p-1.5 bg-purple-50 dark:bg-purple-500/10 text-[#7261ef] dark:text-purple-400 rounded-lg border border-purple-200/60 dark:border-purple-500/20"
							title="Edit Address"
							aria-label="Edit Address"
						>
							<Pencil size={13} />
						</button>
						<button 
							onclick={() => onopendelete('user', u.id, u.name)}
							class="px-2 py-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg border border-red-200/60 dark:border-red-500/20 text-xs font-semibold inline-flex items-center gap-1"
						>
							<Trash2 size={12} />
							<span>Delete</span>
						</button>
					</div>
				</div>
			</div>
		{:else}
			<div class="py-8 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-medium">
				No matching users found.
			</div>
		{/each}
	</div>
</div>
