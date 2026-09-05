<script>
	import { fade, scale } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { CITIES_MUNICIPALITIES } from '$lib/locations.js';
	import { MapPin, CheckCircle } from 'lucide-svelte';

	let { 
		editAddressModal = $bindable({ open: false, userId: null, name: '', address: '' }), 
		onclose 
	} = $props();
</script>

{#if editAddressModal.open}
	<div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" transition:fade={{ duration: 150 }}>
		<div class="w-full max-w-sm sm:max-w-md bg-[#161b26] border border-[#272d3d] rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl" transition:scale={{ duration: 150, start: 0.95 }}>
			<div class="flex items-center justify-between border-b border-[#272d3d] pb-3">
				<h3 class="text-base sm:text-lg font-bold text-white flex items-center gap-2">
					<MapPin size={18} class="text-[#7261ef]" />
					<span>Edit User Address</span>
				</h3>
				<button 
					type="button" 
					onclick={onclose}
					class="text-slate-400 hover:text-white text-xs p-1"
				>
					✕
				</button>
			</div>

			<p class="text-xs text-slate-400">
				Updating address for <strong class="text-white">{editAddressModal.name}</strong>
			</p>

			<form method="POST" action="?/updateUserAddress" use:enhance={() => { onclose(); }} class="space-y-4">
				<input type="hidden" name="userId" value={editAddressModal.userId} />
				
				<div class="space-y-1.5">
					<label for="addressInput" class="text-xs font-semibold text-slate-300">City / Municipality</label>
					<select 
						id="addressInput"
						name="address" 
						bind:value={editAddressModal.address}
						class="w-full px-3 py-2 bg-[#1f2430] border border-[#272d3d] rounded-xl text-white text-xs focus:outline-none focus:border-[#7261ef] transition-all cursor-pointer"
						required
					>
						<option value="" disabled selected={!editAddressModal.address}>Select City / Municipality...</option>
						{#each CITIES_MUNICIPALITIES as city}
							<option value={city}>{city}</option>
						{/each}
					</select>
				</div>

				<div class="flex items-center justify-end gap-2.5 pt-2 border-t border-[#272d3d]">
					<button 
						type="button"
						onclick={onclose}
						class="px-4 py-2 bg-[#1f2430] hover:bg-[#272d3d] text-slate-300 rounded-xl text-xs font-semibold transition-all"
					>
						Cancel
					</button>
					<button 
						type="submit" 
						class="px-4 py-2 bg-[#7261ef] hover:bg-[#8374f2] text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-[#7261ef]/25 flex items-center gap-1.5"
					>
						<CheckCircle size={14} />
						<span>Save Address</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
