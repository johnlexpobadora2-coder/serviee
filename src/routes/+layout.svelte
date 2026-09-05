<script>
	import '../index.css';
	import 'leaflet/dist/leaflet.css';
	import { Menu, X, Settings, LogOut, LogIn, UserPlus, Loader2, Home, PlusCircle } from 'lucide-svelte';
	import { navigating } from '$app/stores';
	import { page } from '$app/state';

	let { data, children } = $props();

	let menuOpen = $state(false);

	let isAdminPage = $derived(page.url.pathname.startsWith('/admin'));

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
					<!-- Mobile-only user header -->
					<div class="mobile-user-simple-header mobile-only">
						<span>Signed in as <strong>{data.user.name}</strong> ({data.user.role === 'customer' ? 'Client' : data.user.role === 'admin' ? 'Admin' : 'Worker'})</span>
					</div>

					<!-- Mobile-only Dashboard Link -->
					<a 
						href={data.user.role === 'customer' ? '/customer' : data.user.role === 'worker' ? '/worker' : data.user.role === 'admin' ? '/admin05' : '/'} 
						class="nav-link mobile-only" 
						onclick={closeMenu}
					>
						<Home size={18} class="nav-item-icon" />
						<span>Dashboard</span>
					</a>

					{#if data.user.role === 'customer'}
						<!-- Mobile-only Post Job Link -->
						<a 
							href="/customer/post-job" 
							class="nav-link mobile-only" 
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
						onclick={closeMenu} 
						id="nav-settings-link"
					>
						<Settings size={16} />
						<span>Account Settings</span>
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
					<a href="/login" class="nav-link" onclick={closeMenu} id="nav-login-link">
						<LogIn size={16} />
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
