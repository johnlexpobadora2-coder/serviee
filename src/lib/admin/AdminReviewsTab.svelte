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
							onclick={() => onopendelete('review', r.id, `Review by ${r.customer_name}`)}
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
