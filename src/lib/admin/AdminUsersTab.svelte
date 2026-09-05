<script>
	import { fade } from 'svelte/transition';
	import { Search, Pencil, Trash2 } from 'lucide-svelte';

	let { 
		userSearch = $bindable(''), 
		userRoleFilter = $bindable('all'), 
		filteredUsers = [], 
		totalUsersCount = 0, 
		customerCount = 0, 
		workerCount = 0, 
		onopeneditaddress, 
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
				<option value="all">All Roles ({totalUsersCount})</option>
				<option value="customer">Clients ({customerCount})</option>
				<option value="worker">Workers ({workerCount})</option>
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
									onclick={() => onopeneditaddress(u)}
									class="p-1.5 bg-[#7261ef]/10 hover:bg-[#7261ef]/20 text-[#7261ef] rounded-lg border border-[#7261ef]/20 transition-all font-semibold inline-flex items-center"
									title="Edit Address"
								>
									<Pencil size={14} />
								</button>
								<button 
									onclick={() => onopendelete('user', u.id, u.name)}
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
							onclick={() => onopeneditaddress(u)}
							class="p-1.5 bg-[#7261ef]/10 hover:bg-[#7261ef]/20 text-[#7261ef] rounded-lg border border-[#7261ef]/20 transition-all inline-flex items-center"
							title="Edit Address"
						>
							<Pencil size={12} />
						</button>
						<button 
							onclick={() => onopendelete('user', u.id, u.name)}
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
