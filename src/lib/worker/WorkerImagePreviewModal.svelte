<script>
	import { X } from 'lucide-svelte';

	let { 
		previewImageModalUrl = $bindable(null) 
	} = $props();

	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			previewImageModalUrl = null;
		}
	}

	function handleKeydown(e) {
		if (e.key === 'Escape') {
			previewImageModalUrl = null;
		}
	}
</script>

<svelte:window onkeydown={previewImageModalUrl ? handleKeydown : undefined} />

{#if previewImageModalUrl}
	<div 
		class="image-preview-modal-backdrop" 
		onclick={handleBackdropClick} 
		onkeydown={handleKeydown}
		role="dialog" 
		aria-modal="true"
		tabindex="-1"
	>
		<div class="image-preview-modal-content" role="document">
			<button 
				type="button" 
				class="image-preview-close-btn" 
				onclick={() => previewImageModalUrl = null} 
				aria-label="Close image preview"
			>
				<X size={20} />
			</button>
			<img src={previewImageModalUrl} alt="Enlarged preview" class="image-preview-full-img" />
		</div>
	</div>
{/if}
