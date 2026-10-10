<script>
	import { User, Shield, Repeat, HelpCircle } from 'lucide-svelte';

	let { activeTab = $bindable('profile') } = $props();
</script>

<!-- Settings Tabs -->
<div class="grid grid-cols-4 gap-1 sm:gap-2 mb-0 w-full border-b border-(--border-color)" role="tablist">
	<button
		type="button"
		class="tab-btn inline-flex! items-center! justify-center! gap-1.5 sm:gap-2 w-full px-1.5 sm:px-3 py-2.5 sm:py-3 text-center shrink text-[0.82rem] sm:text-[0.9rem]"
		class:active={activeTab === 'profile'}
		onclick={() => (activeTab = 'profile')}
		role="tab"
		aria-selected={activeTab === 'profile'}
		id="tab-profile-btn"
		title="Profile"
		aria-label="Profile"
	>
		<User size={19} class="tab-icon shrink-0" />
		<span class="hidden sm:inline leading-tight">Profile</span>
	</button>
	<button
		type="button"
		class="tab-btn inline-flex! items-center! justify-center! gap-1.5 sm:gap-2 w-full px-1.5 sm:px-3 py-2.5 sm:py-3 text-center shrink text-[0.82rem] sm:text-[0.9rem]"
		class:active={activeTab === 'security'}
		onclick={() => (activeTab = 'security')}
		role="tab"
		aria-selected={activeTab === 'security'}
		id="tab-security-btn"
		title="Security"
		aria-label="Security"
	>
		<Shield size={19} class="tab-icon shrink-0" />
		<span class="hidden sm:inline leading-tight">Security</span>
	</button>
	<button
		type="button"
		class="tab-btn inline-flex! items-center! justify-center! gap-1.5 sm:gap-2 w-full px-1.5 sm:px-3 py-2.5 sm:py-3 text-center shrink text-[0.82rem] sm:text-[0.9rem]"
		class:active={activeTab === 'roles'}
		onclick={() => (activeTab = 'roles')}
		role="tab"
		aria-selected={activeTab === 'roles'}
		id="tab-roles-btn"
		title="Switch Role"
		aria-label="Switch Role"
	>
		<Repeat size={19} class="tab-icon shrink-0" />
		<span class="hidden sm:inline leading-tight">Switch Role</span>
	</button>
	<button
		type="button"
		class="tab-btn inline-flex! items-center! justify-center! gap-1.5 sm:gap-2 w-full px-1.5 sm:px-3 py-2.5 sm:py-3 text-center shrink text-[0.82rem] sm:text-[0.9rem]"
		class:active={activeTab === 'faq'}
		onclick={() => (activeTab = 'faq')}
		role="tab"
		aria-selected={activeTab === 'faq'}
		id="tab-faq-btn"
		title="Help & FAQ"
		aria-label="Help & FAQ"
	>
		<HelpCircle size={19} class="tab-icon shrink-0" />
		<span class="hidden sm:inline leading-tight">Help & FAQ</span>
	</button>
</div>
