<script>
	import '../index.css';
	import favicon from '$lib/assets/favicon.svg';

	let { data, children } = $props();

	let menuOpen = $state(false);

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function closeMenu() {
		menuOpen = false;
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
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
					✕
				{:else}
					☰
				{/if}
			</button>
			
			<div class="nav-links" class:mobile-open={menuOpen}>
				{#if data.user}
					{#if data.user.role === 'customer'}
						<a href="/customer" class="nav-link" onclick={closeMenu} id="nav-customer-dashboard">Customer Dashboard</a>
					{:else}
						<a href="/worker" class="nav-link" onclick={closeMenu} id="nav-worker-dashboard">Worker Board</a>
					{/if}
					
					<span class="user-greeting">
						Hello, <strong style="color: var(--text-primary);">{data.user.name}</strong> ({data.user.role === 'customer' ? 'Client' : 'Worker'})
					</span>
					
					<a href="/logout" class="btn btn-outline" style="padding: 0.4rem 1rem;" onclick={closeMenu} id="nav-logout-btn">Log Out</a>
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
