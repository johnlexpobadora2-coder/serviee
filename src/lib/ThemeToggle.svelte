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
	class="relative flex items-center justify-center p-2 rounded-xl transition-all duration-300 border bg-slate-100 hover:bg-slate-200/90 border-slate-300/90 text-slate-700 hover:text-indigo-600 dark:bg-slate-800/80 dark:hover:bg-slate-700/90 dark:border-slate-700/80 dark:text-slate-300 dark:hover:text-amber-400 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
>
	{#if isDark}
		<Sun class="w-4 h-4 transition-transform duration-300 rotate-0 hover:rotate-45 text-amber-400" />
	{:else}
		<Moon class="w-4 h-4 transition-transform duration-300 rotate-0 hover:-rotate-12 text-indigo-600" />
	{/if}
</button>
