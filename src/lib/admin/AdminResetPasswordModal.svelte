<script>
	import { fade, scale } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { KeyRound, CheckCircle, Eye, EyeOff, X } from 'lucide-svelte';

	let { 
		resetPasswordModal = $bindable({ open: false, userId: null, name: '', email: '' }), 
		onclose 
	} = $props();

	let newPassword = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let localError = $state('');
	let isSubmitting = $state(false);

	$effect(() => {
		if (resetPasswordModal.open) {
			newPassword = '';
			confirmPassword = '';
			showPassword = false;
			localError = '';
			isSubmitting = false;
		}
	});

	function handleSubmit(e) {
		localError = '';
		if (!newPassword || newPassword.length < 6) {
			e.preventDefault();
			localError = 'Password must be at least 6 characters.';
			return;
		}
		if (newPassword !== confirmPassword) {
			e.preventDefault();
			localError = 'Passwords do not match.';
			return;
		}
		isSubmitting = true;
	}
</script>

{#if resetPasswordModal.open}
	<div class="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" transition:fade={{ duration: 150 }}>
		<div class="w-full max-w-sm sm:max-w-md bg-white dark:bg-[#1c1827] border border-slate-200/80 dark:border-[#352c4a] rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl transition-all my-auto" transition:scale={{ duration: 150, start: 0.95 }}>
			<div class="flex items-center justify-between border-b border-slate-100 dark:border-[#352c4a] pb-3">
				<h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-[#f8f6fc] flex items-center gap-2">
					<div class="p-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
						<KeyRound size={18} />
					</div>
					<span>Reset User Password</span>
				</h3>
				<button 
					type="button" 
					onclick={onclose} 
					class="text-slate-400 hover:text-slate-700 dark:hover:text-[#f8f6fc] p-1 cursor-pointer transition-colors"
					aria-label="Close"
				>
					<X size={16} />
				</button>
			</div>

			<p class="text-xs text-slate-500 dark:text-[#b5adc9] font-medium">
				Resetting password for <strong class="text-slate-900 dark:text-[#f8f6fc] font-bold">{resetPasswordModal.name}</strong>
				{#if resetPasswordModal.email}
					<span class="text-slate-400 dark:text-[#837a9c] font-normal">({resetPasswordModal.email})</span>
				{/if}
			</p>

			{#if localError}
				<div class="p-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-xs font-semibold">
					{localError}
				</div>
			{/if}

			<form 
				method="POST" 
				action="?/resetUserPassword" 
				onsubmit={handleSubmit}
				use:enhance={() => {
					return async ({ result, update }) => {
						isSubmitting = false;
						await update();
						if (result.type === 'success') {
							onclose();
						}
					};
				}} 
				class="space-y-3.5"
			>
				<input type="hidden" name="userId" value={resetPasswordModal.userId} />
				
				<div class="space-y-1">
					<label for="newPasswordInput" class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#b5adc9]">New Password</label>
					<div class="relative">
						<input 
							id="newPasswordInput"
							type={showPassword ? 'text' : 'password'} 
							name="newPassword" 
							bind:value={newPassword}
							placeholder="Enter at least 6 characters"
							class="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-[#272138] border border-slate-200 dark:border-[#352c4a] rounded-lg text-slate-900 dark:text-[#f8f6fc] text-xs focus:outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20 transition-all font-medium"
							required
							minlength="6"
						/>
						<button 
							type="button" 
							onclick={() => showPassword = !showPassword}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-[#f8f6fc]"
							tabindex="-1"
						>
							{#if showPassword}
								<EyeOff size={15} />
							{:else}
								<Eye size={15} />
							{/if}
						</button>
					</div>
				</div>

				<div class="space-y-1">
					<label for="confirmPasswordInput" class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#b5adc9]">Confirm New Password</label>
					<input 
						id="confirmPasswordInput"
						type={showPassword ? 'text' : 'password'} 
						bind:value={confirmPassword}
						placeholder="Repeat the new password"
						class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#272138] border border-slate-200 dark:border-[#352c4a] rounded-lg text-slate-900 dark:text-[#f8f6fc] text-xs focus:outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20 transition-all font-medium"
						required
						minlength="6"
					/>
				</div>

				<div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#352c4a]">
					<button 
						type="button" 
						onclick={onclose}
						disabled={isSubmitting}
						class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#272138] dark:hover:bg-[#2b2266] text-slate-700 dark:text-[#f8f6fc] border border-slate-200 dark:border-[#352c4a] rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
					>
						Cancel
					</button>
					<button 
						type="submit" 
						disabled={isSubmitting}
						class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-amber-600/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
					>
						<CheckCircle size={14} />
						<span>{isSubmitting ? 'Saving...' : 'Set Password'}</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
