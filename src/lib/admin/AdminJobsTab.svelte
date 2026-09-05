<script>
	import { fade } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { Search, Trash2 } from 'lucide-svelte';

	let { 
		jobSearch = $bindable(''), 
		jobStatusFilter = $bindable('all'), 
		filteredJobs = [], 
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

	function formatCurrency(val) {
		const num = parseFloat(val) || 0;
		return '₱' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}
</script>

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
									onclick={() => onopendelete('job', j.id, j.title)}
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
						onclick={() => onopendelete('job', j.id, j.title)}
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
