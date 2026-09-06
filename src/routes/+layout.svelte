<script>
	import '../index.css';
	import 'leaflet/dist/leaflet.css';
	import { Menu, X, Settings, LogOut, LogIn, UserPlus, Loader2, Home, PlusCircle, User, ShieldCheck } from 'lucide-svelte';
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	import { navigating } from '$app/stores';
	import { page } from '$app/state';

	let { data, children } = $props();

	let menuOpen = $state(false);

	let isAdminPage = $derived(page.url.pathname.startsWith('/admin'));
	let currentPath = $derived(page.url.pathname);

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function closeMenu() {
		menuOpen = false;
	}

	function handleKeydown(e) {
		if (e.key === 'Escape' && menuOpen) {
			closeMenu();
		}
	}

	$effect(() => {
		if (menuOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

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

{#if menuOpen && !isAdminPage}
	<!-- Backdrop overlay on mobile when burger menu is open -->
	<button
		type="button"
		class="mobile-menu-backdrop"
		onclick={closeMenu}
		aria-label="Close menu backdrop"
	></button>
{/if}

<div class="app-container">
	{#if !isAdminPage}
		<header>
			<nav class="nav-container">
			<a href="/" class="logo" onclick={closeMenu} id="nav-logo">
				Serviee <span class="logo-dot"></span>
			</a>
			
			<div class="nav-actions mobile-only">
				<ThemeToggle />
				
				<!-- Hamburger button for mobile devices -->
				<button 
					type="button" 
					class="menu-toggle-btn" 
					class:is-active={menuOpen}
					onclick={toggleMenu} 
					aria-label="Toggle navigation menu"
					aria-expanded={menuOpen}
				>
					{#if menuOpen}
						<X size={20} class="menu-icon animate-icon-spin" />
					{:else}
						<Menu size={20} class="menu-icon" />
					{/if}
				</button>
			</div>
			
			<div class="nav-links" class:mobile-open={menuOpen}>
				{#if data.user}
					<!-- Minimal Mobile User Header -->
					<div class="mobile-menu-user-header mobile-only">
						<span class="mobile-menu-user-name">{data.user.name}</span>
						<span class="mobile-menu-user-tag tag-{data.user.role}">
							{data.user.role === 'customer' ? 'Client' : data.user.role === 'admin' ? 'Admin' : 'Worker'}
						</span>
					</div>

					<!-- Dashboard Link -->
					{@const dashboardHref = data.user.role === 'customer' ? '/customer' : data.user.role === 'worker' ? '/worker' : data.user.role === 'admin' ? '/admin05' : '/'}
					<a 
						href={dashboardHref} 
						class="nav-link mobile-only" 
						class:active={currentPath === dashboardHref}
						onclick={closeMenu}
					>
						<Home size={18} class="nav-item-icon" />
						<span>Dashboard</span>
					</a>

					{#if data.user.role === 'customer'}
						<!-- Post Job Link -->
						<a 
							href="/customer/post-job" 
							class="nav-link mobile-only" 
							class:active={currentPath === '/customer/post-job'}
							onclick={closeMenu}
						>
							<PlusCircle size={18} class="nav-item-icon" />
							<span>Post a New Job</span>
						</a>
					{/if}

					<!-- Settings Link -->
					<a 
						href="/settings" 
						class="nav-link" 
						class:active={currentPath === '/settings'}
						onclick={closeMenu} 
						id="nav-settings-link"
					>
						<Settings size={18} class="nav-item-icon" />
						<span>Account Settings</span>
					</a>
					
					<!-- Desktop user greeting -->
					<span class="user-greeting desktop-only-greeting">
						Hello, <strong style="color: var(--text-primary);">{data.user.name}</strong> ({data.user.role === 'customer' ? 'Client' : data.user.role === 'admin' ? 'Admin' : 'Worker'})
					</span>

					<!-- Desktop-only Theme Toggle -->
					<div class="desktop-only">
						<ThemeToggle />
					</div>

					<!-- Logout Action Form -->
					<form method="POST" action="/logout" class="nav-logout-form">
						<button type="submit" class="nav-link nav-logout-btn" onclick={closeMenu} id="nav-logout-btn">
							<LogOut size={18} class="nav-item-icon" />
							<span>Log Out</span>
						</button>
					</form>
				{:else}
					<a 
						href="/login" 
						class="nav-link" 
						class:active={currentPath === '/login'}
						onclick={closeMenu} 
						id="nav-login-link"
					>
						<LogIn size={18} class="nav-item-icon" />
						<span>Log In</span>
					</a>
					<div class="desktop-only">
						<ThemeToggle />
					</div>
					<a 
						href="/register" 
						class="nav-link mobile-nav-signup" 
						class:active={currentPath === '/register'}
						onclick={closeMenu} 
						id="nav-register-btn"
					>
						<UserPlus size={18} class="nav-item-icon" />
						<span>Sign Up</span>
					</a>
				{/if}
			</div>
		</nav>
	</header>
	{/if}

	<main>
		{@render children()}
	</main>

	{#if !isAdminPage}
		<footer>
			<div style="max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 0.5rem; align-items: center;">
				<p>&copy; {new Date().getFullYear()} <strong>Serviee</strong>. All rights reserved.</p>
				<p style="font-size: 0.8rem; color: var(--text-muted);">Linking handymen and local sideline service providers in the Philippines.</p>
			</div>
		</footer>
	{/if}
</div>
