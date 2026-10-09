<script>
	import { ExternalLink, Lock, ShieldCheck } from 'lucide-svelte';
	import ThemeToggle from '$lib/ThemeToggle.svelte';

	let { onlock } = $props();
</script>

<!-- Top Header Navigation Bar (Dashboard Harmonized) -->
<div class="card admin-header-card">
	<div class="admin-brand-section">
		<div class="admin-brand-left">
			<a href="/" class="logo admin-logo">
				Serviee <span class="logo-dot"></span>
			</a>
			<span class="badge badge-carpentry admin-badge">
				<ShieldCheck size={14} /> Admin05
			</span>
		</div>
		<div class="mobile-only-theme">
			<ThemeToggle />
		</div>
	</div>

	<div class="admin-actions-section">
		<div class="desktop-only-theme">
			<ThemeToggle />
		</div>
		<a 
			href="/" 
			target="_blank" 
			class="btn btn-secondary header-action-btn"
		>
			<ExternalLink size={14} />
			<span>Open App</span>
		</a>
		<button 
			type="button"
			onclick={onlock}
			class="btn btn-danger header-action-btn"
		>
			<Lock size={14} />
			<span>Lock Panel</span>
		</button>
	</div>
</div>

<style>
	.admin-header-card {
		padding: 1rem 1.25rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.admin-brand-section {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}

	.admin-brand-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.admin-logo {
		font-size: 1.35rem;
		text-decoration: none;
	}

	.admin-badge {
		font-weight: 600;
		font-size: 0.78rem;
		text-transform: capitalize;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.75rem;
	}

	.admin-actions-section {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.desktop-only-theme {
		display: flex;
		align-items: center;
	}

	.mobile-only-theme {
		display: none;
	}

	.header-action-btn {
		height: 38px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0 0.85rem;
		font-size: 0.82rem;
		gap: 0.4rem;
		text-decoration: none;
		white-space: nowrap;
		box-sizing: border-box;
		border-radius: var(--radius-md, 8px);
	}

	@media (max-width: 640px) {
		.admin-header-card {
			padding: 0.75rem 0.85rem;
			flex-direction: column;
			align-items: stretch;
			gap: 0.65rem;
			margin-bottom: 0.65rem;
		}

		.admin-brand-section {
			width: 100%;
			justify-content: space-between;
			align-items: center;
		}

		.desktop-only-theme {
			display: none;
		}

		.mobile-only-theme {
			display: flex;
			align-items: center;
		}

		.admin-actions-section {
			width: 100%;
			gap: 0.5rem;
			align-items: center;
		}

		.header-action-btn {
			flex: 1;
			height: 38px;
			justify-content: center;
			padding: 0 0.6rem;
			font-size: 0.8rem;
		}
	}
</style>
