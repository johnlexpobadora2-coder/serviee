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
	<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-xl shadow-xs dark:shadow-xl transition-all">
		<div class="relative w-full sm:w-96">
			<Search size={15} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
			<input 
				type="text" 
				bind:value={jobSearch} 
				placeholder="Search title, category, location..." 
				class="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 text-xs focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#7261ef] focus:ring-2 focus:ring-[#7261ef]/20 transition-all font-medium"
			/>
		</div>

		<div class="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
			<span class="text-xs text-slate-600 dark:text-slate-400 font-semibold shrink-0">Status:</span>
			<select 
				bind:value={jobStatusFilter}
				class="bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#7261ef] focus:ring-2 focus:ring-[#7261ef]/20 flex-1 sm:flex-initial cursor-pointer font-semibold"
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
	<div class="hidden sm:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs dark:shadow-xl overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs">
				<thead class="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 text-[11px]">
					<tr>
						<th class="py-3.5 px-4 font-bold">Job Info</th>
						<th class="py-3.5 px-4 font-bold">Category</th>
						<th class="py-3.5 px-4 font-bold">Location</th>
						<th class="py-3.5 px-4 font-bold">Budget</th>
						<th class="py-3.5 px-4 font-bold">Applicants</th>
						<th class="py-3.5 px-4 font-bold">Status Update</th>
						<th class="py-3.5 px-4 font-bold text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
					{#each filteredJobs as j}
						<tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
							<td class="py-3.5 px-4">
								<div class="font-bold text-slate-900 dark:text-white text-sm">{j.title}</div>
								<div class="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">ID: {j.id} • Posted: {formatDate(j.created_at)}</div>
								<div class="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xs truncate mt-0.5">{j.description || 'No description.'}</div>
							</td>
							<td class="py-3.5 px-4 whitespace-nowrap">
								<span class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold">
									{j.category || 'General'}
								</span>
							</td>
							<td class="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">{j.location || 'N/A'}</td>
							<td class="py-3.5 px-4 font-extrabold text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">{formatCurrency(j.budget)}</td>
							<td class="py-3.5 px-4 whitespace-nowrap">
								<span class="px-2.5 py-1 bg-purple-50 dark:bg-purple-500/15 text-[#7261ef] dark:text-purple-300 font-bold rounded-lg text-xs border border-purple-200/60 dark:border-purple-500/20">
									{j.applicants?.length || 0}
								</span>
							</td>
							<td class="py-3.5 px-4 whitespace-nowrap">
								<form method="POST" action="?/updateJobStatus" use:enhance>
									<input type="hidden" name="jobId" value={j.id} />
									<select 
										name="status" 
										value={j.status}
										onchange={(e) => { e.currentTarget.closest('form')?.requestSubmit(); }}
										class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#7261ef] focus:ring-2 focus:ring-[#7261ef]/20 font-semibold cursor-pointer"
									>
										<option value="open">Open</option>
										<option value="assigned">Assigned</option>
										<option value="in_progress">In Progress</option>
										<option value="completed">Completed</option>
									</select>
								</form>
							</td>
							<td class="py-3.5 px-4 text-right whitespace-nowrap">
								<button 
									onclick={() => onopendelete('job', j.id, j.title)}
									class="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200/60 dark:border-red-500/20 transition-all font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
									title="Delete Job Post"
								>
									<Trash2 size={14} />
									<span>Delete</span>
								</button>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="7" class="py-8 text-center text-slate-400 font-medium">No job posts found.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Mobile Responsive Job Cards List -->
	<div class="sm:hidden space-y-2.5">
		{#each filteredJobs as j}
			<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
				<div class="flex items-start justify-between gap-2">
					<div class="min-w-0 flex-1">
						<div class="font-bold text-slate-900 dark:text-white text-xs truncate">{j.title}</div>
						<div class="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 mt-0.5 flex-wrap">
							<span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-[9px] font-bold">{j.category || 'General'}</span>
							<span>•</span>
							<span class="text-slate-500 dark:text-slate-400">{j.location || 'N/A'}</span>
							<span>•</span>
							<span class="text-slate-400">Posted: {formatDate(j.created_at)}</span>
						</div>
					</div>
					<div class="text-right shrink-0">
						<div class="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">{formatCurrency(j.budget)}</div>
						<div class="text-[9px] text-[#7261ef] font-bold">{j.applicants?.length || 0} applicants</div>
					</div>
				</div>

				{#if j.description}
					<p class="text-[11px] text-slate-600 dark:text-slate-400 font-medium line-clamp-2">{j.description}</p>
				{/if}

				<div class="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800">
					<form method="POST" action="?/updateJobStatus" use:enhance class="flex-1 mr-2">
						<input type="hidden" name="jobId" value={j.id} />
						<select 
							name="status" 
							value={j.status}
							onchange={(e) => { e.currentTarget.closest('form')?.requestSubmit(); }}
							class="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#7261ef] font-semibold cursor-pointer"
						>
							<option value="open">Status: Open</option>
							<option value="assigned">Status: Assigned</option>
							<option value="in_progress">Status: In Progress</option>
							<option value="completed">Status: Completed</option>
						</select>
					</form>

					<button 
						onclick={() => onopendelete('job', j.id, j.title)}
						class="px-2.5 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg border border-red-200/60 dark:border-red-500/20 text-xs font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
					>
						<Trash2 size={12} />
						<span>Delete</span>
					</button>
				</div>
			</div>
		{:else}
			<div class="py-8 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-medium">
				No job posts found.
			</div>
		{/each}
	</div>
</div>
