<script>
	import { fade, scale } from 'svelte/transition';
	import { enhance } from '$app/forms';

	let { 
		deleteModal = $bindable({ open: false, type: null, id: null, name: '' }), 
		onclose 
	} = $props();
</script>

{#if deleteModal.open}
	<div class="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto" transition:fade={{ duration: 75 }}>
		<div class="w-full max-w-sm sm:max-w-md bg-white dark:bg-[#161138] border border-slate-200/80 dark:border-[#2c235b] rounded-2xl p-6 text-center space-y-4 shadow-2xl transition-all my-auto" transition:scale={{ duration: 75, start: 0.98 }}>
			<div class="space-y-1">
				<h3 class="text-lg font-bold text-slate-900 dark:text-[#faf9fe]">Confirm Deletion</h3>
				<p class="text-xs text-slate-500 dark:text-[#b2acd6] font-medium">Are you sure you want to delete <strong class="text-slate-900 dark:text-[#faf9fe] font-bold">{deleteModal.name}</strong>? This action cannot be undone.</p>
			</div>

			<div class="flex items-center justify-center gap-3 pt-2">
				<button 
					type="button" 
					onclick={onclose}
					class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#211a4e] dark:hover:bg-[#2b2266] text-slate-700 dark:text-[#faf9fe] border border-slate-200 dark:border-[#2c235b] rounded-lg text-xs font-bold transition-all cursor-pointer"
				>
					Cancel
				</button>

				{#if deleteModal.type === 'user'}
					<form method="POST" action="?/deleteUser" use:enhance={() => { onclose(); }}>
						<input type="hidden" name="userId" value={deleteModal.id} />
						<button type="submit" class="px-4 py-2.5 bg-[#7261ef] hover:bg-[#6251df] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-[#7261ef]/25 cursor-pointer">
							Delete User
						</button>
					</form>
				{:else if deleteModal.type === 'job'}
					<form method="POST" action="?/deleteJob" use:enhance={() => { onclose(); }}>
						<input type="hidden" name="jobId" value={deleteModal.id} />
						<button type="submit" class="px-4 py-2.5 bg-[#7261ef] hover:bg-[#6251df] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-[#7261ef]/25 cursor-pointer">
							Delete Job
						</button>
					</form>
				{:else if deleteModal.type === 'review'}
					<form method="POST" action="?/deleteReview" use:enhance={() => { onclose(); }}>
						<input type="hidden" name="reviewId" value={deleteModal.id} />
						<button type="submit" class="px-4 py-2.5 bg-[#7261ef] hover:bg-[#6251df] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-[#7261ef]/25 cursor-pointer">
							Delete Review
						</button>
					</form>
				{/if}
			</div>
		</div>
	</div>
{/if}
