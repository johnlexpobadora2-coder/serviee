<script>
	import { ExternalLink, Lock, ShieldCheck } from 'lucide-svelte';
	import ThemeToggle from '$lib/ThemeToggle.svelte';

	let { onlock } = $props();
</script>

<!-- Top Header Navigation Bar (Dashboard Harmonized) -->
<div class="card" style="padding: 1rem 1.25rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem;">
	<div style="display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap;">
		<a href="/" class="logo" style="font-size: 1.35rem; text-decoration: none;">
			Serviee <span class="logo-dot"></span>
		</a>
		<span class="badge" style="background: var(--accent-light); color: var(--accent); border-color: rgba(114, 97, 239, 0.3); font-weight: 700; font-size: 0.75rem; text-transform: uppercase; display: inline-flex; align-items: center; gap: 0.3rem;">
			<ShieldCheck size={14} /> Admin05
		</span>
		<div style="display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.25rem 0.75rem; background: var(--success-light); border: 1px solid var(--success); color: var(--success); border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 600;">
			<span style="width: 6px; height: 6px; border-radius: 50%; background: var(--success); display: inline-block;"></span>
			<span>Live System Connected</span>
		</div>
	</div>

	<div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
		<ThemeToggle />

		<a 
			href="/" 
			target="_blank" 
			class="btn btn-secondary"
			style="padding: 0.45rem 0.85rem; font-size: 0.82rem; gap: 0.4rem; text-decoration: none;"
		>
			<ExternalLink size={14} />
			<span>Open Public App</span>
		</a>
		<button 
			type="button"
			onclick={onlock}
			class="btn btn-danger"
			style="padding: 0.45rem 0.85rem; font-size: 0.82rem; gap: 0.4rem;"
		>
			<Lock size={14} />
			<span>Lock Panel</span>
		</button>
	</div>
</div>
