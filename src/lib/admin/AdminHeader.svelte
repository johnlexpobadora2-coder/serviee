<script>
	import { ExternalLink, Lock } from 'lucide-svelte';

	let { onlock } = $props();
</script>

<!-- Top Header Navigation Bar (Compact & Mobile-Optimized) -->
<header class="bg-[#161b26] border border-[#272d3d] rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
	<div class="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-4">
		<div class="flex items-center gap-2">
			<a href="/" class="flex items-center gap-1.5 text-xl sm:text-2xl font-extrabold tracking-tight">
				<span class="bg-gradient-to-r from-slate-100 to-[#7261ef] bg-clip-text text-transparent">Serviee</span>
				<span class="w-2 h-2 rounded-full bg-[#7261ef] shadow-[0_0_12px_#7261ef]"></span>
			</a>
			<span class="px-2 py-0.5 bg-[#7261ef]/15 border border-[#7261ef]/30 text-[#7261ef] font-bold text-[10px] sm:text-xs rounded-full uppercase tracking-wider">
				ADMIN05
			</span>
		</div>
		<div class="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[11px] font-semibold">
			<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
			<span class="hidden sm:inline">Live System Connected</span>
			<span class="sm:hidden">Live</span>
		</div>
	</div>

	<div class="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
		<a 
			href="/" 
			target="_blank" 
			class="px-3 py-2 bg-[#1f2430] hover:bg-[#272d3d] text-slate-200 text-xs font-medium rounded-xl border border-[#272d3d] transition-all flex items-center justify-center gap-1.5 text-center"
		>
			<ExternalLink size={14} class="shrink-0" />
			<span class="truncate">Open Public App</span>
		</a>
		<button 
			onclick={onlock}
			class="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-xl border border-red-500/20 transition-all flex items-center justify-center gap-1.5 text-center"
		>
			<Lock size={14} class="shrink-0" />
			<span>Lock Panel</span>
		</button>
	</div>
</header>
