<script>
	import { Activity, Users, Briefcase, Star, Settings, ShieldCheck } from 'lucide-svelte';

	let { 
		activeTab = $bindable('overview')
	} = $props();
</script>

<div class="tabs-header main-dashboard-tabs">
	<button 
		type="button" 
		class="tab-btn {activeTab === 'overview' ? 'active' : ''}" 
		onclick={() => activeTab = 'overview'}
		id="tab-overview-btn"
		title="Overview"
		aria-label="Overview"
	>
		<Activity size={18} class="tab-icon" />
		<span class="tab-label">Overview</span>
	</button>

	<button 
		type="button" 
		class="tab-btn {activeTab === 'users' ? 'active' : ''}" 
		onclick={() => activeTab = 'users'}
		id="tab-users-btn"
		title="Users Directory"
		aria-label="Users Directory"
	>
		<Users size={18} class="tab-icon" />
		<span class="tab-label">Users Directory</span>
	</button>

	<button 
		type="button" 
		class="tab-btn {activeTab === 'jobs' ? 'active' : ''}" 
		onclick={() => activeTab = 'jobs'}
		id="tab-jobs-btn"
		title="Job Listings"
		aria-label="Job Listings"
	>
		<Briefcase size={18} class="tab-icon" />
		<span class="tab-label">Job Listings</span>
	</button>

	<button 
		type="button" 
		class="tab-btn {activeTab === 'reviews' ? 'active' : ''}" 
		onclick={() => activeTab = 'reviews'}
		id="tab-reviews-btn"
		title="Reviews"
		aria-label="Reviews"
	>
		<Star size={18} class="tab-icon" />
		<span class="tab-label">Reviews</span>
	</button>

	<button 
		type="button" 
		class="tab-btn {activeTab === 'system' ? 'active' : ''}" 
		onclick={() => activeTab = 'system'}
		id="tab-system-btn"
		title="System Status"
		aria-label="System Status"
	>
		<Settings size={18} class="tab-icon" />
		<span class="tab-label">System Status</span>
	</button>

	<button 
		type="button" 
		class="tab-btn {activeTab === 'audit' ? 'active' : ''}" 
		onclick={() => activeTab = 'audit'}
		id="tab-audit-btn"
		title="Audit Logs"
		aria-label="Audit Logs"
	>
		<ShieldCheck size={18} class="tab-icon" />
		<span class="tab-label">Audit Logs</span>
	</button>
</div>
