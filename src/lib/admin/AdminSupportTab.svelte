<script>
	import { fade } from 'svelte/transition';
	import { onDestroy, onMount } from 'svelte';
	import { 
		Headset, 
		Search, 
		CheckCircle2, 
		Clock, 
		AlertCircle, 
		Trash2, 
		Send, 
		User, 
		Mail, 
		Phone, 
		MessageSquare, 
		Sparkles,
		ArrowLeft,
		RefreshCw,
		Hand,
		ShieldCheck
	} from 'lucide-svelte';
	import { playNotificationSound } from '$lib/realtimeChat.js';

	let { 
		tickets = [],
		onopendelete
	} = $props();

	let liveTickets = $state([]);
	let isRefreshing = $state(false);
	let pollInterval = null;

	$effect(() => {
		if (tickets && tickets.length > 0 && liveTickets.length === 0) {
			liveTickets = tickets;
		}
	});

	let searchQuery = $state('');
	let statusFilter = $state('all'); // 'all' | 'open' | 'in_progress' | 'resolved' | 'closed'
	let categoryFilter = $state('all');

	let selectedTicketId = $state(null);
	let hasUserDeselected = $state(false);
	let activeMessages = $state([]);
	let loadingMessages = $state(false);
	let replyContent = $state('');
	let sendingReply = $state(false);
	let updatingStatus = $state(false);

	let messagesContainer = $state(null);

	const CATEGORIES = [
		{ id: 'all', label: 'All Categories' },
		{ id: 'general', label: 'General' },
		{ id: 'account', label: 'Account & Verification' },
		{ id: 'job', label: 'Job Dispute' },
		{ id: 'technical', label: 'Bug Report' }
	];

	const CANNED_REPLIES = [
		{ icon: Hand, label: 'Greeting', text: 'Hello! Thank you for contacting Serviee Support. We are reviewing your inquiry and will assist you shortly.' },
		{ icon: Search, label: 'Under Review', text: 'We are currently looking into this matter with our technical team. Thank you for your patience while we investigate.' },
		{ icon: CheckCircle2, label: 'Resolved', text: 'Great news! The reported issue has been successfully resolved. Please let us know if you need any further assistance.' },
		{ icon: ShieldCheck, label: 'Security Tip', text: 'For your security, please make sure your account profile details and verification credentials are up to date.' }
	];

	// Derived filtered tickets from liveTickets
	let filteredTickets = $derived(
		liveTickets.filter(t => {
			const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
			const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
			const q = searchQuery.trim().toLowerCase();
			if (!q) return matchesStatus && matchesCategory;

			const matchesQuery = 
				t.user_name?.toLowerCase().includes(q) ||
				t.user_email?.toLowerCase().includes(q) ||
				t.subject?.toLowerCase().includes(q) ||
				t.category?.toLowerCase().includes(q);

			return matchesStatus && matchesCategory && matchesQuery;
		})
	);

	let activeTicket = $derived(
		liveTickets.find(t => t.id === selectedTicketId) || null
	);

	// Key Statistics
	let totalCount = $derived(liveTickets.length);
	let openCount = $derived(liveTickets.filter(t => t.status === 'open').length);
	let inProgressCount = $derived(liveTickets.filter(t => t.status === 'in_progress').length);
	let resolvedCount = $derived(liveTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length);
	let unreadCount = $derived(liveTickets.filter(t => t.unread_admin).length);

	// Auto-fetch tickets for admin
	async function fetchLiveTickets(silent = true) {
		if (!silent) isRefreshing = true;
		try {
			const res = await fetch('/admin05/api/support');
			const data = await res.json();
			if (data.success && data.tickets) {
				const prevUnread = liveTickets.filter(t => t.unread_admin).length;
				const newUnread = data.tickets.filter(t => t.unread_admin).length;
				if (newUnread > prevUnread) {
					playNotificationSound();
				}
				liveTickets = data.tickets;

				// Auto-select first ticket if none currently selected (desktop only)
				if (!selectedTicketId && liveTickets.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 1024 && !hasUserDeselected) {
					selectTicket(liveTickets[0].id);
				}
			}
		} catch (err) {
			// silent
		} finally {
			if (!silent) isRefreshing = false;
		}
	}

	// Poll active conversation thread messages
	async function pollThread() {
		if (!selectedTicketId) return;
		try {
			const res = await fetch(`/admin05/api/support?ticketId=${selectedTicketId}`);
			const data = await res.json();
			if (data.success && data.messages) {
				if (data.messages.length > activeMessages.length) {
					const hasNewUserMsg = data.messages.slice(activeMessages.length).some(m => m.sender_type === 'user');
					if (hasNewUserMsg) {
						playNotificationSound();
					}
					activeMessages = data.messages;
					scrollToBottom();
				}
			}
		} catch (err) {
			// silent
		}
	}

	onMount(() => {
		fetchLiveTickets(true);
		if (!selectedTicketId && liveTickets.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 1024) {
			selectTicket(liveTickets[0].id);
		}
		pollInterval = setInterval(() => {
			fetchLiveTickets(true);
			if (selectedTicketId) {
				pollThread();
			}
		}, 2500);
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});

	// Select and load a ticket
	async function selectTicket(ticketId) {
		selectedTicketId = ticketId;
		loadingMessages = true;
		replyContent = '';

		// Clear local unread badge
		const target = liveTickets.find(t => t.id === ticketId);
		if (target) {
			target.unread_admin = false;
		}

		try {
			const res = await fetch(`/admin05/api/support?ticketId=${ticketId}`);
			const data = await res.json();
			if (data.success) {
				activeMessages = data.messages || [];
				scrollToBottom();
			} else {
				console.warn('Admin ticket fetch warning:', data.error);
			}
		} catch (err) {
			console.error('Error fetching ticket messages:', err);
		} finally {
			loadingMessages = false;
		}
	}

	function scrollToBottom() {
		setTimeout(() => {
			if (messagesContainer) {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}
		}, 60);
	}

	// Send reply
	async function handleSendReply() {
		if (!replyContent.trim() || !selectedTicketId || sendingReply) return;
		sendingReply = true;
		const text = replyContent.trim();

		try {
			const res = await fetch('/admin05/api/support', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'reply',
					ticketId: selectedTicketId,
					content: text
				})
			});
			const result = await res.json();

			if (result.success) {
				activeMessages = [
					...activeMessages,
					result.message || {
						id: crypto.randomUUID(),
						ticket_id: selectedTicketId,
						sender_type: 'admin',
						sender_name: 'Serviee Support Team',
						content: text,
						created_at: new Date().toISOString()
					}
				];
				replyContent = '';

				if (activeTicket && activeTicket.status === 'open') {
					activeTicket.status = 'in_progress';
				}

				scrollToBottom();
				fetchLiveTickets(true);
			}
		} catch (err) {
			console.error('Failed to send reply:', err);
		} finally {
			sendingReply = false;
		}
	}

	// Update ticket status
	async function handleStatusChange(newStatus) {
		if (!selectedTicketId || updatingStatus) return;
		updatingStatus = true;

		try {
			const res = await fetch('/admin05/api/support', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'status',
					ticketId: selectedTicketId,
					status: newStatus
				})
			});
			const result = await res.json();

			if (result.success) {
				if (activeTicket) {
					activeTicket.status = newStatus;
				}
				fetchLiveTickets(true);
			}
		} catch (err) {
			console.error('Failed to update ticket status:', err);
		} finally {
			updatingStatus = false;
		}
	}

	function applyCannedReply(text) {
		replyContent = text;
	}

	function formatTimestamp(isoStr) {
		if (!isoStr) return '';
		try {
			const d = new Date(isoStr);
			return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
		} catch {
			return isoStr;
		}
	}

	function getCategoryBadge(cat) {
		switch (cat) {
			case 'account': return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300';
			case 'job': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
			case 'billing': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
			case 'technical': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
			default: return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
		}
	}

	function getStatusBadge(status) {
		switch (status) {
			case 'open': return { label: 'Open', class: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300', border: 'border-red-200 dark:border-red-500/30' };
			case 'in_progress': return { label: 'In Progress', class: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-500/30' };
			case 'resolved': return { label: 'Resolved', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-500/30' };
			case 'closed': return { label: 'Closed', class: 'bg-slate-200 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600/40' };
			default: return { label: status, class: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-500/30' };
		}
	}
</script>

<div class="space-y-4 sm:space-y-6" transition:fade={{ duration: 150 }}>
	<!-- Top Metric Statistics Grid (Hides on mobile when a ticket is opened to maximize chat height) -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 {selectedTicketId ? 'hidden lg:grid' : 'grid'}">
		<!-- Metric 1: Total Inquiries -->
		<div class="bg-white dark:bg-[#161138] border border-slate-200/80 dark:border-[#2c235b] rounded-xl p-4 sm:p-5 shadow-xs dark:shadow-xl hover:border-purple-300 dark:hover:border-purple-500/40 transition-all flex flex-col justify-between">
			<div class="flex items-center justify-between mb-2">
				<span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#77719f]">Total Inquiries</span>
				<div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center shrink-0">
					<Headset size={18} />
				</div>
			</div>
			<div class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#faf9fe] tracking-tight">{totalCount}</div>
		</div>

		<!-- Metric 2: Open / Needs Attention -->
		<div class="bg-white dark:bg-[#161138] border border-slate-200/80 dark:border-[#2c235b] rounded-xl p-4 sm:p-5 shadow-xs dark:shadow-xl hover:border-red-300 dark:hover:border-red-500/40 transition-all flex flex-col justify-between relative">
			<div class="flex items-center justify-between mb-2">
				<span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#77719f]">Open & Pending</span>
				<div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20 flex items-center justify-center shrink-0 relative">
					<AlertCircle size={18} />
					{#if unreadCount > 0}
						<span class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
					{/if}
				</div>
			</div>
			<div class="text-2xl sm:text-3xl font-extrabold text-red-600 dark:text-red-400 tracking-tight">{openCount}</div>
		</div>

		<!-- Metric 3: In Progress -->
		<div class="bg-white dark:bg-[#161138] border border-slate-200/80 dark:border-[#2c235b] rounded-xl p-4 sm:p-5 shadow-xs dark:shadow-xl hover:border-amber-300 dark:hover:border-amber-500/40 transition-all flex flex-col justify-between">
			<div class="flex items-center justify-between mb-2">
				<span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#77719f]">In Progress</span>
				<div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20 flex items-center justify-center shrink-0">
					<Clock size={18} />
				</div>
			</div>
			<div class="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">{inProgressCount}</div>
		</div>

		<!-- Metric 4: Resolved -->
		<div class="bg-white dark:bg-[#161138] border border-slate-200/80 dark:border-[#2c235b] rounded-xl p-4 sm:p-5 shadow-xs dark:shadow-xl hover:border-emerald-300 dark:hover:border-emerald-500/40 transition-all flex flex-col justify-between">
			<div class="flex items-center justify-between mb-2">
				<span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#77719f]">Resolved</span>
				<div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
					<CheckCircle2 size={18} />
				</div>
			</div>
			<div class="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">{resolvedCount}</div>
		</div>
	</div>

	<!-- Main Inbox & Thread Split Screen -->
	<div class="bg-white dark:bg-[#161138] border border-slate-200 dark:border-[#2c235b] rounded-2xl shadow-xs dark:shadow-xl overflow-hidden flex flex-col lg:flex-row h-[calc(100dvh-175px)] min-h-125 lg:h-180">
		<!-- Left Pane: Inquiry Tickets List -->
		<div class="w-full lg:w-96 border-r border-slate-200 dark:border-[#2c235b] flex flex-col h-full shrink-0 bg-white dark:bg-[#161138] {selectedTicketId ? 'hidden lg:flex' : 'flex'}">
			<!-- Inbox Header & Filter Controls -->
			<div class="p-3 sm:p-4 border-b border-slate-200 dark:border-[#2c235b] space-y-2.5 sm:space-y-3 bg-slate-50/50 dark:bg-[#211a4e]/40">
				<div class="flex items-center justify-between">
					<h3 class="font-bold text-slate-900 dark:text-[#faf9fe] text-xs sm:text-sm flex items-center gap-2 m-0">
						<MessageSquare size={16} class="text-[#7261ef]" />
						<span>User Inquiries ({filteredTickets.length})</span>
					</h3>
					{#if unreadCount > 0}
						<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
							{unreadCount} Unread
						</span>
					{/if}
				</div>

				<!-- Search Bar -->
				<div class="relative">
					<Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#77719f]" />
					<input 
						type="text" 
						bind:value={searchQuery}
						placeholder="Search user, email, subject..."
						class="w-full pl-8.5 pr-3 h-9 text-xs bg-white dark:bg-[#211a4e] border border-slate-300 dark:border-[#2c235b] rounded-lg text-slate-900 dark:text-[#faf9fe] placeholder-slate-400 dark:placeholder-[#77719f] focus:outline-none focus:border-[#7261ef] focus:ring-1 focus:ring-[#7261ef]"
					/>
				</div>

				<!-- Status Filter Pills -->
				<div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-0.5">
					{#each ['all', 'open', 'in_progress', 'resolved'] as st}
						<button
							type="button"
							class="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 {statusFilter === st ? 'bg-[#7261ef] text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#211a4e] text-slate-600 dark:text-[#b2acd6]'}"
							onclick={() => statusFilter = st}
						>
							{st === 'all' ? 'All' : st === 'in_progress' ? 'In Progress' : st.charAt(0).toUpperCase() + st.slice(1)}
						</button>
					{/each}
				</div>
			</div>

			<!-- Tickets List -->
			<div class="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#2c235b]/60">
				{#if filteredTickets.length === 0}
					<div class="p-8 text-center text-slate-400 dark:text-[#77719f] flex flex-col items-center justify-center space-y-2">
						<Headset size={32} class="opacity-40" />
						<p class="text-xs font-semibold">No inquiries matching filter</p>
					</div>
				{:else}
					{#each filteredTickets as ticket (ticket.id)}
						{@const badge = getStatusBadge(ticket.status)}
						{@const isSelected = selectedTicketId === ticket.id}
						<button
							type="button"
							class="w-full text-left p-3.5 transition-all relative flex items-start gap-3 cursor-pointer {isSelected ? 'bg-purple-50/80 dark:bg-[#211a4e] border-l-4 border-l-[#7261ef]' : 'hover:bg-slate-50/80 dark:hover:bg-[#211a4e]/40'}"
							onclick={() => { hasUserDeselected = false; selectTicket(ticket.id); }}
						>
							<div class="w-9 h-9 rounded-full bg-linear-to-br from-[#7261ef] to-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0 overflow-hidden">
								{#if ticket.user_avatar}
									<img src={ticket.user_avatar} alt={ticket.user_name} class="w-full h-full object-cover" />
								{:else}
									{ticket.user_name?.charAt(0) || 'U'}
								{/if}
							</div>

							<div class="flex-1 min-w-0">
								<div class="flex items-center justify-between gap-1 mb-0.5">
									<span class="font-bold text-xs text-slate-900 dark:text-[#faf9fe] truncate">
										{ticket.user_name}
									</span>
									<span class="text-[10px] text-slate-400 dark:text-[#77719f] shrink-0 font-medium">
										{formatTimestamp(ticket.updated_at || ticket.created_at)}
									</span>
								</div>

								<p class="text-xs text-slate-700 dark:text-[#b2acd6] font-semibold truncate mb-1.5">
									{ticket.subject}
								</p>

								<div class="flex items-center gap-1.5 flex-wrap">
									<span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider whitespace-nowrap shrink-0 {getCategoryBadge(ticket.category)}">
										{ticket.category}
									</span>
									<span class="text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0 {badge.class}">
										{badge.label}
									</span>
									{#if ticket.unread_admin}
										<span class="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Right Pane: Active Thread Window -->
		<div class="flex-1 flex flex-col h-full bg-slate-50/30 dark:bg-[#161138]/40 {selectedTicketId ? 'flex' : 'hidden lg:flex'}">
			{#if activeTicket}
				<!-- Active Thread Header (Compact single-row on mobile, non-wrapping) -->
				<div class="p-2.5 sm:p-4 border-b border-slate-200 dark:border-[#2c235b] bg-white dark:bg-[#161138] flex items-center justify-between gap-2 shrink-0">
					<div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
						<button 
							type="button" 
							class="lg:hidden p-1.5 -ml-1 rounded-lg text-slate-500 dark:text-[#b2acd6] hover:bg-slate-100 dark:hover:bg-[#211a4e] cursor-pointer shrink-0"
							onclick={() => { selectedTicketId = null; hasUserDeselected = true; }}
							aria-label="Back to inquiries list"
						>
							<ArrowLeft size={18} />
						</button>

						<div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-linear-to-br from-[#7261ef] to-purple-600 text-white font-bold flex items-center justify-center text-xs sm:text-sm shadow-xs shrink-0 overflow-hidden">
							{#if activeTicket.user_avatar}
								<img src={activeTicket.user_avatar} alt={activeTicket.user_name} class="w-full h-full object-cover" />
							{:else}
								{activeTicket.user_name?.charAt(0) || 'U'}
							{/if}
						</div>

						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-1.5 min-w-0">
								<h4 class="font-bold text-slate-900 dark:text-[#faf9fe] text-xs sm:text-base truncate m-0">
									{activeTicket.user_name}
								</h4>
								<span class="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 {activeTicket.user_role === 'worker' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300'}">
									{activeTicket.user_role === 'worker' ? 'Worker' : 'Client'}
								</span>
							</div>
							<div class="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 dark:text-[#b2acd6] truncate mt-0.5">
								<span class="truncate">{activeTicket.user_email}</span>
								{#if activeTicket.user_phone}
									<span class="hidden sm:inline shrink-0">• {activeTicket.user_phone}</span>
								{/if}
							</div>
						</div>
					</div>

					<!-- Actions -->
					<div class="flex items-center gap-1.5 shrink-0">
						<button
							type="button"
							class="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-pointer shrink-0"
							title="Delete inquiry"
							aria-label="Delete inquiry"
							onclick={() => onopendelete('support', activeTicket.id, activeTicket.subject)}
						>
							<Trash2 size={18} />
						</button>
					</div>
				</div>

				<!-- Subject Strip -->
				<div class="px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-100/70 dark:bg-[#211a4e]/50 border-b border-slate-200 dark:border-[#2c235b] flex items-center justify-between text-xs gap-2 shrink-0">
					<div class="flex items-center gap-1.5 min-w-0 flex-1 truncate">
						<span class="text-slate-500 dark:text-[#77719f] font-semibold shrink-0">Subject:</span>
						<span class="font-bold text-slate-900 dark:text-[#faf9fe] truncate">{activeTicket.subject}</span>
					</div>
					<div class="flex items-center gap-1.5 shrink-0">
						<span class="h-6 inline-flex items-center justify-center px-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0 {getCategoryBadge(activeTicket.category)}">
							{activeTicket.category}
						</span>
						<select
							value={activeTicket.status}
							onchange={(e) => handleStatusChange(e.currentTarget.value)}
							disabled={updatingStatus}
							class="h-6! min-h-0! py-0! pl-2.5! pr-5.5! border inline-flex items-center justify-center text-[10px] font-bold rounded-full cursor-pointer focus:outline-none transition-all whitespace-nowrap shrink-0 shadow-2xs hover:opacity-90 active:scale-95 {getStatusBadge(activeTicket.status).class} {getStatusBadge(activeTicket.status).border}"
							title="Change ticket status"
						>
							<option value="open" class="bg-white dark:bg-[#161138] text-slate-900 dark:text-white">Open</option>
							<option value="in_progress" class="bg-white dark:bg-[#161138] text-slate-900 dark:text-white">In Progress</option>
							<option value="resolved" class="bg-white dark:bg-[#161138] text-slate-900 dark:text-white">Resolved</option>
							<option value="closed" class="bg-white dark:bg-[#161138] text-slate-900 dark:text-white">Closed</option>
						</select>
					</div>
				</div>

				<!-- Messages Area -->
				<div 
					bind:this={messagesContainer}
					class="flex-1 p-3 sm:p-5 overflow-y-auto space-y-3 sm:space-y-4 bg-slate-50/50 dark:bg-[#161138]/20"
				>
					{#if loadingMessages}
						<div class="h-full flex items-center justify-center">
							<span class="spinner spinner-sm"></span>
						</div>
					{:else if activeMessages.length === 0}
						<div class="h-full flex flex-col items-center justify-center text-slate-400 dark:text-[#77719f] text-xs">
							<p>No messages recorded for this inquiry.</p>
						</div>
					{:else}
						{#each activeMessages as msg (msg.id)}
							{@const isAdmin = msg.sender_type === 'admin'}
							<div class="flex flex-col {isAdmin ? 'items-end' : 'items-start'}">
								<div class="flex items-center gap-1.5 mb-1 px-1">
									<span class="text-[11px] font-bold inline-flex items-center gap-1 {isAdmin ? 'text-[#7261ef]' : 'text-slate-700 dark:text-[#faf9fe]'}">
										{#if isAdmin}
											<ShieldCheck size={13} class="text-[#7261ef] shrink-0" />
											<span>Serviee Admin Support</span>
										{:else}
											<span>{msg.sender_name}</span>
										{/if}
									</span>
									<span class="text-[10px] text-slate-400 dark:text-[#77719f]">
										{formatTimestamp(msg.created_at)}
									</span>
								</div>

								<div class="max-w-[88%] sm:max-w-[75%] px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs {isAdmin ? 'bg-[#7261ef] text-white rounded-br-xs' : 'bg-white dark:bg-[#211a4e] border border-slate-200 dark:border-[#2c235b] text-slate-900 dark:text-[#faf9fe] rounded-bl-xs'}">
									<p class="whitespace-pre-wrap wrap-break-word m-0">{msg.content}</p>
								</div>
							</div>
						{/each}
					{/if}
				</div>

				<!-- Quick Canned Replies -->
				<div class="p-2 sm:p-2.5 border-t border-slate-200 dark:border-[#2c235b] bg-white dark:bg-[#161138] flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shrink-0">
					<span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#77719f] flex items-center gap-1 shrink-0 pl-1">
						<Sparkles size={12} class="text-[#7261ef]" /> Quick Reply:
					</span>
					{#each CANNED_REPLIES as canned}
						{@const CannedIcon = canned.icon}
						<button
							type="button"
							class="px-2.5 py-1 rounded-lg text-xs bg-slate-100 hover:bg-[#7261ef]/15 hover:text-[#7261ef] dark:bg-[#211a4e] dark:hover:bg-[#7261ef]/25 text-slate-700 dark:text-[#b2acd6] border border-slate-200 dark:border-[#2c235b] transition-all whitespace-nowrap cursor-pointer font-medium shrink-0 inline-flex items-center gap-1.5"
							onclick={() => applyCannedReply(canned.text)}
						>
							<CannedIcon size={12} class="text-[#7261ef] shrink-0" />
							<span>{canned.label}</span>
						</button>
					{/each}
				</div>

				<!-- Reply Input Form (Matching ChatTab legit dashboard height and layout) -->
				<div class="p-2.5 sm:p-3.5 border-t border-slate-200 dark:border-[#2c235b] bg-white dark:bg-[#161138] shrink-0">
					<form 
						class="flex items-center gap-2 w-full"
						onsubmit={(e) => { e.preventDefault(); handleSendReply(); }}
					>
						<input
							type="text"
							bind:value={replyContent}
							placeholder="Type your official Admin reply..."
							autocomplete="off"
							class="flex-1 h-11 px-3.5 sm:px-4 bg-slate-50 dark:bg-[#211a4e] border border-slate-300 dark:border-[#2c235b] rounded-xl text-xs sm:text-sm text-slate-900 dark:text-[#faf9fe] placeholder-slate-400 dark:placeholder-[#77719f] focus:outline-none focus:border-[#7261ef] focus:ring-1 focus:ring-[#7261ef] transition-colors"
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									handleSendReply();
								}
							}}
						/>

						<button
							type="submit"
							disabled={!replyContent.trim() || sendingReply}
							class="h-11 px-4 sm:px-5 bg-[#7261ef] hover:bg-[#6251df] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#7261ef]/25 flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer disabled:opacity-50"
						>
							{#if sendingReply}
								<span class="spinner spinner-xs"></span>
							{:else}
								<Send size={15} />
								<span>Reply</span>
							{/if}
						</button>
					</form>
				</div>
			{:else}
				<!-- Empty Placeholder -->
				<div class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-[#77719f] space-y-3">
					<div class="w-16 h-16 rounded-2xl bg-[#7261ef]/10 text-[#7261ef] flex items-center justify-center shadow-inner">
						<Headset size={32} />
					</div>
					<h4 class="font-bold text-slate-900 dark:text-[#faf9fe] text-base mb-0.5">Select a Support Inquiry</h4>
					<p class="text-xs max-w-sm leading-relaxed">
						Click on any user ticket from the left panel to read the full inquiry thread, send admin replies, and manage issue resolution.
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>
