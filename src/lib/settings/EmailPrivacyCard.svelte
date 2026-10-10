<script>
	import { toast } from '$lib/toast.svelte.js';
	import { Loader2 } from 'lucide-svelte';

	let {
		maskEmail = $bindable(false),
		disabled = false,
		onchange = null
	} = $props();

	let saving = $state(false);

	async function handleToggle(e) {
		if (disabled || saving) return;
		const nextState = e.target.checked;
		const prevState = maskEmail;
		maskEmail = nextState;
		saving = true;

		try {
			const res = await fetch('/api/user/email-privacy', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ mask_email: nextState })
			});

			const data = await res.json();
			if (!res.ok || !data.success) {
				throw new Error(data.error || 'Failed to save email privacy setting');
			}

			toast.success(
				nextState
					? 'Email masking enabled: Email address masked on public profile.'
					: 'Email masking disabled: Email address visible on public profile.'
			);

			if (onchange) {
				onchange(nextState);
			}
		} catch (err) {
			console.error('Error saving email privacy:', err);
			maskEmail = prevState;
			toast.error(err.message || 'Failed to update email privacy');
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex items-center justify-between gap-3 pt-0.5 pb-1">
	<div class="flex flex-col">
		<label for="mask_email_toggle" class="text-[0.84rem] font-medium text-(--text-secondary) cursor-pointer select-none flex items-center gap-2">
			<span>Mask email address on public profile</span>
			{#if saving}
				<span class="inline-flex items-center gap-1 text-[0.72rem] text-(--accent) font-normal">
					<Loader2 size={12} class="animate-spin" /> Saving...
				</span>
			{/if}
		</label>
		<span class="text-[0.75rem] text-(--text-muted) leading-tight mt-0.5">
			Hides part of your email address on public listings (e.g. j•••••@domain.com)
		</span>
	</div>

	<!-- Tailwind Switch Toggle -->
	<label class="relative inline-flex items-center cursor-pointer shrink-0 select-none {disabled || saving ? 'opacity-60 cursor-not-allowed' : ''}">
		<input
			type="checkbox"
			id="mask_email_toggle"
			name="mask_email"
			value="true"
			checked={maskEmail}
			onchange={handleToggle}
			disabled={disabled || saving}
			class="sr-only peer"
		/>
		<div class="w-10 h-5.5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-(--accent)/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-(--accent)"></div>
	</label>
</div>
