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
	<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#161138] border border-slate-200 dark:border-[#2c235b] p-3.5 sm:p-4 rounded-xl shadow-xs dark:shadow-xl transition-all">
		<div class="relative w-full sm:w-96">
			<Search size={15} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#77719f]" />
			<input 
				type="text" 
				bind:value={jobSearch} 
				placeholder="Search title, category, location..." 
				class="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#211a4e] border border-slate-300 dark:border-[#2c235b] rounded-lg text-slate-900 dark:text-[#faf9fe] placeholder-slate-400 dark:placeholder-[#77719f] text-xs focus:outline-none focus:bg-white dark:focus:bg-[#211a4e] focus:border-[#7261ef] focus:ring-2 focus:ring-[#7261ef]/20 transition-all font-medium"
			/>
		</div>

		<div class="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
			<span class="text-xs text-slate-600 dark:text-[#b2acd6] font-semibold shrink-0">Status:</span>
			<select 
				bind:value={jobStatusFilter}
				class="bg-slate-50 dark:bg-[#211a4e] border border-slate-300 dark:border-[#2c235b] text-slate-900 dark:text-[#faf9fe] text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:bg-white dark:focus:bg-[#211a4e] focus:border-[#7261ef] focus:ring-2 focus:ring-[#7261ef]/20 flex-1 sm:flex-initial cursor-pointer font-semibold"
			>
				<option value="all">All Statuses</option>
				<option value="open">Open</option>
				<option value="assigned">Assigned</option>
				<option value="in_progress">In Progress</option>
				<option value="completed">Completed</option>
			</select>
		</div>
	</div>

	<!-- Scrollable Jobs Table (Active for All Screens) -->
	<div class="bg-white dark:bg-[#161138] border border-slate-200 dark:border-[#2c235b] rounded-xl shadow-xs dark:shadow-xl overflow-hidden">
		<div class="overflow-x-auto w-full">
			<table class="w-full min-w-[850px] text-left text-xs table-auto">
				<thead class="bg-slate-100 dark:bg-[#211a4e]/70 text-slate-700 dark:text-[#b2acd6] uppercase tracking-wider border-b border-slate-200 dark:border-[#2c235b] text-[11px]">
					<tr>
						<th class="py-3.5 px-4 font-bold whitespace-nowrap min-w-[220px]">Job Info</th>
						<th class="py-3.5 px-4 font-bold whitespace-nowrap min-w-[110px]">Category</th>
						<th class="py-3.5 px-4 font-bold whitespace-nowrap min-w-[130px]">Location</th>
						<th class="py-3.5 px-4 font-bold whitespace-nowrap min-w-[110px]">Budget</th>
						<th class="py-3.5 px-4 font-bold whitespace-nowrap text-center min-w-[90px]">Applicants</th>
						<th class="py-3.5 px-4 font-bold whitespace-nowrap min-w-[150px]">Status Update</th>
						<th class="py-3.5 px-4 font-bold whitespace-nowrap text-right min-w-[110px]">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-[#2c235b]/60 text-slate-700 dark:text-[#b2acd6]">
					{#each filteredJobs as j}
						<tr class="hover:bg-slate-50/80 dark:hover:bg-[#211a4e]/40 transition-colors">
							<td class="py-3.5 px-4">
								<div class="font-bold text-slate-900 dark:text-[#faf9fe] text-xs sm:text-sm max-w-xs truncate">{j.title}</div>
								<div class="text-[10px] text-slate-400 dark:text-[#77719f] font-mono mt-0.5 whitespace-nowrap">ID: {j.id} • Posted: {formatDate(j.created_at)}</div>
								<div class="text-xs text-slate-500 dark:text-[#b2acd6] font-medium max-w-xs truncate mt-0.5">{j.description || 'No description.'}</div>
							</td>
							<td class="py-3.5 px-4 whitespace-nowrap">
								<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 capitalize">
									{j.category || 'General'}
								</span>
							</td>
							<td class="py-3.5 px-4 text-slate-600 dark:text-[#b2acd6] font-medium whitespace-nowrap">{j.location || 'N/A'}</td>
							<td class="py-3.5 px-4 font-extrabold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm whitespace-nowrap">{formatCurrency(j.budget)}</td>
							<td class="py-3.5 px-4 text-center whitespace-nowrap">
								<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
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
										class="w-full min-w-[130px] bg-slate-50 dark:bg-[#211a4e] border border-slate-300 dark:border-[#2c235b] text-slate-900 dark:text-[#faf9fe] text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#7261ef] focus:ring-2 focus:ring-[#7261ef]/20 font-semibold cursor-pointer"
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
									class="px-2.5 sm:px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200/60 dark:border-red-500/20 transition-all font-semibold inline-flex items-center gap-1 cursor-pointer shadow-xs"
									title="Delete Job Post"
									aria-label="Delete Job Post"
								>
									<Trash2 size={14} />
									<span class="text-xs">Delete</span>
								</button>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="7" class="py-8 text-center text-slate-400 dark:text-[#77719f] font-medium">No job posts found.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
