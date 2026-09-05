<script>
	import { MessageSquare } from 'lucide-svelte';

	let { 
		activeTab = $bindable('feed'), 
		myJobsCount = 0, 
		conversationsCount = 0, 
		unreadCount = 0, 
		onselectchat 
	} = $props();
</script>

<div class="tabs-header">
	<button
		type="button"
		class="tab-btn {activeTab === 'feed' ? 'active' : ''}"
		onclick={() => (activeTab = "feed")}
		id="tab-feed-btn"
	>
		Sideline Feed (Job Board)
	</button>
	<button
		type="button"
		class="tab-btn {activeTab === 'my-jobs' ? 'active' : ''}"
		onclick={() => (activeTab = "my-jobs")}
		id="tab-myjobs-btn"
	>
		My Jobs ({myJobsCount})
	</button>
	<button
		type="button"
		class="tab-btn {activeTab === 'chat' ? 'active' : ''}"
		onclick={() => {
			activeTab = "chat";
			if (onselectchat) onselectchat();
		}}
		id="tab-chat-btn"
		style="display: inline-flex; align-items: center; gap: 0.4rem;"
	>
		<MessageSquare size={16} /> Messages ({conversationsCount})
		{#if unreadCount > 0}
			<span class="badge-unread-counter">{unreadCount}</span>
		{/if}
	</button>
	<button
		type="button"
		class="tab-btn {activeTab === 'profile' ? 'active' : ''}"
		onclick={() => (activeTab = "profile")}
		id="tab-profile-btn"
	>
		My Profile & Feedback
	</button>
</div>
