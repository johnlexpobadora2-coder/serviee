<script>
	import { 
		Search, 
		ChevronDown, 
		HelpCircle, 
		Briefcase, 
		ShieldCheck, 
		User, 
		FileText, 
		X, 
		Headset 
	} from 'lucide-svelte';
	import SupportChatModal from '$lib/settings/SupportChatModal.svelte';

	let { user = null } = $props();

	let searchQuery = $state('');
	let selectedCategory = $state('all'); // 'all' | 'general' | 'client' | 'worker' | 'security'
	let openIndices = $state(new Set([1])); // First item open by default
	let showSupportChatModal = $state(false);

	const FAQ_ITEMS = [
		{
			id: 1,
			category: 'general',
			categoryLabel: 'General',
			question: 'What is Serviee and how does it work?',
			answer: 'Serviee is a community-driven service marketplace connecting clients with skilled local freelancers and independent service professionals — including plumbers, electricians, carpenters, house cleaners, appliance technicians, painters, and more. Clients can easily post job requests or reach out directly to available workers nearby.'
		},
		{
			id: 2,
			category: 'general',
			categoryLabel: 'General',
			question: 'Is Serviee free to use?',
			answer: 'Yes! Creating an account as a Client or Worker is completely free. Posting job openings and applying to available jobs are free of charge.'
		},
		{
			id: 3,
			category: 'client',
			categoryLabel: 'For Clients',
			question: 'How do I post a job or hire a worker?',
			answer: 'Navigate to your Dashboard and click "Post a Job". Fill in the job details (such as title, category, location, preferred schedule, and budget), then publish it. You can also explore the Workers feed or interactive Map view to send direct inquiries to available service providers.'
		},
		{
			id: 4,
			category: 'client',
			categoryLabel: 'For Clients',
			question: 'How do I communicate with a worker before hiring?',
			answer: 'Serviee includes a built-in In-App Chat system. Click "Chat Worker" on any worker profile or application card to discuss project details, required tools or materials, schedule, and agreed pricing before starting the job.'
		},
		{
			id: 5,
			category: 'worker',
			categoryLabel: 'For Workers',
			question: 'How do I apply for jobs as a worker?',
			answer: 'From your Worker Dashboard, go to the "Job Feed" tab to browse open job posts in your city and surrounding areas. Click "Apply" or "Chat Client" to submit your rate, ask questions, and express your interest.'
		},
		{
			id: 6,
			category: 'worker',
			categoryLabel: 'For Workers',
			question: 'How can I update my skills and profile bio?',
			answer: 'Go to Settings > Profile tab. You can add or manage your Skill tags (e.g., Plumbing, Electrical, House Wiring, Carpentry) and write a bio highlighting your experience to attract potential clients.'
		},
		{
			id: 7,
			category: 'worker',
			categoryLabel: 'For Workers',
			question: 'How do payments and payouts work?',
			answer: 'Payment terms and final rates are agreed upon directly between the client and worker. Payments are typically completed upon satisfactory service delivery through Cash on Service or popular digital payment methods like GCash and Maya.'
		},
		{
			id: 8,
			category: 'security',
			categoryLabel: 'Privacy & Security',
			question: 'How does Phone Number Masking work?',
			answer: 'In Settings > Profile tab, toggle the "Mask phone number on public profile" switch. When enabled, your contact number on public listings will be partially masked (e.g., 0917 ••• •567) to protect your privacy and prevent unsolicited calls.'
		},
		{
			id: 9,
			category: 'security',
			categoryLabel: 'Privacy & Security',
			question: 'Can I have both Client and Worker accounts with the same email?',
			answer: 'Yes! You do not need a separate email address. Head over to Settings > Switch Role tab to create a complementary profile (Client or Worker). Once created, you can seamlessly switch between profiles using your password without logging out.'
		},
		{
			id: 10,
			category: 'security',
			categoryLabel: 'Privacy & Security',
			question: 'How is my exact location and GPS privacy protected?',
			answer: 'You can use GPS auto-detection or manually select your City/Barangay in Settings > Profile. You can set city or neighborhood-level information so your exact doorstep or house address is not publicly exposed on maps.'
		},
		{
			id: 11,
			category: 'security',
			categoryLabel: 'Privacy & Security',
			question: 'How do I delete or deactivate my account?',
			answer: 'Go to Settings > Security tab and scroll down to the Danger Zone. Click "Delete Account" and confirm with your password. All your session data, credentials, and profile information will be permanently and securely deleted.'
		}
	];

	const CATEGORIES = [
		{ id: 'all', label: 'All FAQs', icon: FileText },
		{ id: 'general', label: 'General', icon: HelpCircle },
		{ id: 'client', label: 'Clients', icon: User },
		{ id: 'worker', label: 'Workers', icon: Briefcase },
		{ id: 'security', label: 'Privacy & Security', icon: ShieldCheck }
	];

	function toggleItem(id) {
		const next = new Set(openIndices);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		openIndices = next;
	}

	let filteredFaqs = $derived(
		FAQ_ITEMS.filter(item => {
			const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
			const query = searchQuery.trim().toLowerCase();
			if (!query) return matchesCategory;
			const matchesQuery = 
				item.question.toLowerCase().includes(query) || 
				item.answer.toLowerCase().includes(query) ||
				item.categoryLabel.toLowerCase().includes(query);
			return matchesCategory && matchesQuery;
		})
	);
