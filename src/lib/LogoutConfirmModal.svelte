<script>
	import { fade, scale } from 'svelte/transition';

	let {
		show = $bindable(false),
		onConfirm
	} = $props();

	let isLoggingOut = $state(false);

	function handleClose() {
		if (isLoggingOut) return;
		show = false;
	}

	async function handleConfirm() {
		if (isLoggingOut) return;
		isLoggingOut = true;
		if (onConfirm) {
			await onConfirm();
		}
	}

	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}

	function handleKeydown(e) {
		if (e.key === 'Escape') {
			handleClose();
		}
	}
</script>

{#if show}
	<div 
		class="fixed inset-0 bg-black/75 backdrop-blur-xs z-99999 flex items-center justify-center p-4 box-border" 
		onclick={handleBackdropClick} 
		onkeydown={handleKeydown}
		role="dialog" 
		aria-modal="true"
		tabindex="-1"
		transition:fade={{ duration: 75 }}
	>
		<div 
			class="max-w-110 w-full border border-(--border-color) shadow-(--shadow-lg) p-7 text-center rounded-lg bg-(--bg-card) box-border card" 
			role="document"
			transition:scale={{ duration: 75, start: 0.98 }}
		>
			<h3 class="text-[1.25rem] font-bold text-(--text-primary) mb-2">Log Out of Serviee?</h3>
			
			<p class="text-[0.9rem] text-(--text-secondary) leading-normal mb-6">
				Are you sure you want to log out? You will need to enter your email and password to log in again.
			</p>

			<div class="flex gap-3 justify-center">
				<button 
					type="button" 
					class="btn btn-secondary py-2 px-5 text-[0.9rem]" 
					onclick={handleClose}
					disabled={isLoggingOut}
				>
					Cancel
				</button>

				<button 
					type="button" 
					class="btn btn-danger bg-red-500 hover:bg-red-600 border-0 text-white py-2 px-5 text-[0.9rem] inline-flex items-center gap-1.5 font-semibold cursor-pointer shadow-xs" 
					onclick={handleConfirm}
					disabled={isLoggingOut}
				>
					{#if isLoggingOut}
						<span class="spinner spinner-sm"></span>
						<span>Logging out...</span>
					{:else}
						<span>Confirm</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
