<script>
	import { onDestroy, onMount } from 'svelte';
	import { fade, scale, slide } from 'svelte/transition';
	import { 
		Headset, 
		X, 
		Send, 
		MessageSquare, 
		Plus, 
		ArrowLeft, 
		CheckCircle2, 
		Clock, 
		ShieldCheck, 
		AlertCircle,
		Sparkles
	} from 'lucide-svelte';
	import { playNotificationSound } from '$lib/realtimeChat.js';

	let {
		show = $bindable(false),
		user = null
	} = $props();

	let tickets = $state([]);
	let activeTicketId = $state(null);
	let activeTicket = $state(null);
	let messages = $state([]);
	let loadingTickets = $state(false);
	let loadingMessages = $state(false);

	// New Ticket Form State
	let showNewTicketForm = $state(false);
	let newCategory = $state('general');
	let newSubject = $state('');
	let newInitialMessage = $state('');
	let creatingTicket = $state(false);
	let createError = $state('');

	// Reply Message State
	let replyMessage = $state('');
	let sendingMessage = $state(false);

	let messagesContainer = $state(null);
	let pollInterval = null;

	const CATEGORIES = [
		{ id: 'general', label: 'General Question', desc: 'Questions about using Serviee features' },
		{ id: 'account', label: 'Account & Verification', desc: 'Profile, login, passwords, role switching' },
		{ id: 'job', label: 'Job Dispute / Assistance', desc: 'Help with job postings, applications, clients or workers' },
		{ id: 'technical', label: 'Report a Problem / Bug', desc: 'App errors, glitch reports, or performance issues' }
	];

	const QUICK_PROMPTS = [
		'How do I verify my account?',
		'I need help with a job dispute.',
		'How does role switching work?',
		'I have a question about payments.'
	];

	// Load user's tickets
	async function loadTickets() {
		loadingTickets = true;
		try {
			const res = await fetch('/api/support');
			const data = await res.json();
			if (data.success) {
				tickets = data.tickets || [];
				if (tickets.length === 0) {
					showNewTicketForm = true;
				}
			}
		} catch (err) {
			console.error('Error loading support tickets:', err);
		} finally {
			loadingTickets = false;
		}
	}

	// Open a ticket conversation
	async function openTicket(ticketId) {
		activeTicketId = ticketId;
		showNewTicketForm = false;
		loadingMessages = true;
		replyMessage = '';

		try {
			const res = await fetch(`/api/support?ticketId=${ticketId}`);
			const data = await res.json();
			if (data.success) {
				activeTicket = data.ticket;
				messages = data.messages || [];
				scrollToBottom();
			}
		} catch (err) {
			console.error('Error loading ticket thread:', err);
		} finally {
			loadingMessages = false;
		}
	}

	// Silent background poll to fetch new admin messages in real-time
	async function pollActiveThread() {
		if (!show || !activeTicketId) return;
		try {
			const res = await fetch(`/api/support?ticketId=${activeTicketId}`);
			const data = await res.json();
			if (data.success && data.messages) {
				if (data.messages.length > messages.length) {
					const hasNewAdminMsg = data.messages.slice(messages.length).some(m => m.sender_type === 'admin');
					if (hasNewAdminMsg) {
						playNotificationSound();
					}
					messages = data.messages;
					activeTicket = data.ticket;
					scrollToBottom();
				}
			}
		} catch (err) {
			// silent poll fail
		}
	}

	function scrollToBottom() {
		setTimeout(() => {
			if (messagesContainer) {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}
		}, 60);
	}

	// Create new inquiry ticket
	async function handleCreateTicket() {
		if (!newSubject.trim() || !newInitialMessage.trim() || creatingTicket) return;
		creatingTicket = true;
		createError = '';

		try {
			const res = await fetch('/api/support/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					category: newCategory,
					subject: newSubject.trim(),
					content: newInitialMessage.trim()
				})
			});

			const data = await res.json();
			if (data.success && data.ticket) {
				newSubject = '';
				newInitialMessage = '';
				showNewTicketForm = false;
				await loadTickets();
				await openTicket(data.ticket.id);
			} else {
				createError = data.error || 'Failed to submit inquiry. Please try again.';
			}
		} catch (err) {
			createError = err.message || 'Network error submitting inquiry.';
		} finally {
			creatingTicket = false;
		}
	}

	// Send reply to active ticket
	async function handleSendReply() {
		if (!replyMessage.trim() || !activeTicketId || sendingMessage) return;
		sendingMessage = true;
		const textToSend = replyMessage.trim();

		try {
			const res = await fetch('/api/support/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					ticketId: activeTicketId,
					content: textToSend
				})
			});

			const data = await res.json();
			if (data.success) {
				messages = [
					...messages,
					data.message || {
						id: crypto.randomUUID(),
						ticket_id: activeTicketId,
						sender_type: 'user',
						sender_name: user?.name || 'You',
						content: textToSend,
						created_at: new Date().toISOString()
					}
				];
				replyMessage = '';
				scrollToBottom();
			}
		} catch (err) {
			console.error('Failed to send message:', err);
		} finally {
			sendingMessage = false;
		}
	}

	// Format helpers
	function formatTime(isoStr) {
		if (!isoStr) return '';
		const d = new Date(isoStr);
		return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
	}

	function getStatusBadge(status) {
		switch (status) {
			case 'open': return { label: 'Open (Waiting for Admin)', class: 'bg-amber-500/10 text-amber-500' };
			case 'in_progress': return { label: 'In Progress (Admin Replying)', class: 'bg-blue-500/10 text-blue-500' };
			case 'resolved': return { label: 'Resolved', class: 'bg-emerald-500/10 text-emerald-500' };
			case 'closed': return { label: 'Closed', class: 'bg-zinc-500/10 text-zinc-400' };
			default: return { label: status, class: 'bg-blue-500/10 text-blue-500' };
		}
	}

	// Watch when modal opens
	$effect(() => {
		if (show) {
			loadTickets();
			if (!pollInterval) {
				pollInterval = setInterval(pollActiveThread, 2500);
			}
		} else {
			if (pollInterval) {
				clearInterval(pollInterval);
				pollInterval = null;
			}
			activeTicketId = null;
			activeTicket = null;
			messages = [];
		}
	});

	onDestroy(() => {
		if (pollInterval) {
			clearInterval(pollInterval);
		}
	});
