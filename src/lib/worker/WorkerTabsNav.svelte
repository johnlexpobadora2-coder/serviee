<script>
	import { Compass, Briefcase, MessageSquare, User } from 'lucide-svelte';

	let { 
		activeTab = $bindable('feed'), 
		unreadCount = 0, 
		onselectchat 
	} = $props();
</script>

<div class="tabs-header main-dashboard-tabs">
	<button
		type="button"
		class="tab-btn {activeTab === 'feed' ? 'active' : ''}"
		onclick={() => (activeTab = 'feed')}
		id="tab-feed-btn"
		title="Sideline Feed (Job Board)"
		aria-label="Sideline Feed"
	>
		<Compass size={18} class="tab-icon" />
		<span class="tab-label">Sideline Feed</span>
	</button>
	<button
		type="button"
		class="tab-btn {activeTab === 'my-jobs' ? 'active' : ''}"
		onclick={() => (activeTab = 'my-jobs')}
		id="tab-myjobs-btn"
		title="My Active Jobs"
		aria-label="My Active Jobs"
	>
		<Briefcase size={18} class="tab-icon" />
		<span class="tab-label">My Active Jobs</span>
	</button>
	<button
		type="button"
		class="tab-btn {activeTab === 'chat' ? 'active' : ''}"
		onclick={() => {
			activeTab = 'chat';
			if (onselectchat) onselectchat();
		}}
		id="tab-chat-btn"
		title="Messages"
		aria-label="Messages"
	>
		<MessageSquare size={18} class="tab-icon" />
		<span class="tab-label">Messages</span>
		{#if unreadCount > 0}
			<span class="badge-unread-counter">{unreadCount}</span>
		{/if}
	</button>
	<button
		type="button"
		class="tab-btn {activeTab === 'profile' ? 'active' : ''}"
		onclick={() => (activeTab = 'profile')}
		id="tab-profile-btn"
		title="My Profile & Feedback"
		aria-label="My Profile & Feedback"
	>
		<User size={18} class="tab-icon" />
		<span class="tab-label">My Profile & Feedback</span>
	</button>
</div>
