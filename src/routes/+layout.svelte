<script>
	import '../index.css';
	import 'leaflet/dist/leaflet.css';
	import { Menu, X, Settings, Loader2 } from 'lucide-svelte';
	import { navigating } from '$app/stores';

	let { data, children } = $props();

	let menuOpen = $state(false);

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function closeMenu() {
		menuOpen = false;
	}
</script>

{#if $navigating}
	<div class="top-loading-bar-container">
		<div class="top-loading-bar"></div>
	</div>
	<div class="global-loading-indicator">
		<div class="spinner spinner-accent spinner-lg"></div>
	</div>
{/if}

<svelte:head>
	<link rel="icon" type="image/png" href="/ServieeLogo.png" />
	<title>Serviee | Local Sideline Jobs & Quick Repairs</title>
	<meta name="description" content="Connect local clients needing quick repairs or manual labor with available sideline workers and handymen in the Philippines." />
</svelte:head>

<div class="app-container">
	<header>
		<nav class="nav-container">
			<a href="/" class="logo" onclick={closeMenu} id="nav-logo">
				Serviee <span class="logo-dot"></span>
			</a>
			
			<!-- Hamburger button for mobile devices -->
			<button 
				type="button" 
				class="menu-toggle-btn" 
				onclick={toggleMenu} 
				aria-label="Toggle menu"
				aria-expanded={menuOpen}
			>
				{#if menuOpen}
					<X size={20} />
				{:else}
					<Menu size={20} />
				{/if}
			</button>
			
			<div class="nav-links" class:mobile-open={menuOpen}>
				{#if data.user}
					<a 
						href="/settings" 
						class="nav-link" 
						onclick={closeMenu} 
						id="nav-settings-link"
						style="display: inline-flex; align-items: center; gap: 0.35rem;"
					>
						<Settings size={16} />
						Account Settings
					</a>
					<span class="user-greeting">
						Hello, <strong style="color: var(--text-primary);">{data.user.name}</strong> ({data.user.role === 'customer' ? 'Client' : data.user.role === 'admin' ? 'Admin' : 'Worker'})
					</span>
					
					<form method="POST" action="/logout" style="display: inline;">
						<button type="submit" class="btn btn-outline" style="padding: 0.4rem 1rem;" onclick={closeMenu} id="nav-logout-btn">Log Out</button>
					</form>
				{:else}
					<a href="/login" class="nav-link" onclick={closeMenu} id="nav-login-link">Log In</a>
					<a href="/register" class="btn btn-primary" style="padding: 0.4rem 1rem;" onclick={closeMenu} id="nav-register-btn">Sign Up</a>
				{/if}
			</div>
		</nav>
	</header>

	<main>
		{@render children()}
	</main>

	<footer>
		<div style="max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 0.5rem; align-items: center;">
			<p>&copy; {new Date().getFullYear()} <strong>Serviee</strong>. All rights reserved.</p>
			<p style="font-size: 0.8rem; color: var(--text-muted);">Linking handymen and local sideline service providers in the Philippines.</p>
		</div>
	</footer>
</div>
