<script>
	import { fade } from 'svelte/transition';
	import { Search, Trash2 } from 'lucide-svelte';

	let { 
		reviewSearch = $bindable(''), 
		reviewRatingFilter = $bindable('all'), 
		filteredReviews = [], 
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
	<!-- Filter Bar -->
	<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-xl shadow-xs dark:shadow-xl transition-all">
		<div class="relative w-full sm:w-96">
			<Search size={15} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
			<input 
				type="text" 
				bind:value={reviewSearch} 
				placeholder="Search review text or users..." 
				class="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 text-xs focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#7261ef] focus:ring-2 focus:ring-[#7261ef]/20 transition-all font-medium"
			/>
		</div>

		<div class="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
			<span class="text-xs text-slate-600 dark:text-slate-400 font-semibold shrink-0">Rating:</span>
			<select 
				bind:value={reviewRatingFilter}
				class="bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#7261ef] focus:ring-2 focus:ring-[#7261ef]/20 flex-1 sm:flex-initial cursor-pointer font-semibold"
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
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
		{#each filteredReviews as r}
			<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs dark:shadow-xl flex flex-col justify-between space-y-3.5 hover:border-purple-300 dark:hover:border-purple-500/40 hover:shadow-md transition-all h-full">
				<div class="space-y-2.5">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-1 text-xs sm:text-sm {r.rating < 0 ? 'text-red-500' : 'text-amber-500 dark:text-amber-400'}">
							{#each Array(5) as _, i}
								<span class={i < Math.abs(r.rating) ? 'opacity-100' : 'opacity-20'}>★</span>
							{/each}
							<span class="text-[11px] ml-1 font-bold {r.rating < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}">({r.rating < 0 ? r.rating.toFixed(1) : `${r.rating}.0`})</span>
						</div>
						<button 
							onclick={() => onopendelete('review', r.id, `Review by ${r.customer_name}`)}
							class="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200/60 dark:border-red-500/20 transition-all cursor-pointer shrink-0"
							title="Delete Review"
						>
							<Trash2 size={13} />
						</button>
					</div>

					<p class="text-slate-700 dark:text-slate-300 text-xs italic font-medium line-clamp-3">"{r.review_text || 'No written text provided.'}"</p>
				</div>

				<div class="border-t border-slate-100 dark:border-slate-800 pt-2.5 text-[11px] text-slate-500 dark:text-slate-400 space-y-1 mt-auto">
					<div class="flex items-center justify-between gap-1.5 min-w-0">
						<span class="text-slate-900 dark:text-white font-bold truncate min-w-0 flex-1">Client: {r.customer_name}</span>
						<span class="shrink-0 text-slate-400">➔</span>
						<span class="text-[#7261ef] font-bold truncate min-w-0 flex-1 text-right">Worker: {r.worker_name}</span>
					</div>
					<div class="text-slate-400 text-[10px] font-medium">{formatDate(r.created_at)}</div>
				</div>
			</div>
		{:else}
			<div class="col-span-full py-8 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-medium">
				No reviews match your query.
			</div>
		{/each}
	</div>
</div>
