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
		<div class="w-full max-w-sm sm:max-w-md bg-white dark:bg-[#1c1827] border border-slate-200/80 dark:border-[#352c4a] rounded-2xl p-6 text-center space-y-4 shadow-2xl transition-all my-auto" transition:scale={{ duration: 75, start: 0.98 }}>
			<div class="space-y-1">
				<h3 class="text-lg font-bold text-slate-900 dark:text-[#f8f6fc]">Confirm Deletion</h3>
				<p class="text-xs text-slate-500 dark:text-[#b5adc9] font-medium">Are you sure you want to delete <strong class="text-slate-900 dark:text-[#f8f6fc] font-bold">{deleteModal.name}</strong>? This action cannot be undone.</p>
			</div>

			<div class="flex items-center justify-center gap-3 pt-2">
				<button 
					type="button" 
					onclick={onclose}
					class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#272138] dark:hover:bg-[#2b2266] text-slate-700 dark:text-[#f8f6fc] border border-slate-200 dark:border-[#352c4a] rounded-lg text-xs font-bold transition-all cursor-pointer"
				>
					Cancel
				</button>

				{#if deleteModal.type === 'user'}
					<form method="POST" action="?/deleteUser" use:enhance={() => { onclose(); }}>
						<input type="hidden" name="userId" value={deleteModal.id} />
						<button type="submit" class="px-4 py-2.5 bg-[#8b5cf6] hover:bg-[#6251df] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-[#8b5cf6]/25 cursor-pointer">
							Delete User
						</button>
					</form>
				{:else if deleteModal.type === 'job'}
					<form method="POST" action="?/deleteJob" use:enhance={() => { onclose(); }}>
						<input type="hidden" name="jobId" value={deleteModal.id} />
						<button type="submit" class="px-4 py-2.5 bg-[#8b5cf6] hover:bg-[#6251df] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-[#8b5cf6]/25 cursor-pointer">
							Delete Job
						</button>
					</form>
				{:else if deleteModal.type === 'review'}
					<form method="POST" action="?/deleteReview" use:enhance={() => { onclose(); }}>
						<input type="hidden" name="reviewId" value={deleteModal.id} />
						<button type="submit" class="px-4 py-2.5 bg-[#8b5cf6] hover:bg-[#6251df] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-[#8b5cf6]/25 cursor-pointer">
							Delete Review
						</button>
					</form>
				{:else if deleteModal.type === 'support'}
					<form method="POST" action="?/deleteSupportTicket" use:enhance={() => { onclose(); }}>
						<input type="hidden" name="ticketId" value={deleteModal.id} />
						<button type="submit" class="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-red-500/25 cursor-pointer">
							Delete Inquiry
						</button>
					</form>
				{/if}
			</div>
		</div>
	</div>
{/if}
