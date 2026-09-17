<script>
	import { toast } from '$lib/toast.svelte.js';
	import { fly, fade } from 'svelte/transition';
	import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-svelte';

	function getToastBg(type) {
		switch (type) {
			case 'success': return 'bg-(--success)';
			case 'error': return 'bg-(--error)';
			case 'warning': return 'bg-(--warning)';
			default: return 'bg-(--accent)';
		}
	}
</script>

{#if toast.toasts.length > 0}
	<div 
		class="fixed top-5 right-5 max-sm:top-4 max-sm:left-4 max-sm:right-4 max-sm:w-auto max-sm:max-w-none z-99999 flex flex-col gap-2 max-w-95 w-[calc(100vw-2.5rem)] pointer-events-none" 
		aria-live="polite" 
		aria-atomic="true"
	>
		{#each toast.toasts as t (t.id)}
			<div 
				class="pointer-events-auto relative flex items-center gap-3 py-3 px-3.5 max-sm:py-2.5 max-sm:px-3 rounded-md text-white shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xl border border-white/15 {getToastBg(t.type)}" 
				role="alert"
				in:fly={{ y: -20, duration: 200 }}
				out:fade={{ duration: 150 }}
			>
				<div class="shrink-0 flex items-center justify-center text-white">
					{#if t.type === 'success'}
						<CheckCircle2 size={18} />
					{:else if t.type === 'error'}
						<AlertCircle size={18} />
					{:else if t.type === 'warning'}
						<AlertTriangle size={18} />
					{:else}
						<Info size={18} />
					{/if}
				</div>

				<div class="flex-1 min-w-0">
					<p class="m-0 text-[0.88rem] max-sm:text-[0.84rem] leading-[1.35] font-medium text-white wrap-break-word">{t.message}</p>
				</div>

				<button 
					type="button" 
					class="shrink-0 bg-transparent border-none text-white/80 hover:text-white hover:bg-white/20 p-1 -m-1 rounded-sm cursor-pointer flex items-center justify-center transition-colors duration-150" 
					onclick={() => toast.remove(t.id)} 
					aria-label="Dismiss notification"
				>
					<X size={15} />
				</button>
			</div>
		{/each}
	</div>
{/if}