</script>

<div class="bg-(--bg-card) border border-(--border-color) rounded-lg p-3.5 min-[380px]:p-5 sm:p-7 shadow-(--shadow-sm) flex flex-col gap-5 sm:gap-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
		<div>
			<h3 class="text-[1.2rem] font-semibold text-(--text-primary) mb-1 flex items-center gap-2">
				<HelpCircle size={20} class="text-(--accent)" />
				Help & Frequently Asked Questions (FAQ)
			</h3>
			<p class="text-(--text-muted) text-[0.85rem] m-0">
				Find answers to common questions about using Serviee safely and effectively.
			</p>
		</div>
	</div>

	<!-- Live Search Bar -->
	<div class="relative flex items-center">
		<Search size={18} class="absolute left-3.5 text-(--text-muted) pointer-events-none" />
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search questions or topics (e.g., phone masking, post job, payments, switch role)..."
			class="w-full py-2.5 pr-10 pl-10.5 bg-(--bg-input) border border-(--border-color) rounded-md text-(--text-primary) text-[0.9rem] font-sans transition-colors focus:outline-none focus:border-(--border-focus) focus:ring-2 focus:ring-(--accent-light)"
		/>
		{#if searchQuery}
			<button
				type="button"
				onclick={() => (searchQuery = '')}
				aria-label="Clear search"
				class="absolute right-3 text-(--text-muted) hover:text-(--text-primary) transition-colors p-1 rounded-full cursor-pointer"
			>
				<X size={16} />
			</button>
		{/if}
	</div>

	<!-- Category Filter Chips -->
	<div class="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="FAQ Categories">
		{#each CATEGORIES as cat}
			{@const Icon = cat.icon}
			<button
				type="button"
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.8rem] font-medium transition-all whitespace-nowrap border cursor-pointer {selectedCategory === cat.id ? 'bg-(--accent) text-white border-(--accent) shadow-xs' : 'bg-(--bg-input) text-(--text-secondary) border-(--border-color) hover:border-(--text-muted)'}"
				onclick={() => (selectedCategory = cat.id)}
			>
				<Icon size={14} />
				<span>{cat.label}</span>
			</button>
		{/each}
	</div>

	<!-- FAQ Accordion List -->
	<div class="flex flex-col gap-2.5">
		{#if filteredFaqs.length > 0}
			{#each filteredFaqs as faq (faq.id)}
				{@const isOpen = openIndices.has(faq.id)}
				<div class="border border-(--border-color) rounded-lg overflow-hidden transition-all bg-(--bg-input)/30 hover:border-(--text-muted)/40 {isOpen ? 'ring-1 ring-(--accent)/30' : ''}">
					<button
						type="button"
						class="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left transition-colors select-none cursor-pointer"
						onclick={() => toggleItem(faq.id)}
						aria-expanded={isOpen}
					>
						<div class="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
							<span class="text-[0.72rem] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md w-fit {faq.category === 'client' ? 'bg-pink-500/10 text-pink-500' : faq.category === 'worker' ? 'bg-emerald-500/10 text-emerald-500' : faq.category === 'security' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}">
								{faq.categoryLabel}
							</span>
							<span class="font-medium text-[0.92rem] text-(--text-primary) leading-snug">
								{faq.question}
							</span>
						</div>
						<div class="shrink-0 text-(--text-muted) transition-transform duration-200 {isOpen ? 'rotate-180 text-(--accent)' : ''}">
							<ChevronDown size={18} />
						</div>
					</button>

					{#if isOpen}
						<div class="px-4 pb-4 pt-1 text-[0.88rem] text-(--text-secondary) leading-relaxed border-t border-(--border-color)/50 bg-(--bg-card)">
							{faq.answer}
						</div>
					{/if}
				</div>
			{/each}
		{:else}
			<div class="py-12 flex flex-col items-center justify-center text-center p-4 border border-dashed border-(--border-color) rounded-lg">
				<HelpCircle size={36} class="text-(--text-muted) mb-2 opacity-50" />
				<h4 class="font-semibold text-(--text-primary) text-[0.95rem] m-0">No matching questions found</h4>
				<p class="text-(--text-muted) text-[0.82rem] mt-1 max-w-sm">
					Try searching with different keywords or reset your category filter.
				</p>
				<button
					type="button"
					class="mt-3 px-3.5 py-1.5 text-[0.82rem] rounded-md bg-(--accent)/10 text-(--accent) hover:bg-(--accent)/20 font-medium transition-colors cursor-pointer"
					onclick={() => { searchQuery = ''; selectedCategory = 'all'; }}
				>
					Reset Filters
				</button>
			</div>
		{/if}
	</div>

	<!-- Direct Admin Chat Support Card for Further Questions -->
	<div class="mt-3 p-4 sm:p-5 rounded-2xl bg-linear-to-r from-(--accent)/15 via-(--accent)/5 to-(--bg-card) border border-(--accent)/30 shadow-xs flex flex-col gap-4">
		<!-- Row 1: Information -->
		<div class="flex items-start gap-3.5">
			<div class="p-2.5 sm:p-3 rounded-xl bg-(--accent) text-white shadow-md shadow-(--accent)/20 shrink-0 mt-0.5">
				<Headset size={22} />
			</div>
			<div>
				<h4 class="text-[0.95rem] sm:text-[1rem] font-bold text-(--text-primary) m-0">
					Have Further Questions?
				</h4>
				<p class="text-[0.82rem] sm:text-[0.85rem] text-(--text-muted) m-0 mt-1 leading-relaxed">
					Couldn't find what you're looking for? Reach out directly to our administrative support desk for prompt assistance with your account, jobs, or payments.
				</p>
			</div>
		</div>

		<!-- Row 2: Action Button CTA -->
		<div class="flex items-center justify-end">
			<button
				type="button"
				onclick={() => (showSupportChatModal = true)}
				class="btn btn-primary inline-flex items-center justify-center gap-2 text-[0.88rem] px-5 py-2.5 w-full sm:w-auto shrink-0 cursor-pointer shadow-md hover:shadow-lg transition-all font-semibold rounded-xl"
			>
				<Headset size={17} />
				<span>Chat for Further Questions</span>
			</button>
		</div>
	</div>
</div>

<!-- Support Chat Modal -->
<SupportChatModal 
	bind:show={showSupportChatModal}
	{user}
/>
