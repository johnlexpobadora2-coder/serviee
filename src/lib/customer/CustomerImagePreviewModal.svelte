<script>
	import { X } from 'lucide-svelte';

	let { 
		previewImageModalUrl = $bindable(null) 
	} = $props();
</script>

{#if previewImageModalUrl}
	<div 
		class="image-preview-modal-backdrop" 
		onclick={() => previewImageModalUrl = null} 
		role="dialog" 
		aria-modal="true"
		tabindex="-1"
	>
		<div class="image-preview-modal-content" onclick={(e) => e.stopPropagation()} role="document">
			<button 
				type="button" 
				class="image-preview-close-btn" 
				onclick={() => previewImageModalUrl = null} 
				aria-label="Close image preview"
			>
				<X size={20} />
			</button>
			<img src={previewImageModalUrl} alt="Enlarged photo preview" class="image-preview-full-img" />
		</div>
	</div>
{/if}
