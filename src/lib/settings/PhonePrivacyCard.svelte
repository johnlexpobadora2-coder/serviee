<script>
	let {
		maskPhone = $bindable(false),
		disabled = false
	} = $props();
</script>

<div class="flex items-center justify-between gap-3 pt-0.5 pb-1">
	<div class="flex flex-col">
		<label for="mask_phone_toggle" class="text-[0.84rem] font-medium text-(--text-secondary) cursor-pointer select-none">
			Mask phone number on public profile
		</label>
		<span class="text-[0.75rem] text-(--text-muted) leading-tight">
			Hides your contact number on public listings (e.g. 0917 ••• •567)
		</span>
	</div>

	<!-- Tailwind Switch Toggle -->
	<label class="relative inline-flex items-center cursor-pointer shrink-0 select-none">
		<input
			type="checkbox"
			id="mask_phone_toggle"
			name="mask_phone"
			value="true"
			bind:checked={maskPhone}
			{disabled}
			class="sr-only peer"
		/>
		<div class="w-10 h-5.5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-(--accent)/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-(--accent)"></div>
	</label>
</div>
