<script>
	import { fade } from 'svelte/transition';
	import { Activity, Settings, RefreshCw, Lock } from 'lucide-svelte';

	let { onlock } = $props();
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start" transition:fade={{ duration: 150 }}>
	<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-xs dark:shadow-xl space-y-4">
		<h3 class="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
			<div class="p-1.5 bg-purple-50 dark:bg-purple-500/10 text-[#7261ef] rounded-lg">
				<Activity size={17} />
			</div>
			<span>Platform Diagnostics</span>
		</h3>

		<div class="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
			<div class="py-3 flex items-center justify-between">
				<span class="text-slate-500 dark:text-slate-400 font-semibold">Environment</span>
				<span class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-[11px]">Production / Vite</span>
			</div>
			<div class="py-3 flex items-center justify-between">
				<span class="text-slate-500 dark:text-slate-400 font-semibold">Database Engine</span>
				<span class="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20 rounded-lg font-bold text-[11px]">Supabase PostgreSQL</span>
			</div>
			<div class="py-3 flex items-center justify-between">
				<span class="text-slate-500 dark:text-slate-400 font-semibold">Secret Route</span>
				<span class="font-mono text-[#7261ef] font-bold text-xs bg-purple-50 dark:bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-200/60 dark:border-purple-500/20">/admin05</span>
			</div>
			<div class="py-3 flex items-center justify-between">
				<span class="text-slate-500 dark:text-slate-400 font-semibold">Passcode Protection</span>
				<span class="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20 rounded-lg font-bold text-[11px]">Active (1473)</span>
			</div>
		</div>
	</div>

	<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-xs dark:shadow-xl space-y-4">
		<h3 class="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
			<div class="p-1.5 bg-purple-50 dark:bg-purple-500/10 text-[#7261ef] rounded-lg">
				<Settings size={17} />
			</div>
			<span>Quick Admin Actions</span>
		</h3>

		<div class="space-y-3 pt-1">
			<button 
				onclick={() => window.location.reload()}
				class="w-full p-3 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 rounded-lg border border-slate-200/80 dark:border-slate-700 transition-all text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
			>
				<RefreshCw size={15} class="text-[#7261ef]" />
				<span>Refresh Metrics & Purge Cache</span>
			</button>

			<button 
				onclick={onlock}
				class="w-full p-3 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200/60 dark:border-red-500/20 transition-all text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
			>
				<Lock size={15} />
				<span>Lock Secret Admin Session</span>
			</button>
		</div>
	</div>
</div>
