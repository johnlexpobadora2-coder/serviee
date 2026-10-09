<script>
	import { Shield, ShieldAlert, ShieldCheck, Eye, EyeOff, Lock } from 'lucide-svelte';
	import { maskPhoneNumber } from '$lib/validation.js';

	let {
		maskPhone = $bindable(false),
		phone = '',
		disabled = false
	} = $props();
</script>

<div class="p-4 sm:p-5 bg-(--bg-input) border border-(--border-color) rounded-lg flex flex-col gap-3 transition-colors">
	<div class="flex items-start justify-between gap-3">
		<div class="flex items-start gap-3">
			<div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 {maskPhone ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/15 text-(--text-muted)'}">
				{#if maskPhone}
					<ShieldCheck size={20} />
				{:else}
					<Shield size={20} />
				{/if}
			</div>
			<div>
				<div class="flex items-center gap-2 flex-wrap">
					<span class="font-semibold text-[0.92rem] text-(--text-primary)">Phone Number Masking</span>
					{#if maskPhone}
						<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.72rem] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
							<Lock size={11} /> Protected
						</span>
					{:else}
						<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.72rem] font-medium bg-slate-500/15 text-(--text-muted) border border-(--border-color)">
							<Eye size={11} /> Public
						</span>
					{/if}
				</div>
				<p class="text-xs text-(--text-muted) mt-1 mb-0 leading-relaxed">
					Control how your phone number is displayed to other users on public listings and profile views.
				</p>
			</div>
		</div>

		<!-- Tailwind Switch Toggle -->
		<label class="relative inline-flex items-center cursor-pointer shrink-0 mt-1 select-none">
			<input
				type="checkbox"
				name="mask_phone"
				value="true"
				bind:checked={maskPhone}
				{disabled}
				class="sr-only peer"
			/>
			<div class="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-(--accent)/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-(--accent)"></div>
		</label>
	</div>

	<!-- Live Privacy Preview Box -->
	<div class="mt-1 p-3 bg-(--bg-card) border border-(--border-color) rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
		<div class="flex items-center gap-2">
			{#if maskPhone}
				<EyeOff size={15} class="text-emerald-500 shrink-0" />
				<span class="text-xs text-(--text-secondary)">
					Public profile preview:
				</span>
				<span class="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
					{maskPhoneNumber(phone || '09171234567')}
				</span>
			{:else}
				<Eye size={15} class="text-(--text-muted) shrink-0" />
				<span class="text-xs text-(--text-secondary)">
					Public profile preview:
				</span>
				<span class="text-xs font-mono font-semibold text-(--text-primary) bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded">
					{phone || '09171234567'}
				</span>
			{/if}
		</div>

		<div class="text-[0.73rem] text-(--text-muted) sm:text-right">
			{#if maskPhone}
				Hidden from public searches.
			{:else}
				Visible to all registered users.
			{/if}
		</div>
	</div>
</div>
