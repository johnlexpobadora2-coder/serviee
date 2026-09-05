<script>
	import { fade } from 'svelte/transition';
	import { Activity, Settings, RefreshCw, Lock } from 'lucide-svelte';

	let { onlock } = $props();
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6" transition:fade={{ duration: 150 }}>
	<div class="bg-[#161b26] border border-[#272d3d] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl space-y-3.5">
		<h3 class="font-bold text-white text-sm sm:text-base flex items-center gap-2">
			<Activity size={17} class="text-[#7261ef]" />
			<span>Platform Diagnostics</span>
		</h3>

		<div class="divide-y divide-[#272d3d] text-xs">
			<div class="py-2.5 flex items-center justify-between">
				<span class="text-slate-400">Environment</span>
				<span class="px-2 py-1 bg-[#1f2430] text-slate-200 rounded-lg font-semibold text-[11px]">Production / Vite</span>
			</div>
			<div class="py-2.5 flex items-center justify-between">
				<span class="text-slate-400">Database Engine</span>
				<span class="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg font-semibold text-[11px]">Supabase PostgreSQL</span>
			</div>
			<div class="py-2.5 flex items-center justify-between">
				<span class="text-slate-400">Secret Route</span>
				<span class="font-mono text-[#7261ef]">/admin05</span>
			</div>
			<div class="py-2.5 flex items-center justify-between">
				<span class="text-slate-400">Passcode Protection</span>
				<span class="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-semibold text-[11px]">Active (1473)</span>
			</div>
		</div>
	</div>

	<div class="bg-[#161b26] border border-[#272d3d] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl space-y-3.5">
		<h3 class="font-bold text-white text-base flex items-center gap-2">
			<Settings size={17} class="text-[#7261ef]" />
			<span>Quick Admin Actions</span>
		</h3>

		<div class="space-y-2.5">
			<button 
				onclick={() => window.location.reload()}
				class="w-full p-2.5 sm:p-3 bg-[#1f2430] hover:bg-[#272d3d] text-slate-200 rounded-xl border border-[#272d3d] transition-all text-xs font-semibold flex items-center justify-center gap-2"
			>
				<RefreshCw size={15} class="text-[#7261ef]" />
				<span>Refresh Metrics & Purge Cache</span>
			</button>

			<button 
				onclick={onlock}
				class="w-full p-2.5 sm:p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all text-xs font-semibold flex items-center justify-center gap-2"
			>
				<Lock size={15} />
				<span>Lock Secret Admin Session</span>
			</button>
		</div>
	</div>
</div>
