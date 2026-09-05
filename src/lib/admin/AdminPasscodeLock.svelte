<script>
	import { fade, slide, scale } from 'svelte/transition';
	import { Shield, AlertTriangle, Unlock } from 'lucide-svelte';

	let { 
		passcode = $bindable(''), 
		passError = '', 
		onsubmit 
	} = $props();
</script>

<div class="py-12 min-h-[70vh] flex items-center justify-center p-4" transition:fade={{ duration: 150 }}>
	<div class="w-full max-w-md bg-[#131722] border border-[#222736] rounded-2xl p-8 shadow-2xl text-center relative overflow-hidden" transition:scale={{ duration: 200, start: 0.95 }}>
		<!-- Top Accent Line -->
		<div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7261ef] via-purple-500 to-[#7261ef]"></div>

		<div class="w-16 h-16 mx-auto mb-5 bg-[#7261ef]/15 border border-[#7261ef]/30 text-[#7261ef] rounded-2xl flex items-center justify-center shadow-lg shadow-[#7261ef]/10">
			<Shield size={32} />
		</div>

		<h1 class="text-2xl font-bold text-white mb-1 tracking-tight">Serviee Admin Panel</h1>
		<p class="text-slate-400 text-sm mb-6">Restricted Secret Route <code class="px-2 py-0.5 bg-[#1a1e28] text-[#7261ef] rounded text-xs font-mono">/admin05</code></p>

		{#if passError}
			<div class="mb-5 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-center justify-center gap-2" transition:slide>
				<AlertTriangle size={16} />
				<span>{passError}</span>
			</div>
		{/if}

		<form onsubmit={onsubmit} class="space-y-4">
			<div class="text-left space-y-1.5">
				<label for="passcode" class="text-xs font-semibold uppercase tracking-wider text-slate-400">Secret Passcode</label>
				<input 
					id="passcode" 
					type="password" 
					bind:value={passcode}
					placeholder="Enter PIN..." 
					autocomplete="off"
					class="w-full px-4 py-3 bg-[#1a1e28] border border-[#222736] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#7261ef] focus:ring-1 focus:ring-[#7261ef] transition-all text-sm"
					required
				/>
			</div>

			<button 
				type="submit" 
				class="w-full py-3 px-4 bg-[#7261ef] hover:bg-[#8374f2] text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-[#7261ef]/25 active:scale-[0.98] flex items-center justify-center gap-2"
			>
				<Unlock size={18} />
				<span>Authenticate & Unlock</span>
			</button>
		</form>

		<div class="mt-8 pt-5 border-t border-[#222736]">
			<a href="/" class="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5">
				<span>← Return to Serviee Platform</span>
			</a>
		</div>
	</div>
</div>
