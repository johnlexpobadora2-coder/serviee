<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>Serviee | Home</title>
</svelte:head>

<!-- Hero Section -->
<section style="text-align: center; padding: 4rem 1.5rem 3rem 1.5rem; position: relative;">
	<!-- Background glow element -->
	<div style="position: absolute; top: -10%; left: 50%; transform: translateX(-50%); width: 300px; height: 300px; background: radial-gradient(circle, hsla(252, 78%, 62%, 0.15) 0%, transparent 70%); pointer-events: none; z-index: -1;"></div>

	<h1 style="font-size: clamp(2.5rem, 6vw, 4rem); font-weight: 800; line-height: 1.1; margin-bottom: 1.5rem; background: linear-gradient(135deg, var(--text-primary) 30%, var(--accent) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
		Find Work.<br>Get Services.
	</h1>
	
	<p style="color: var(--text-secondary); max-width: 600px; margin: 0 auto 2.5rem auto; font-size: 1.25rem; font-weight: 400; line-height: 1.6;">
		Connect local sideline workers and handymen with clients needing quick repairs and manual labor in your community.
	</p>

	<div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
		<a href="/register?role=customer" class="btn btn-primary" id="hero-find-service-btn">Find a Service</a>
		<a href="/register?role=worker" class="btn btn-secondary" id="hero-find-job-btn">Find a Sideline</a>
	</div>
</section>

<!-- Statistics counters -->
<section style="margin: 3rem 0; text-align: center;">
	<div class="grid-3" style="max-width: 900px; margin: 0 auto;">
		<div class="card" style="padding: 1.5rem; text-align: center;">
			<h3 style="font-size: 2.5rem; color: var(--accent); margin-bottom: 0.25rem;">{data.stats.activeJobs}</h3>
			<p style="color: var(--text-secondary); font-size: 0.95rem; font-weight: 500;">Active Jobs</p>
		</div>
		<div class="card" style="padding: 1.5rem; text-align: center;">
			<h3 style="font-size: 2.5rem; color: var(--success); margin-bottom: 0.25rem;">{data.stats.completedJobs}</h3>
			<p style="color: var(--text-secondary); font-size: 0.95rem; font-weight: 500;">Completed Services</p>
		</div>
		<div class="card" style="padding: 1.5rem; text-align: center;">
			<h3 style="font-size: 2.5rem; color: var(--warning); margin-bottom: 0.25rem;">{data.stats.totalWorkers}</h3>
			<p style="color: var(--text-secondary); font-size: 0.95rem; font-weight: 500;">Handymen & Workers</p>
		</div>
	</div>
</section>

<!-- Service Categories Showcase -->
<section style="margin: 5rem 0;">
	<h2 style="font-size: 2rem; text-align: center; margin-bottom: 1rem;">Service Categories</h2>
	<p style="color: var(--text-secondary); text-align: center; max-width: 500px; margin: 0 auto 3rem auto; font-size: 1rem;">
		Select a category that matches your current needs or skills.
	</p>

	<div class="grid-3">
		<div class="card" style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
			<span class="badge badge-plumbing">Plumbing / Tubero</span>
			<h4 style="font-size: 1.25rem;">Pipe and Leak Repair</h4>
			<p style="color: var(--text-secondary); font-size: 0.9rem;">For leaky pipes, sink installations, clogged toilets, and other plumbing services.</p>
		</div>
		
		<div class="card" style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
			<span class="badge badge-roofing">Roofing / Ayos Yero</span>
			<h4 style="font-size: 1.25rem;">Roof Repair & Installation</h4>
			<p style="color: var(--text-secondary); font-size: 0.9rem;">Durable solutions for roof leaks, gutter cleaning, sheet replacements, and roof maintenance.</p>
		</div>

		<div class="card" style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
			<span class="badge badge-excavation">Excavation / Hukay Lupa</span>
			<h4 style="font-size: 1.25rem;">Digging and Foundation Work</h4>
			<p style="color: var(--text-secondary); font-size: 0.9rem;">Excavations for septic tanks, fence posts, foundations, or drainage projects.</p>
		</div>

		<div class="card" style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
			<span class="badge badge-gardening">Gardening / Landscape</span>
			<h4 style="font-size: 1.25rem;">Lawn and Yard Care</h4>
			<p style="color: var(--text-secondary); font-size: 0.9rem;">Grass cutting, tree trimming, garden clearing, planting, and landscape maintenance.</p>
		</div>

		<div class="card" style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
			<span class="badge badge-carpentry">Carpentry / Karpintero</span>
			<h4 style="font-size: 1.25rem;">Woodwork and Construction</h4>
			<p style="color: var(--text-secondary); font-size: 0.9rem;">Custom cabinets, door installations, wooden fences, tables, chairs, and custom wood carpentry.</p>
		</div>

		<div class="card" style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
			<span class="badge badge-general">General Manual Labor</span>
			<h4 style="font-size: 1.25rem;">General Manual Labor</h4>
			<p style="color: var(--text-secondary); font-size: 0.9rem;">Moving assistance (hakot), heavy lifting, house cleaning, and general household chores.</p>
		</div>
	</div>
</section>

<!-- Call to Action Banner -->
<section class="card" style="background: linear-gradient(135deg, hsl(252, 78%, 62%) 0%, hsl(252, 85%, 48%) 100%); border: none; border-radius: var(--radius-lg); text-align: center; padding: 4rem 2rem; margin: 4rem 0;">
	<h2 style="font-size: 2.25rem; color: #fff; margin-bottom: 1rem;">Are you looking for quick help or extra income?</h2>
	<p style="color: hsla(210, 40%, 98%, 0.8); max-width: 600px; margin: 0 auto 2rem auto; font-size: 1.1rem; line-height: 1.6;">
		Join Serviee today. Registration is free for both Clients and Workers!
	</p>
	<div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
		<a href="/register" class="btn btn-secondary" style="background: #fff; color: var(--accent); border: none;" id="cta-register-btn">Get Started Now</a>
	</div>
</section>
