<script>
	import {
		Wrench,
		Home,
		Layers,
		Trees,
		Hammer,
		Package,
		ArrowRight,
	} from "lucide-svelte";
	let { data } = $props();
</script>

<svelte:head>
	<title>Serviee | Home</title>
</svelte:head>

<!-- Hero Section -->
<section
	style="text-align: center; padding: 4rem 1.5rem 3rem 1.5rem; position: relative;"
>
	<h1
		style="font-size: clamp(2.5rem, 6vw, 4rem); font-weight: 800; line-height: 1.1; margin-bottom: 1.5rem; background: linear-gradient(135deg, var(--text-primary) 30%, var(--accent) 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;"
	>
		Find Work.<br />Get Services.
	</h1>

	<p
		style="color: var(--text-secondary); max-width: 600px; margin: 0 auto 2.5rem auto; font-size: 1.25rem; font-weight: 400; line-height: 1.6;"
	>
		Connect local sideline workers and handymen with clients needing quick
		repairs and manual labor in your community.
	</p>

	<div
		style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;"
	>
		{#if data.user}
			<a
				href={data.user.role === "customer" ? "/customer" : "/worker"}
				class="btn btn-primary"
				id="hero-view-jobs-btn"
			>
				View Job Listings
			</a>
		{:else}
			<a
				href="/login"
				class="btn btn-primary"
				id="hero-join-community-btn">Join Community</a
			>
		{/if}
	</div>
</section>

<!-- Statistics counters -->
<section class="max-w-5xl mx-auto px-4 my-14 md:my-18">
	<div class="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
		<!-- Stat 1: Active Jobs -->
		<div class="flex flex-col items-center text-center">
			<span
				class="text-4xl sm:text-5xl md:text-6xl font-extrabold text-(--accent) tracking-tight"
			>
				{data.stats.activeJobs}
			</span>
			<div
				class="w-full border-b-2 border-(--accent) my-3.5 md:my-4"
			></div>
			<h3
				class="text-lg md:text-xl font-bold text-(--text-primary) mb-1 tracking-tight"
			>
				Active Jobs
			</h3>
			<p
				class="text-xs md:text-sm text-(--text-secondary) leading-relaxed max-w-70"
			>
				Every job request is verified and ready for skilled local
				workers to take on.
			</p>
		</div>

		<!-- Stat 2: Completed Services -->
		<div class="flex flex-col items-center text-center">
			<span
				class="text-4xl sm:text-5xl md:text-6xl font-extrabold text-(--accent) tracking-tight"
			>
				{data.stats.completedJobs}
			</span>
			<div
				class="w-full border-b-2 border-(--accent) my-3.5 md:my-4"
			></div>
			<h3
				class="text-lg md:text-xl font-bold text-(--text-primary) mb-1 tracking-tight"
			>
				Completed Services
			</h3>
			<p
				class="text-xs md:text-sm text-(--text-secondary) leading-relaxed max-w-70"
			>
				Every project is handled with care and quality service across
				the community.
			</p>
		</div>

		<!-- Stat 3: Handymen & Workers -->
		<div class="flex flex-col items-center text-center">
			<span
				class="text-4xl sm:text-5xl md:text-6xl font-extrabold text-(--accent) tracking-tight"
			>
				{data.stats.totalWorkers}
			</span>
			<div
				class="w-full border-b-2 border-(--accent) my-3.5 md:my-4"
			></div>
			<h3
				class="text-lg md:text-xl font-bold text-(--text-primary) mb-1 tracking-tight"
			>
				Handymen & Workers
			</h3>
			<p
				class="text-xs md:text-sm text-(--text-secondary) leading-relaxed max-w-70"
			>
				Experienced trade professionals ready to assist with your repair
				needs.
			</p>
		</div>
	</div>
</section>

<!-- Section Divider -->
<div class="max-w-5xl mx-auto px-4 my-8 md:my-12">
	<div
		class="w-full h-px bg-linear-to-r from-transparent via-(--border-color,#352c4a) to-transparent"
	></div>
</div>

<!-- Service Categories Showcase -->
<section style="margin: 3.5rem 0 6rem 0;">
	<h2
		style="font-size: 2.25rem; text-align: center; margin-bottom: 0.75rem; font-weight: 700;"
	>
		Service Categories
	</h2>
	<p
		style="color: var(--text-secondary); text-align: center; max-width: 550px; margin: 0 auto 2.5rem auto; font-size: 1.05rem; line-height: 1.6;"
	>
		Select a service category tailored for your home repairs, maintenance,
		and project needs.
	</p>

	<div
		class="categories-grid grid grid-cols-1 md:grid-cols-3 gap-y-20 gap-x-7"
		style="margin-top: 3.5rem;"
	>
		<!-- Plumbing -->
		<div class="category-card">
			<div class="category-circle-badge">
				<Wrench size={24} />
			</div>
			<div class="category-image-container">
				<img
					src="https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80"
					alt="Plumbing Services"
					loading="lazy"
				/>
			</div>
			<h4 class="category-title">Plumbing / Tubero</h4>
			<p class="category-description">
				From concept to completion, we handle leaky pipes, sink
				installations, clogged drains, and pipe repairs.
			</p>
			<a
				href={data.user
					? data.user.role === "customer"
						? "/customer"
						: "/worker"
					: "/login"}
				class="category-link">LEARN MORE <ArrowRight size={14} /></a
			>
		</div>

		<!-- Roofing -->
		<div class="category-card">
			<div class="category-circle-badge">
				<Home size={24} />
			</div>
			<div class="category-image-container">
				<img
					src="https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=600&q=80"
					alt="Roofing Services"
					loading="lazy"
				/>
			</div>
			<h4 class="category-title">Roofing / Ayos Yero</h4>
			<p class="category-description">
				Durable solutions for roof leaks, gutter cleaning, sheet
				replacements, and roof maintenance.
			</p>
			<a
				href={data.user
					? data.user.role === "customer"
						? "/customer"
						: "/worker"
					: "/login"}
				class="category-link">LEARN MORE <ArrowRight size={14} /></a
			>
		</div>

		<!-- Excavation -->
		<div class="category-card">
			<div class="category-circle-badge">
				<Layers size={24} />
			</div>
			<div class="category-image-container">
				<img
					src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80"
					alt="Excavation Work"
					loading="lazy"
				/>
			</div>
			<h4 class="category-title">Excavation / Hukay Lupa</h4>
			<p class="category-description">
				Excavation services for septic tanks, fence post installations,
				foundations, or drainage projects.
			</p>
			<a
				href={data.user
					? data.user.role === "customer"
						? "/customer"
						: "/worker"
					: "/login"}
				class="category-link">LEARN MORE <ArrowRight size={14} /></a
			>
		</div>

		<!-- Gardening -->
		<div class="category-card">
			<div class="category-circle-badge">
				<Trees size={24} />
			</div>
			<div class="category-image-container">
				<img
					src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=600&q=80"
					alt="Gardening & Lawn Care"
					loading="lazy"
				/>
			</div>
			<h4 class="category-title">Gardening / Landscape</h4>
			<p class="category-description">
				Curated lawn care, grass cutting, tree trimming, garden
				clearing, and landscape maintenance.
			</p>
			<a
				href={data.user
					? data.user.role === "customer"
						? "/customer"
						: "/worker"
					: "/login"}
				class="category-link">LEARN MORE <ArrowRight size={14} /></a
			>
		</div>

		<!-- Carpentry -->
		<div class="category-card">
			<div class="category-circle-badge">
				<Hammer size={24} />
			</div>
			<div class="category-image-container">
				<img
					src="https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=600&q=80"
					alt="Carpentry Services"
					loading="lazy"
				/>
			</div>
			<h4 class="category-title">Carpentry / Karpintero</h4>
			<p class="category-description">
				Custom cabinets, door installations, wooden fences, tables,
				chairs, and custom wood carpentry.
			</p>
			<a
				href={data.user
					? data.user.role === "customer"
						? "/customer"
						: "/worker"
					: "/login"}
				class="category-link">LEARN MORE <ArrowRight size={14} /></a
			>
		</div>

		<!-- General Labor -->
		<div class="category-card">
			<div class="category-circle-badge">
				<Package size={24} />
			</div>
			<div class="category-image-container">
				<img
					src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80"
					alt="General Manual Labor"
					loading="lazy"
				/>
			</div>
			<h4 class="category-title">General Manual Labor</h4>
			<p class="category-description">
				Moving assistance (hakot), heavy lifting, house cleaning, and
				general household chores.
			</p>
			<a
				href={data.user
					? data.user.role === "customer"
						? "/customer"
						: "/worker"
					: "/login"}
				class="category-link">LEARN MORE <ArrowRight size={14} /></a
			>
		</div>
	</div>
</section>

<!-- Call to Action Banner -->
<section
	class="card"
	style="background: linear-gradient(135deg, hsl(270, 85%, 58%) 0%, hsl(270, 90%, 42%) 100%); border: none; border-radius: var(--radius-lg); text-align: center; padding: 4rem 2rem; margin: 4rem 0;"
>
	<h2 style="font-size: 2.25rem; color: #fff; margin-bottom: 1rem;">
		Are you looking for quick help or extra income?
	</h2>
	<p
		style="color: hsla(210, 40%, 98%, 0.8); max-width: 600px; margin: 0 auto 2rem auto; font-size: 1.1rem; line-height: 1.6;"
	>
		Join Serviee today. Registration is free for both Clients and Workers!
	</p>
	<div
		style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;"
	>
		{#if data.user}
			<a
				href={data.user.role === "customer" ? "/customer" : "/worker"}
				class="btn btn-secondary"
				style="background: #fff; color: var(--accent); border: none;"
				id="cta-dashboard-btn"
			>
				View Job Listings
			</a>
		{:else}
			<a
				href="/register"
				class="btn btn-secondary"
				style="background: #fff; color: var(--accent); border: none;"
				id="cta-register-btn"
			>
				Get Started Now
			</a>
		{/if}
	</div>
</section>

<style>
	/* Category Cards (Layout matching reference, theme matching website) */
	.categories-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 3.5rem 1.75rem;
		margin-top: 4rem;
	}

	.category-card {
		position: relative;
		background: var(--bg-card, #161a23);
		border: 1px solid var(--border-color, #2a2f3d);
		border-radius: var(--radius-lg, 16px);
		padding: 2.25rem 1.25rem 1.75rem 1.25rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		box-shadow: var(--shadow-sm);
		transition:
			border-color var(--transition-fast, 0.15s ease),
			box-shadow var(--transition-smooth, 0.3s ease);
	}

	.category-card:hover {
		border-color: var(--accent);
	}

	.category-circle-badge {
		position: absolute;
		top: -26px;
		left: 50%;
		transform: translateX(-50%);
		width: 52px;
		height: 52px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--accent) 0%, #6332ec 100%);
		color: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 16px rgba(108, 71, 255, 0.35);
		z-index: 2;
	}

	.category-image-container {
		width: 100%;
		height: 165px;
		border-radius: var(--radius-md, 12px);
		overflow: hidden;
		margin-top: 0.5rem;
		margin-bottom: 1.25rem;
		position: relative;
	}

	.category-image-container img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.4s ease;
	}

	.category-card:hover .category-image-container img {
		transform: scale(1.05);
	}

	.category-title {
		font-family: var(--font-sans);
		font-size: 1.2rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.6rem;
		line-height: 1.3;
	}

	.category-description {
		font-size: 0.88rem;
		color: var(--text-secondary);
		line-height: 1.5;
		margin-bottom: 1.5rem;
		flex-grow: 1;
	}

	.category-link {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent);
		text-decoration: none;
		transition:
			gap 0.2s ease,
			color 0.2s ease;
	}

	.category-card:hover .category-link {
		color: var(--accent-hover);
		gap: 0.6rem;
	}
</style>
