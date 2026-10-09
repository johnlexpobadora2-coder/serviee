<script>
	import { X } from 'lucide-svelte';

	let { 
		isOpen = false, 
		imageUrl = '', 
		title = 'Profile Photo',
		onclose = () => {} 
	} = $props();

	function handleKeydown(e) {
		if (e.key === 'Escape' && isOpen) {
			onclose?.();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && imageUrl}
	<div 
		class="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
		role="dialog"
		aria-modal="true"
		aria-label={title || "Profile photo preview"}
	>
		<!-- Backdrop click to close -->
		<button
			type="button"
			class="fixed inset-0 w-full h-full bg-transparent border-0 cursor-default"
			onclick={() => onclose?.()}
			aria-label="Close photo preview"
		></button>

		<div class="relative z-10 max-w-sm w-full bg-(--bg-card) border border-(--border-color) rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
			<!-- Close Button -->
			<button 
				type="button" 
				class="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-(--text-primary) flex items-center justify-center transition-colors cursor-pointer"
				onclick={() => onclose?.()}
				aria-label="Close"
			>
				<X size={18} />
			</button>

			<h4 class="m-0 text-base font-semibold text-(--text-primary) text-center truncate max-w-[80%]">
				{title || 'Profile Photo'}
			</h4>

			<!-- High-Resolution Circular Avatar View -->
			<div class="w-48 h-48 sm:w-56 sm:h-56 rounded-full border-4 border-(--bg-card) shadow-lg overflow-hidden bg-black/5 ring-1 ring-black/10">
				<img 
					src={imageUrl} 
					alt={title || 'Profile Avatar'} 
					class="w-full h-full object-cover" 
				/>
			</div>

			<button 
				type="button" 
				class="btn btn-secondary btn-sm py-1.5 px-4 text-xs mt-1 cursor-pointer"
				onclick={() => onclose?.()}
			>
				Close
			</button>
		</div>
	</div>
{/if}
