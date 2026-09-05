<script>
	import { fade, scale } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { AlertTriangle } from 'lucide-svelte';

	let { 
		deleteModal = $bindable({ open: false, type: null, id: null, name: '' }), 
		onclose 
	} = $props();
</script>

{#if deleteModal.open}
	<div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" transition:fade={{ duration: 150 }}>
		<div class="w-full max-w-sm sm:max-w-md bg-[#161b26] border border-[#272d3d] rounded-2xl p-5 sm:p-6 text-center space-y-3.5 shadow-2xl" transition:scale={{ duration: 150, start: 0.95 }}>
			<div class="w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-red-500/10 text-red-400 rounded-full flex items-center justify-center">
				<AlertTriangle size={22} />
			</div>

			<h3 class="text-base sm:text-lg font-bold text-white">Confirm Deletion</h3>
			<p class="text-xs text-slate-400">Are you sure you want to delete <strong class="text-white">{deleteModal.name}</strong>? This action cannot be undone.</p>

			<div class="flex items-center justify-center gap-2.5 pt-1">
				<button 
					type="button"
					onclick={onclose}
					class="px-4 py-2 bg-[#1f2430] hover:bg-[#272d3d] text-slate-300 rounded-xl text-xs font-semibold transition-all"
				>
					Cancel
				</button>

				{#if deleteModal.type === 'user'}
					<form method="POST" action="?/deleteUser" use:enhance={() => { onclose(); }}>
						<input type="hidden" name="userId" value={deleteModal.id} />
						<button type="submit" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-red-500/25">
							Delete User
						</button>
					</form>
				{:else if deleteModal.type === 'job'}
					<form method="POST" action="?/deleteJob" use:enhance={() => { onclose(); }}>
						<input type="hidden" name="jobId" value={deleteModal.id} />
						<button type="submit" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-red-500/25">
							Delete Job
						</button>
					</form>
				{:else if deleteModal.type === 'review'}
					<form method="POST" action="?/deleteReview" use:enhance={() => { onclose(); }}>
						<input type="hidden" name="reviewId" value={deleteModal.id} />
						<button type="submit" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-red-500/25">
							Delete Review
						</button>
					</form>
				{/if}
			</div>
		</div>
	</div>
{/if}
