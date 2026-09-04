<script>
	import '../index.css';
	import 'leaflet/dist/leaflet.css';
	import { Menu, X, Settings, LogOut, LogIn, UserPlus, Loader2 } from 'lucide-svelte';
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
	<div class="global-loading-indicator">
		<div class="brand-loading-pulse">
			<div class="brand-pulse-ring"></div>
			<div class="brand-pulse-core">
				<Loader2 size={30} class="animate-spin text-[var(--accent)]" />
			</div>
		</div>
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
					<!-- Mobile-only user header card -->
					<div class="mobile-user-card">
						<div class="mobile-user-avatar">
							{data.user.name ? data.user.name.charAt(0).toUpperCase() : 'U'}
						</div>
						<div class="mobile-user-meta">
							<span class="mobile-user-name">{data.user.name}</span>
							<span class="mobile-user-role-badge">
								{data.user.role === 'customer' ? 'Client' : data.user.role === 'admin' ? 'Admin' : 'Worker'}
							</span>
						</div>
					</div>

					<div class="mobile-nav-divider"></div>

					<!-- Settings Link -->
					<a 
						href="/settings" 
						class="nav-link mobile-nav-link" 
						onclick={closeMenu} 
						id="nav-settings-link"
					>
						<span class="nav-icon-wrapper">
							<Settings size={16} />
						</span>
						<span class="nav-link-text">Account Settings</span>
					</a>
					
					<!-- Desktop user greeting -->
					<span class="user-greeting desktop-only-greeting">
						Hello, <strong style="color: var(--text-primary);">{data.user.name}</strong> ({data.user.role === 'customer' ? 'Client' : data.user.role === 'admin' ? 'Admin' : 'Worker'})
					</span>

					<!-- Logout Action Form -->
					<form method="POST" action="/logout" class="nav-logout-form">
						<button type="submit" class="btn btn-outline nav-logout-btn" onclick={closeMenu} id="nav-logout-btn">
							<LogOut size={15} />
							<span>Log Out</span>
						</button>
					</form>
				{:else}
					<a href="/login" class="nav-link mobile-nav-link" onclick={closeMenu} id="nav-login-link">
						<span class="nav-icon-wrapper">
							<LogIn size={16} />
						</span>
						<span>Log In</span>
					</a>
					<a href="/register" class="btn btn-primary nav-signup-btn" onclick={closeMenu} id="nav-register-btn">
						<UserPlus size={15} />
						<span>Sign Up</span>
					</a>
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
