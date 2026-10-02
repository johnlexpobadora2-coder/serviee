<script>
	import { fade, scale } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { MapPin, CheckCircle, X } from 'lucide-svelte';
	import CityAutocomplete from '$lib/CityAutocomplete.svelte';

	let { 
		editAddressModal = $bindable({ open: false, userId: null, name: '', address: '' }), 
		onclose 
	} = $props();

	let isAddressValid = $state(true);

	$effect(() => {
		if (editAddressModal.open && editAddressModal.address) {
			isAddressValid = true;
		}
	});
</script>

{#if editAddressModal.open}
	<div class="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto" transition:fade={{ duration: 150 }}>
		<div class="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl transition-all my-auto" transition:scale={{ duration: 150, start: 0.95 }}>
			<div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
				<h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
					<div class="p-1.5 bg-purple-50 dark:bg-purple-500/10 text-[#7261ef] rounded-lg">
						<MapPin size={18} />
					</div>
					<span>Edit User Address</span>
				</h3>
				<button 
					type="button" 
					onclick={onclose} 
					class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer transition-colors"
					aria-label="Close"
				>
					<X size={16} />
				</button>
			</div>

			<p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
				Updating address for <strong class="text-slate-900 dark:text-white font-bold">{editAddressModal.name}</strong>
			</p>

			<form method="POST" action="?/updateUserAddress" use:enhance={({ cancel }) => { if (!editAddressModal.address || !isAddressValid) { cancel(); return; } onclose(); }} class="space-y-4">
				<input type="hidden" name="userId" value={editAddressModal.userId} />
				
				<div class="space-y-1.5">
					<label for="addressInput" class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">City / Municipality</label>
					<CityAutocomplete 
						bind:value={editAddressModal.address}
						bind:isValid={isAddressValid}
						name="address"
						id="addressInput"
						placeholder="Search city/municipality (e.g. Davao City, Cebu City, Makati)..."
						required={true}
					/>
				</div>

				<div class="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
					<button 
						type="button" 
						onclick={onclose}
						class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
					>
						Cancel
					</button>
					<button 
						type="submit" 
						class="px-4 py-2.5 bg-[#7261ef] hover:bg-[#8374f2] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-[#7261ef]/25 flex items-center gap-1.5 cursor-pointer"
					>
						<CheckCircle size={14} />
						<span>Save Address</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
