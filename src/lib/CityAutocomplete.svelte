<script>
	import { onMount, onDestroy } from "svelte";
	import {
		MapPin,
		Search,
		CheckCircle2,
		AlertCircle,
		X,
		Loader2,
	} from "lucide-svelte";
	import {
		searchPhilippineLocations,
		isValidPhilippineLocation,
		getPhilippineCityCoordinates
	} from "$lib/philippinesLocations.js";


	/**
	 * @type {{
	 *   value?: string,
	 *   name?: string,
	 *   id?: string,
	 *   placeholder?: string,
	 *   required?: boolean,
	 *   isValid?: boolean,
	 *   onselect?: (selected: { city: string, province: string, displayName: string, coords?: { latitude: number, longitude: number } | null }) => void
	 * }}
	 */
	let {
		value = $bindable(""),
		name = "address",
		id = "city-autocomplete",
		placeholder = "Type city/municipality (e.g. Davao City, Cebu City, Makati)...",
		required = true,
		isValid = $bindable(false),
		onselect = () => {},
	} = $props();

	// Local input query state
	let lastPropValue = $state(value || "");
	let query = $state(value || "");
	let suggestions = $state([]);
	let isSearching = $state(false);
	let isOpen = $state(false);
	let selectedIndex = $state(-1);
	let containerRef = $state(null);
	let inputRef = $state(null);
	let debounceTimer = null;
	let hasInteracted = $state(false);

	// Sync when parent changes `value` externally (e.g. Auto GPS, Custom Pin Picker, or server load)
	$effect(() => {
		if (value !== lastPropValue) {
			lastPropValue = value;
			query = value || "";
			isValid = !!(value && value.trim());
		}
	});

	// If initial value exists, consider valid if not empty
	onMount(() => {
		if (value && value.trim()) {
			isValid = true;
		}
	});

	function handleInput(e) {
		hasInteracted = true;
		query = e.target.value;
		selectedIndex = -1;

		// If user changes text manually, reset verified status until they click a suggestion
		if (value && query.trim() !== value.trim()) {
			value = "";
			lastPropValue = "";
			isValid = false;
		}

		if (!query.trim()) {
			suggestions = [];
			isOpen = false;
			value = "";
			lastPropValue = "";
			isValid = false;
			return;
		}

		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			isSearching = true;
			try {
				const results = await searchPhilippineLocations(query);
				suggestions = results;
				isOpen = results.length > 0;
			} catch (err) {
				console.warn("Autocomplete search error:", err);
				suggestions = [];
			} finally {
				isSearching = false;
			}
		}, 180);
	}

	function selectSuggestion(item) {
		value = item.city;
		lastPropValue = item.city;
		query = item.city;
		isValid = true;
		isOpen = false;
		suggestions = [];
		selectedIndex = -1;
		const coords = getPhilippineCityCoordinates(item.city);
		if (onselect) onselect({ ...item, coords });
	}

	function handleKeyDown(e) {
		if (!isOpen || suggestions.length === 0) return;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % suggestions.length;
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			selectedIndex =
				(selectedIndex - 1 + suggestions.length) % suggestions.length;
		} else if (e.key === "Enter") {
			if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
				e.preventDefault();
				selectSuggestion(suggestions[selectedIndex]);
			}
		} else if (e.key === "Escape") {
			isOpen = false;
		}
	}

	function handleClear() {
		query = "";
		value = "";
		lastPropValue = "";
		isValid = false;
		suggestions = [];
		isOpen = false;
		if (inputRef) inputRef.focus();
	}

	function handleClickOutside(e) {
		if (containerRef && !containerRef.contains(e.target)) {
			isOpen = false;
		}
	}

	onMount(() => {
		document.addEventListener("click", handleClickOutside);
	});

	onDestroy(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
		if (typeof document !== "undefined") {
			document.removeEventListener("click", handleClickOutside);
		}
	});
</script>

