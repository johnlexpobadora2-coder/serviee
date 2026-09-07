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
		class="tab-btn {activeTab === 'overview' ? 'active' : ''}" 
		onclick={() => activeTab = 'overview'}
		id="tab-overview-btn"
		style="display: inline-flex; align-items: center; gap: 0.45rem;"
	>
		<Activity size={16} />
		<span>Overview</span>
	</button>

	<button 
		type="button" 
		class="tab-btn {activeTab === 'users' ? 'active' : ''}" 
		onclick={() => activeTab = 'users'}
		id="tab-users-btn"
		style="display: inline-flex; align-items: center; gap: 0.45rem;"
	>
		<Users size={16} />
		<span>Users Directory ({userCount})</span>
	</button>

	<button 
		type="button" 
		class="tab-btn {activeTab === 'jobs' ? 'active' : ''}" 
		onclick={() => activeTab = 'jobs'}
		id="tab-jobs-btn"
		style="display: inline-flex; align-items: center; gap: 0.45rem;"
	>
		<Briefcase size={16} />
		<span>Job Listings ({jobCount})</span>
	</button>

	<button 
		type="button" 
		class="tab-btn {activeTab === 'reviews' ? 'active' : ''}" 
		onclick={() => activeTab = 'reviews'}
		id="tab-reviews-btn"
		style="display: inline-flex; align-items: center; gap: 0.45rem;"
	>
		<Star size={16} />
		<span>Reviews ({reviewCount})</span>
	</button>

	<button 
		type="button" 
		class="tab-btn {activeTab === 'system' ? 'active' : ''}" 
		onclick={() => activeTab = 'system'}
		id="tab-system-btn"
		style="display: inline-flex; align-items: center; gap: 0.45rem;"
	>
		<Settings size={16} />
		<span>System Status</span>
	</button>
</div>
