<script>
	import { Activity, Users, Briefcase, Star, Settings } from 'lucide-svelte';

	let { 
		activeTab = $bindable('overview'), 
		userCount = 0, 
		jobCount = 0, 
		reviewCount = 0 
	} = $props();
</script>

<div class="tabs-header">
	<button 
		type="button"
		onclick={() => activeTab = 'overview'}
		class="tab-btn flex items-center gap-2 {activeTab === 'overview' ? 'active' : ''}"
	>
		<Activity size={16} />
		<span>Overview</span>
	</button>

	<button 
		type="button"
		onclick={() => activeTab = 'users'}
		class="tab-btn flex items-center gap-2 {activeTab === 'users' ? 'active' : ''}"
	>
		<Users size={16} />
		<span>Users Directory ({userCount})</span>
	</button>

	<button 
		type="button"
		onclick={() => activeTab = 'jobs'}
		class="tab-btn flex items-center gap-2 {activeTab === 'jobs' ? 'active' : ''}"
	>
		<Briefcase size={16} />
		<span>Job Listings ({jobCount})</span>
	</button>

	<button 
		type="button"
		onclick={() => activeTab = 'reviews'}
		class="tab-btn flex items-center gap-2 {activeTab === 'reviews' ? 'active' : ''}"
	>
		<Star size={16} />
		<span>Reviews ({reviewCount})</span>
	</button>

	<button 
		type="button"
		onclick={() => activeTab = 'system'}
		class="tab-btn flex items-center gap-2 {activeTab === 'system' ? 'active' : ''}"
	>
		<Settings size={16} />
		<span>System Status</span>
	</button>
</div>