<div class="relative w-full" bind:this={containerRef}>
	<!-- Hidden input for standard Form Data submission -->
	<input type="hidden" {name} {value} {required} />

	<div
		class="relative flex items-center w-full rounded-md border-[1.5px] bg-(--bg-input,#1e293b) transition-all duration-200 focus-within:border-(--accent,#6366f1) focus-within:ring-3 focus-within:ring-(--accent)/20 {isValid
			? 'border-(--accent) bg-(--accent)/5'
			: hasInteracted && query && !isValid
				? 'border-amber-500 bg-amber-500/5'
				: 'border-(--border-color,#334155)'}"
	>
		<div class="flex items-center justify-center pl-3.5 text-(--text-muted,#94a3b8)">
			<MapPin size={18} class={isValid ? "text-(--accent)" : "text-slate-400"} />
		</div>

		<input
			bind:this={inputRef}
			type="text"
			role="combobox"
			{id}
			class="w-full flex-1 border-none bg-transparent py-3 px-2.5 text-[0.98rem] text-(--text-primary,#f8fafc) outline-none shadow-none focus:outline-none focus:ring-0 placeholder:text-(--text-muted,#94a3b8)"
			{placeholder}
			value={query}
			oninput={handleInput}
			onkeydown={handleKeyDown}
			onfocus={() => {
				if (suggestions.length > 0) isOpen = true;
			}}
			autocomplete="off"
			aria-autocomplete="list"
			aria-expanded={isOpen}
			aria-controls="{id}-listbox"
		/>

		<div class="flex items-center gap-1.5 pr-3">
			{#if isSearching}
				<span class="flex items-center text-(--accent,#6366f1)">
					<Loader2 size={16} class="animate-spin" />
				</span>
			{:else if isValid}
				<span class="flex items-center text-(--accent)" title="Verified Location">
					<CheckCircle2 size={16} />
				</span>
			{/if}

			{#if query}
				<button
					type="button"
					class="flex items-center justify-center rounded-full p-1 text-(--text-muted,#94a3b8) transition-colors duration-150 hover:bg-white/10 hover:text-(--text-primary,#f8fafc) cursor-pointer"
					onclick={handleClear}
					title="Clear location"
					aria-label="Clear location input"
				>
					<X size={15} />
				</button>
			{/if}
		</div>
	</div>

	<!-- Suggestions Dropdown Menu -->
	{#if isOpen && suggestions.length > 0}
		<div
			class="absolute top-[calc(100%+6px)] left-0 right-0 z-50 max-h-65 overflow-y-auto rounded-md border border-(--border-color,#334155) bg-(--bg-card,#0f172a) shadow-2xl"
			id="{id}-listbox"
			role="listbox"
		>
			<div class="border-b border-(--border-color,#334155) bg-black/15 px-3.5 py-2 text-[0.72rem] font-semibold uppercase tracking-wider text-(--text-muted,#94a3b8)">
				<span>Tap to select official Municipality / City:</span>
			</div>
			<ul class="m-0 list-none py-1.5">
				{#each suggestions as item, idx}
					<li
						role="option"
						tabindex="0"
						aria-selected={selectedIndex === idx}
						class="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors duration-150 border-b border-white/4 last:border-b-0 hover:bg-indigo-500/15 focus:bg-indigo-500/15 focus:outline-none {selectedIndex === idx
							? 'bg-indigo-500/15'
							: ''}"
						onclick={() => selectSuggestion(item)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								selectSuggestion(item);
							}
						}}
					>
						<div class="flex shrink-0 items-center text-(--accent,#6366f1)">
							<MapPin size={16} />
						</div>
						<div class="min-w-0 flex-1">
							<div class="truncate text-[0.92rem] font-semibold text-(--text-primary,#f8fafc)">{item.city}</div>
							{#if item.province}
								<div class="truncate text-[0.78rem] text-(--text-muted,#94a3b8)">
									{item.province}
									{item.region ? `• ${item.region}` : ""}
								</div>
							{/if}
						</div>
						<div class="shrink-0">
							<span class="rounded px-2 py-0.5 text-[0.72rem] font-semibold bg-indigo-500/20 text-indigo-400">Select</span>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Validation helper message -->
	{#if hasInteracted && query && !isValid}
		<div class="mt-1.5 flex items-center gap-1.5 text-[0.8rem] text-amber-500">
			<AlertCircle size={14} />
			<span
				>Please select a valid city/municipality from the list or use
				GPS.</span
			>
		</div>
	{/if}
</div>
