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

<div class="city-autocomplete-container" bind:this={containerRef}>
	<!-- Hidden input for standard Form Data submission -->
	<input type="hidden" {name} {value} {required} />

	<div
		class="autocomplete-input-wrapper {isValid
			? 'is-valid'
			: hasInteracted && query && !isValid
				? 'is-invalid'
				: ''}"
	>
		<div class="input-icon-left">
			<MapPin size={18} class={isValid ? "text-success" : "text-muted"} />
		</div>

		<input
			bind:this={inputRef}
			type="text"
			role="combobox"
			{id}
			class="autocomplete-input"
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

		<div class="input-actions-right">
			{#if isSearching}
				<span class="spinner-icon">
					<Loader2 size={16} class="animate-spin" />
				</span>
			{:else if isValid}
				<span class="badge-verified" title="Verified Location">
					<CheckCircle2 size={16} class="text-success" />
				</span>
			{/if}

			{#if query}
				<button
					type="button"
					class="btn-clear-input"
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
		<div class="suggestions-dropdown" id="{id}-listbox" role="listbox">
			<div class="dropdown-header">
				<span>Tap to select official Municipality / City:</span>
			</div>
			<ul class="suggestions-list">
				{#each suggestions as item, idx}
					<li
						role="option"
						tabindex="0"
						aria-selected={selectedIndex === idx}
						class="suggestion-item {selectedIndex === idx
							? 'selected'
							: ''}"
						onclick={() => selectSuggestion(item)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								selectSuggestion(item);
							}
						}}
					>
						<div class="suggestion-pin">
							<MapPin size={16} />
						</div>
						<div class="suggestion-text">
							<div class="suggestion-title">{item.city}</div>
							{#if item.province}
								<div class="suggestion-subtitle">
									{item.province}
									{item.region ? `• ${item.region}` : ""}
								</div>
							{/if}
						</div>
						<div class="suggestion-action">
							<span class="btn-select-badge">Select</span>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Validation helper message -->
	{#if hasInteracted && query && !isValid}
		<div class="validation-warning">
			<AlertCircle size={14} />
			<span
				>Please select a valid city/municipality from the list or use
				GPS.</span
			>
		</div>
	{/if}
</div>

<style>
	.city-autocomplete-container {
		position: relative;
		width: 100%;
	}

	.autocomplete-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		background: var(--bg-input, #1e293b);
		border: 1.5px solid var(--border-color, #334155);
		border-radius: var(--radius-md, 0.5rem);
		transition: all 0.2s ease;
		width: 100%;
	}

	.autocomplete-input-wrapper:focus-within {
		border-color: var(--accent, #6366f1);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
	}

	.autocomplete-input-wrapper.is-valid {
		border-color: #10b981;
		background: rgba(16, 185, 129, 0.03);
	}

	.autocomplete-input-wrapper.is-invalid {
		border-color: #f59e0b;
		background: rgba(245, 158, 11, 0.03);
	}

	.input-icon-left {
		display: flex;
		align-items: center;
		justify-content: center;
		padding-left: 0.85rem;
		color: var(--text-muted, #94a3b8);
	}

	.autocomplete-input {
		flex: 1;
		border: none !important;
		background: transparent !important;
		padding: 0.75rem 0.65rem !important;
		font-size: 0.98rem;
		color: var(--text-primary, #f8fafc);
		outline: none !important;
		box-shadow: none !important;
		width: 100%;
	}

	.input-actions-right {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding-right: 0.75rem;
	}

	.spinner-icon {
		display: flex;
		align-items: center;
		color: var(--accent, #6366f1);
	}

	:global(.animate-spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.badge-verified {
		display: flex;
		align-items: center;
		color: #10b981;
	}

	.btn-clear-input {
		background: none;
		border: none;
		padding: 0.25rem;
		border-radius: 50%;
		color: var(--text-muted, #94a3b8);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			background 0.15s,
			color 0.15s;
	}

	.btn-clear-input:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-primary, #f8fafc);
	}

	.suggestions-dropdown {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		right: 0;
		background: var(--bg-card, #0f172a);
		border: 1px solid var(--border-color, #334155);
		border-radius: var(--radius-md, 0.5rem);
		box-shadow:
			0 10px 25px -5px rgba(0, 0, 0, 0.5),
			0 8px 10px -6px rgba(0, 0, 0, 0.4);
		z-index: 100;
		max-height: 260px;
		overflow-y: auto;
		animation: slideDown 0.15s ease-out;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.dropdown-header {
		padding: 0.45rem 0.85rem;
		font-size: 0.72rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted, #94a3b8);
		border-bottom: 1px solid var(--border-color, #334155);
		background: rgba(0, 0, 0, 0.15);
	}

	.suggestions-list {
		list-style: none;
		padding: 0.35rem 0;
		margin: 0;
	}

	.suggestion-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.85rem;
		cursor: pointer;
		transition: background 0.15s ease;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
	}

	.suggestion-item:last-child {
		border-bottom: none;
	}

	.suggestion-item:hover,
	.suggestion-item.selected {
		background: rgba(99, 102, 241, 0.12);
	}

	.suggestion-pin {
		color: var(--accent, #6366f1);
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.suggestion-text {
		flex: 1;
		min-width: 0;
	}

	.suggestion-title {
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--text-primary, #f8fafc);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.suggestion-subtitle {
		font-size: 0.78rem;
		color: var(--text-muted, #94a3b8);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.suggestion-action {
		flex-shrink: 0;
	}

	.btn-select-badge {
		font-size: 0.72rem;
		padding: 0.2rem 0.5rem;
		border-radius: var(--radius-sm, 0.25rem);
		background: rgba(99, 102, 241, 0.18);
		color: #818cf8;
		font-weight: 600;
	}

	.validation-warning {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.4rem;
		font-size: 0.8rem;
		color: #f59e0b;
	}
</style>