</script>

{#if show}
	<div 
		class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-200 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
		transition:fade={{ duration: 150 }}
	>
		<div 
			class="w-full max-w-2xl bg-(--bg-card) border border-(--border-color) rounded-2xl shadow-2xl overflow-hidden flex flex-col h-160 max-h-[88vh] my-auto transition-all relative z-201"
			transition:scale={{ duration: 150, start: 0.96 }}
		>
			<!-- Header -->
			<div class="px-4 sm:px-6 py-4 bg-(--bg-card) border-b border-(--border-color) flex items-center justify-between gap-3 shrink-0">
				<div class="flex items-center gap-3">
					{#if activeTicketId}
						<button
							type="button"
							class="p-1.5 -ml-1.5 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-input) transition-colors cursor-pointer"
							onclick={() => { activeTicketId = null; activeTicket = null; loadTickets(); }}
							title="Back to Inquiries"
						>
							<ArrowLeft size={18} />
						</button>
					{/if}

					<div class="p-2.5 rounded-xl bg-(--accent)/10 text-(--accent) relative">
						<Headset size={20} />
						<span class="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-(--bg-card)"></span>
					</div>

					<div>
						<h3 class="font-bold text-sm sm:text-base text-(--text-primary) m-0 flex items-center gap-1.5">
							<span>Serviee Live Chat Support</span>
						</h3>
						<p class="text-[0.75rem] text-(--text-muted) m-0 flex items-center gap-1.5">
							<span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
							<span>Admin Support Desk • Fast Response</span>
						</p>
					</div>
				</div>

				<button
					type="button"
					class="p-2 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-input) transition-colors cursor-pointer"
					onclick={() => (show = false)}
					aria-label="Close"
				>
					<X size={18} />
				</button>
			</div>

			<!-- Body -->
			{#if activeTicketId && activeTicket}
				{@const badge = getStatusBadge(activeTicket.status)}
				<!-- ACTIVE CONVERSATION THREAD -->
				<div class="flex-1 flex flex-col min-h-0 bg-(--bg-card)/30">
					<!-- Inquiry Info Banner -->
					<div class="px-4 py-2.5 bg-(--bg-input)/40 border-b border-(--border-color) flex items-center justify-between text-xs gap-2">
						<div class="min-w-0">
							<span class="text-(--text-muted) font-medium">Topic:</span>
							<span class="font-semibold text-(--text-primary) ml-1 truncate">{activeTicket.subject}</span>
						</div>
						<span class="text-[0.7rem] px-2.5 py-0.5 rounded-full font-semibold shrink-0 {badge.class}">
							{badge.label}
						</span>
					</div>

					<!-- Chat Messages Box -->
					<div 
						bind:this={messagesContainer}
						class="flex-1 p-4 overflow-y-auto space-y-3.5 bg-(--bg-card)/10"
					>
						{#if loadingMessages}
							<div class="h-full flex items-center justify-center">
								<span class="spinner spinner-sm"></span>
							</div>
						{:else if messages.length === 0}
							<div class="h-full flex flex-col items-center justify-center text-(--text-muted) text-xs">
								<p>No messages yet. Send a message to get started.</p>
							</div>
						{:else}
							<!-- Welcome automated notice -->
							<div class="p-3 rounded-xl bg-(--accent)/5 border border-(--accent)/15 text-center text-xs text-(--text-secondary) space-y-1">
								<p class="font-semibold text-(--text-primary) m-0 flex items-center justify-center gap-1">
									<ShieldCheck size={14} class="text-(--accent)" />
									Inquiry Ticket #{activeTicket.id.slice(0, 8)} Active
								</p>
								<p class="text-[0.75rem] text-(--text-muted) m-0">
									Our admin team has received your message and will reply here in real-time.
								</p>
							</div>

							{#each messages as msg (msg.id)}
								{@const isAdmin = msg.sender_type === 'admin'}
								<div class="flex flex-col {isAdmin ? 'items-start' : 'items-end'}">
									<div class="flex items-center gap-1.5 mb-1 px-1">
										<span class="text-[0.7rem] font-semibold inline-flex items-center gap-1 {isAdmin ? 'text-(--accent)' : 'text-(--text-secondary)'}">
											{#if isAdmin}
												<ShieldCheck size={12} class="text-(--accent) shrink-0" />
												<span>Serviee Support Team</span>
											{:else}
												<span>You</span>
											{/if}
										</span>
										<span class="text-[0.68rem] text-(--text-muted)">
											{formatTime(msg.created_at)}
										</span>
									</div>

									<div class="max-w-[85%] sm:max-w-[78%] px-4 py-2.5 rounded-2xl text-xs sm:text-[0.86rem] leading-relaxed shadow-xs {isAdmin ? 'bg-(--bg-input) border border-(--border-color) text-(--text-primary) rounded-tl-xs' : 'bg-(--accent) text-white rounded-tr-xs'}">
										<p class="whitespace-pre-wrap wrap-break-word m-0">{msg.content}</p>
									</div>
								</div>
							{/each}
						{/if}
					</div>

					<!-- Reply Input Bar -->
					<div class="p-3.5 border-t border-(--border-color) bg-(--bg-card) shrink-0">
						<form 
							class="flex items-center gap-2"
							onsubmit={(e) => { e.preventDefault(); handleSendReply(); }}
						>
							<input
								type="text"
								bind:value={replyMessage}
								placeholder="Type your message to support..."
								autocomplete="off"
								class="flex-1 h-11 px-3.5 sm:px-4 bg-(--bg-input) border border-(--border-color) rounded-xl text-xs sm:text-sm text-(--text-primary) focus:outline-none focus:border-(--accent) transition-colors"
								onkeydown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										handleSendReply();
									}
								}}
							/>

							<button
								type="submit"
								disabled={!replyMessage.trim() || sendingMessage}
								class="btn btn-primary h-11 px-4 sm:px-5 inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold shrink-0 cursor-pointer disabled:opacity-50"
							>
								{#if sendingMessage}
									<span class="spinner spinner-xs"></span>
								{:else}
									<Send size={15} />
									<span>Send</span>
								{/if}
							</button>
						</form>
					</div>
				</div>

			{:else if showNewTicketForm}
				<!-- CREATE NEW SUPPORT INQUIRY FORM -->
				<div class="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
					<div class="flex items-center justify-between">
						<div>
							<h4 class="font-bold text-sm sm:text-base text-(--text-primary) m-0">Start a Support Inquiry</h4>
							<p class="text-xs text-(--text-muted) m-0 mt-0.5">Tell us what you need help with and our admin team will reply promptly.</p>
						</div>
						{#if tickets.length > 0}
							<button
								type="button"
								class="text-xs text-(--accent) hover:underline font-medium cursor-pointer"
								onclick={() => (showNewTicketForm = false)}
							>
								View Past Inquiries ({tickets.length})
							</button>
						{/if}
					</div>

					{#if createError}
						<div class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
							<AlertCircle size={15} class="shrink-0" />
							<span>{createError}</span>
						</div>
					{/if}

					<form onsubmit={(e) => { e.preventDefault(); handleCreateTicket(); }} class="space-y-4">
						<!-- Category Selector -->
						<div>
							<label for="support-category" class="block text-xs font-semibold text-(--text-primary) mb-1.5">
								Select Topic Category
							</label>
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
								{#each CATEGORIES as cat}
									<button
										type="button"
										class="p-2.5 rounded-xl border text-left transition-all cursor-pointer {newCategory === cat.id ? 'bg-(--accent)/10 border-(--accent) ring-1 ring-(--accent)' : 'bg-(--bg-input)/40 border-(--border-color) hover:border-(--text-muted)'}"
										onclick={() => (newCategory = cat.id)}
									>
										<div class="text-xs font-bold text-(--text-primary)">{cat.label}</div>
										<div class="text-[0.72rem] text-(--text-muted) leading-snug">{cat.desc}</div>
									</button>
								{/each}
							</div>
						</div>

						<!-- Quick Prompts -->
						<div class="flex items-center gap-1.5 flex-wrap">
							<span class="text-[0.7rem] text-(--text-muted) font-semibold uppercase tracking-wider flex items-center gap-1">
								<Sparkles size={12} class="text-(--accent)" /> Suggestions:
							</span>
							{#each QUICK_PROMPTS as prompt}
								<button
									type="button"
									class="px-2 py-1 rounded-md text-[0.72rem] bg-(--bg-input) hover:bg-(--accent)/15 hover:text-(--accent) text-(--text-secondary) border border-(--border-color) transition-colors cursor-pointer"
									onclick={() => { newSubject = prompt; newInitialMessage = `Hello, ${prompt.toLowerCase()}`; }}
								>
									{prompt}
								</button>
							{/each}
						</div>

						<!-- Subject Input -->
						<div>
							<label for="support-subject" class="block text-xs font-semibold text-(--text-primary) mb-1">
								Subject / Brief Title
							</label>
							<input
								id="support-subject"
								type="text"
								bind:value={newSubject}
								placeholder="e.g., Job booking inquiry, Account password, etc."
								required
								class="w-full py-2.5 px-3.5 bg-(--bg-input) border border-(--border-color) rounded-xl text-xs sm:text-sm text-(--text-primary) focus:outline-none focus:border-(--accent) transition-colors"
							/>
						</div>

						<!-- Message Details -->
						<div>
							<label for="support-message" class="block text-xs font-semibold text-(--text-primary) mb-1">
								How can we help you? Describe in detail:
							</label>
							<textarea
								id="support-message"
								bind:value={newInitialMessage}
								rows="4"
								placeholder="Please provide any relevant details so we can assist you quickly..."
								required
								class="w-full py-2.5 px-3.5 bg-(--bg-input) border border-(--border-color) rounded-xl text-xs sm:text-sm text-(--text-primary) focus:outline-none focus:border-(--accent) transition-colors resize-none"
							></textarea>
						</div>

						<div class="pt-1 flex items-center justify-end gap-2">
							{#if tickets.length > 0}
								<button
									type="button"
									class="px-4 py-2.5 text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) cursor-pointer"
									onclick={() => (showNewTicketForm = false)}
								>
									Cancel
								</button>
							{/if}

							<button
								type="submit"
								disabled={!newSubject.trim() || !newInitialMessage.trim() || creatingTicket}
								class="btn btn-primary px-5 py-2.5 inline-flex items-center gap-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
							>
								{#if creatingTicket}
									<span class="spinner spinner-xs"></span>
									<span>Submitting...</span>
								{:else}
									<Send size={15} />
									<span>Send to Support</span>
								{/if}
							</button>
						</div>
					</form>
				</div>

			{:else}
				<!-- LIST OF EXISTING TICKETS -->
				<div class="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 flex flex-col">
					<div class="flex items-center justify-between">
						<div>
							<h4 class="font-bold text-sm sm:text-base text-(--text-primary) m-0">Your Support Inquiries</h4>
							<p class="text-xs text-(--text-muted) m-0 mt-0.5">Click any inquiry to continue the chat with admin.</p>
						</div>

						<button
							type="button"
							class="btn btn-primary px-3.5 py-2 inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
							onclick={() => (showNewTicketForm = true)}
						>
							<Plus size={14} />
							<span>New Inquiry</span>
						</button>
					</div>

					<div class="space-y-2.5 flex-1">
						{#if loadingTickets}
							<div class="py-12 flex items-center justify-center">
								<span class="spinner spinner-sm"></span>
							</div>
						{:else if tickets.length === 0}
							<div class="py-12 text-center text-(--text-muted) flex flex-col items-center justify-center space-y-3">
								<Headset size={36} class="opacity-30" />
								<p class="text-xs font-medium">You have no active support tickets.</p>
								<button
									type="button"
									class="btn btn-primary px-4 py-2 text-xs font-semibold cursor-pointer"
									onclick={() => (showNewTicketForm = true)}
								>
									Start a Support Chat
								</button>
							</div>
						{:else}
							{#each tickets as ticket (ticket.id)}
								{@const badge = getStatusBadge(ticket.status)}
								<button
									type="button"
									class="w-full text-left p-3.5 sm:p-4 rounded-xl border border-(--border-color) bg-(--bg-input)/30 hover:bg-(--accent)/5 hover:border-(--accent)/40 transition-all flex items-center justify-between gap-3 cursor-pointer group"
									onclick={() => openTicket(ticket.id)}
								>
									<div class="min-w-0 space-y-1">
										<div class="flex items-center gap-2">
											<span class="text-[0.7rem] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold {badge.class}">
												{badge.label}
											</span>
											<span class="text-[0.72rem] text-(--text-muted)">
												{formatTime(ticket.updated_at || ticket.created_at)}
											</span>
											{#if ticket.unread_user}
												<span class="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[0.65rem] font-bold animate-pulse">
													New Reply
												</span>
											{/if}
										</div>

										<h5 class="font-bold text-xs sm:text-sm text-(--text-primary) m-0 group-hover:text-(--accent) transition-colors truncate">
											{ticket.subject}
										</h5>

										<p class="text-[0.75rem] text-(--text-muted) m-0 capitalize">
											Category: {ticket.category}
										</p>
									</div>

									<div class="p-2 rounded-lg bg-(--bg-card) group-hover:bg-(--accent) group-hover:text-white text-(--text-muted) transition-colors shrink-0">
										<MessageSquare size={16} />
									</div>
								</button>
							{/each}
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
