<script>
	import { onMount } from 'svelte';
	import { Sun, Moon } from 'lucide-svelte';

	let isDark = $state(true);

	onMount(() => {
		const storedTheme = localStorage.getItem('theme');
		if (storedTheme) {
			isDark = storedTheme === 'dark';
		} else {
			isDark = !document.documentElement.classList.contains('light');
		}
		applyTheme(isDark);
	});

	function toggleTheme() {
		isDark = !isDark;
		applyTheme(isDark);
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
	}

	function applyTheme(dark) {
		if (dark) {
			document.documentElement.classList.add('dark');
			document.documentElement.classList.remove('light');
			document.documentElement.setAttribute('data-theme', 'dark');
		} else {
			document.documentElement.classList.add('light');
			document.documentElement.classList.remove('dark');
			document.documentElement.setAttribute('data-theme', 'light');
		}
	}
</script>

<button
	type="button"
	onclick={toggleTheme}
	aria-label="Toggle theme"
	title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
	class="theme-toggle-btn"
>
	{#if isDark}
		<Sun size={18} class="theme-icon sun-icon" />
	{:else}
		<Moon size={18} class="theme-icon moon-icon" />
	{/if}
</button>

<style>
	.theme-toggle-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 38px;
		height: 38px;
		padding: 0;
		border-radius: var(--radius-md, 8px);
		border: 1px solid var(--border-color);
		background-color: var(--bg-input);
		color: var(--text-primary);
		cursor: pointer;
		transition: all var(--transition-fast, 0.15s ease);
	}

	.theme-toggle-btn:hover {
		border-color: var(--accent);
		background-color: var(--bg-card);
	}

	:global(.theme-icon) {
		transition: transform 0.3s ease, color 0.3s ease;
	}

	:global(.sun-icon) {
		color: #f59e0b;
	}

	.theme-toggle-btn:hover :global(.sun-icon) {
		transform: rotate(45deg);
	}

	:global(.moon-icon) {
		color: #8b5cf6;
	}

	.theme-toggle-btn:hover :global(.moon-icon) {
		transform: rotate(-12deg);
	}
</style>
