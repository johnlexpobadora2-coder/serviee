<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { MessageSquare, Pin, RefreshCw, Star, UserCheck, Plus, User, ClipboardList, CheckCircle2, Clock, ArrowLeft, Radio, Send, MapPin, Navigation, ExternalLink, Compass, Trash2, Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-svelte';
	import ViewProfileModal from '$lib/ViewProfileModal.svelte';
	import LocationPickerModal from '$lib/LocationPickerModal.svelte';
	import { CITIES_MUNICIPALITIES } from '$lib/locations.js';
	import { setupRealtimeChat, playNotificationSound } from '$lib/realtimeChat.js';
	import { getCurrentCoordinates, formatGpsChatMessage, parseGpsMessage, getGoogleMapsUrl, getEmbedMapUrl, isGpsMessage } from '$lib/gpsUtils.js';

	let { data, form } = $props();

	let activeTab = $state('feed'); // 'feed' | 'my-jobs' | 'chat' | 'profile'
	let historySubTab = $state('posted'); // 'posted' | 'completed'
	let activeConvId = $state('');
	let newMessageContent = $state('');
	let sendingMessage = $state(false);
	// svelte-ignore state_referenced_locally
	let conversations = $state(data.conversations || []);

	// Keep conversations reactive to data updates
	$effect(() => {
		if (data.conversations) {
			conversations = data.conversations;
		}
	});

	// Real-Time Chat WebSocket States
	let realtimeConnected = $state(false);
	let isOtherUserTyping = $state(false);
	let unreadConvIds = $state(new Set());
	/** @type {any} */
	let realtimeControls = $state(null);
	let typingTimer = null;
	let sendTypingDebounce = null;

	// View Profile Modal State
	let showViewProfileModal = $state(false);
	let viewProfileUserId = $state(null);
	let sharingLocation = $state(false);
	let showCustomLocationModal = $state(false);
	let showGpsDropup = $state(false);

	async function handleShareLocation() {
		if (!activeConversation || sendingMessage || sharingLocation) return;
		sharingLocation = true;
		try {
			const coords = await getCurrentCoordinates();
			const lat = coords.latitude.toFixed(6);
			const lng = coords.longitude.toFixed(6);
			const gpsMsgContent = formatGpsChatMessage(lat, lng, `Location shared by ${data.user.name || 'Client'}`);

			// Send location message
			await sendChatMessagePayload(gpsMsgContent);
		} catch (err) {
			alert(err.message || 'Could not acquire GPS location. Please check browser permissions.');
		} finally {
			sharingLocation = false;
		}
	}

	async function handleCustomChatLocationSaved(loc) {
		const label = loc.address ? `Custom Pin: ${loc.address}` : `Pinned Location (${loc.latitude}, ${loc.longitude})`;
		const gpsMsgContent = formatGpsChatMessage(loc.latitude, loc.longitude, label);
		await sendChatMessagePayload(gpsMsgContent);
	}

	function openViewProfile(userId) {
		if (!userId) return;
		viewProfileUserId = userId;
		showViewProfileModal = true;
	}

	let loadingMessagesConvId = $state(null);
	let loadingMoreMessages = $state(false);

	function scrollToBottom(smooth = true) {
		if (typeof window === 'undefined') return;
		setTimeout(() => {
			const body = document.getElementById('chat-messages-customer-body');
			if (body) {
				body.scrollTo({
					top: body.scrollHeight,
					behavior: smooth ? 'smooth' : 'auto'
				});
			}
		}, 50);
	}

	async function loadConversationMessages(convId, force = false) {
		if (!convId || !conversations) return;
		const targetConv = conversations.find(c => c.id === convId);
		if (!targetConv) return;
		if (targetConv.messagesLoaded && !force) return;

		loadingMessagesConvId = convId;
		try {
			const res = await fetch(`/api/messages?jobId=${encodeURIComponent(targetConv.job_id)}&otherUserId=${encodeURIComponent(targetConv.other_user_id)}&limit=20`);
			if (res.ok) {
				const result = await res.json();
				if (result.messages) {
					conversations = conversations.map(c => {
						if (c.id === convId) {
							return {
								...c,
								messages: result.messages,
								hasMore: result.hasMore,
								messagesLoaded: true
							};
						}
						return c;
					});
					scrollToBottom(false);
				}
			}
		} catch (err) {
			console.error('Failed to load conversation messages:', err);
		} finally {
			if (loadingMessagesConvId === convId) {
				loadingMessagesConvId = null;
			}
		}
	}

	async function loadMoreMessages() {
		if (loadingMoreMessages || !activeConversation || !activeConversation.messagesLoaded || activeConversation.hasMore === false || !activeConversation.messages || activeConversation.messages.length === 0) {
			return;
		}

		const oldestMsg = activeConversation.messages[0];
		const beforeTimestamp = oldestMsg ? oldestMsg.created_at : null;
		if (!beforeTimestamp) return;

		const targetConvId = activeConversation.id;
		const targetJobId = activeConversation.job_id;
		const targetOtherUserId = activeConversation.other_user_id;

		loadingMoreMessages = true;
		const body = document.getElementById('chat-messages-customer-body');
		const prevScrollHeight = body ? body.scrollHeight : 0;
		const prevScrollTop = body ? body.scrollTop : 0;

		try {
			const res = await fetch(`/api/messages?jobId=${encodeURIComponent(targetJobId)}&otherUserId=${encodeURIComponent(targetOtherUserId)}&limit=20&before=${encodeURIComponent(beforeTimestamp)}`);
			if (res.ok) {
				const result = await res.json();
				if (result.messages && result.messages.length > 0) {
					conversations = conversations.map(c => {
						if (c.id === targetConvId) {
							const existingIds = new Set((c.messages || []).map(m => m.id));
							const newOlderMsgs = result.messages.filter(m => !existingIds.has(m.id));
							return {
								...c,
								messages: [...newOlderMsgs, ...(c.messages || [])],
								hasMore: result.hasMore && newOlderMsgs.length > 0
							};
						}
						return c;
					});

					// Maintain exact scroll position after prepending older messages
					setTimeout(() => {
						if (body) {
							const newScrollHeight = body.scrollHeight;
							body.scrollTop = (newScrollHeight - prevScrollHeight) + prevScrollTop;
						}
					}, 20);
				} else {
					conversations = conversations.map(c => c.id === targetConvId ? { ...c, hasMore: false } : c);
				}
			}
		} catch (err) {
			console.error('Failed to load older messages:', err);
		} finally {
			loadingMoreMessages = false;
		}
	}

	function handleChatScroll(e) {
		const target = e.currentTarget;
		if (target && target.scrollTop <= 40 && !loadingMoreMessages && activeConversation?.hasMore) {
			loadMoreMessages();
		}
	}

	async function refreshChatData() {
		try {
			const res = await fetch('/api/messages');
			if (res.ok) {
				const result = await res.json();
				if (result.conversations) {
					const existingMap = new Map(conversations.map(c => [c.id, c]));
					conversations = result.conversations.map(newConv => {
						const existing = existingMap.get(newConv.id);
						if (existing && existing.messagesLoaded) {
							return {
								...newConv,
								messages: existing.messages,
								messagesLoaded: true
							};
						}
						return newConv;
					});
				}
			}
		} catch (err) {
			console.error('Failed to refresh chat:', err);
		}
	}

	let activeConversation = $derived(
		conversations.find(c => c.id === activeConvId) || conversations[0] || null
	);

	function selectConversation(convId) {
		activeConvId = convId;
		showGpsDropup = false;
		unreadConvIds.delete(convId);
		unreadConvIds = new Set(unreadConvIds);
		isOtherUserTyping = false;
		loadConversationMessages(convId);
		scrollToBottom(false);
	}

	function openChat(jobId, workerId) {
		const convId = `${jobId}_${workerId}`;
		activeConvId = convId;
		showGpsDropup = false;
		activeTab = 'chat';
		unreadConvIds.delete(convId);
		unreadConvIds = new Set(unreadConvIds);
		loadConversationMessages(convId);
		scrollToBottom(false);
	}

	// Auto load messages when chat tab is active
	$effect(() => {
		if (activeTab === 'chat' && activeConversation && !activeConversation.messagesLoaded && loadingMessagesConvId !== activeConversation.id) {
			loadConversationMessages(activeConversation.id);
		}
	});

	// Incoming message handler from Supabase Realtime WebSocket
	function handleIncomingMessage(msg) {
		if (!msg || !conversations) return;

		let matchedConv = conversations.find(c => 
			c.job_id === msg.job_id && (c.other_user_id === msg.sender_id || c.other_user_id === msg.receiver_id)
		);

		if (matchedConv) {
			conversations = conversations.map(c => {
				if (c.id === matchedConv.id) {
					let updatedMsgs = c.messages || [];
					if (c.messagesLoaded) {
						const existingIdx = (c.messages || []).findIndex(m => m.id === msg.id);
						if (existingIdx !== -1) {
							return c;
						}

						const optimisticIdx = (c.messages || []).findIndex(m => 
							m.id && String(m.id).startsWith('temp_') && m.content === msg.content && m.sender_id === msg.sender_id
						);

						if (optimisticIdx !== -1) {
							updatedMsgs = [...c.messages];
							updatedMsgs[optimisticIdx] = msg;
						} else {
							updatedMsgs = [...(c.messages || []), msg];
						}
					}

					return {
						...c,
						last_message: msg.content,
						last_message_at: msg.created_at,
						messages: updatedMsgs
					};
				}
				return c;
			}).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

			if (msg.sender_id !== data.user?.id) {
				playNotificationSound();
				isOtherUserTyping = false;
				if (activeTab !== 'chat' || activeConversation?.id !== matchedConv.id) {
					unreadConvIds.add(matchedConv.id);
					unreadConvIds = new Set(unreadConvIds);
				}
			}

			if (activeConversation?.id === matchedConv.id) {
				scrollToBottom(true);
			}
		} else {
			if (msg.sender_id !== data.user?.id) {
				playNotificationSound();
			}
			refreshChatData();
		}
	}

	// Realtime WebSocket Subscription Lifecycle Effect
	$effect(() => {
		if (!data.user?.id) return;

		const rt = setupRealtimeChat({
			currentUserId: data.user.id,
			onMessage: (msg) => {
				handleIncomingMessage(msg);
			},
			onTyping: ({ convId, isTyping }) => {
				if (activeConversation && activeConversation.id === convId) {
					isOtherUserTyping = isTyping;
					if (typingTimer) clearTimeout(typingTimer);
					if (isTyping) {
						typingTimer = setTimeout(() => {
							isOtherUserTyping = false;
						}, 3000);
					}
				}
			},
			onStatusChange: (status) => {
				realtimeConnected = (status === 'SUBSCRIBED');
			}
		});

		realtimeControls = rt;

		return () => {
			if (rt) rt.unsubscribe();
		};
	});

	function handleTypingInput() {
		if (!realtimeControls || !activeConversation) return;
		realtimeControls.sendTypingSignal(activeConversation.id, true);
		if (sendTypingDebounce) clearTimeout(sendTypingDebounce);
		sendTypingDebounce = setTimeout(() => {
			if (realtimeControls && activeConversation) {
				realtimeControls.sendTypingSignal(activeConversation.id, false);
			}
		}, 2000);
	}

	async function sendChatMessagePayload(contentPayload) {
		const trimmed = contentPayload.trim();
		if (!trimmed || !activeConversation || sendingMessage) return;

		const targetConv = activeConversation;
		const currentJobId = targetConv.job_id;
		const currentReceiverId = targetConv.other_user_id;

		if (sendTypingDebounce) clearTimeout(sendTypingDebounce);
		if (realtimeControls) {
			realtimeControls.sendTypingSignal(targetConv.id, false);
		}

		// Optimistic Message Creation
		const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
		const nowIso = new Date().toISOString();
		const optimisticMsg = {
			id: tempId,
			job_id: currentJobId,
			sender_id: data.user.id,
			receiver_id: currentReceiverId,
			content: trimmed,
			created_at: nowIso
		};

		conversations = conversations.map(c => {
			if (c.id === targetConv.id) {
				const previewText = isGpsMessage(trimmed) ? '📍 Shared GPS Location' : trimmed;
				return {
					...c,
					last_message: previewText,
					last_message_at: nowIso,
					messages: [...(c.messages || []), optimisticMsg],
					messagesLoaded: true
				};
			}
			return c;
		}).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

		scrollToBottom(true);

		// Broadcast message instantly over WebSocket to recipient
		if (realtimeControls) {
			realtimeControls.sendBroadcastMessage(optimisticMsg);
		}

		sendingMessage = true;
		try {
			const res = await fetch('/api/messages/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jobId: currentJobId,
					receiverId: currentReceiverId,
					content: trimmed
				})
			});
			const result = await res.json();
			if (result.success && result.message) {
				conversations = conversations.map(c => {
					if (c.id === targetConv.id) {
						return {
							...c,
							messages: c.messages.map(m => m.id === tempId ? result.message : m)
						};
					}
					return c;
				});
			}
		} catch (err) {
			console.error('Failed to send message:', err);
		} finally {
			sendingMessage = false;
		}
	}

	async function handleSendMessage(e) {
		if (e) e.preventDefault();
		const trimmed = newMessageContent.trim();
		if (!trimmed) return;
		newMessageContent = '';
		await sendChatMessagePayload(trimmed);
	}

	let showMobileFilters = $state(false);
	let searchQuery = $state('');
	let searchCategory = $state('');
	// svelte-ignore state_referenced_locally
	let searchLocation = $state(data.user?.address || '');
	/** @type {number | null} */
	let minBudget = $state(null);

	let hasActiveFilters = $derived(
		!!searchCategory || 
		(searchLocation !== '' && searchLocation !== (data.user?.address || '')) || 
		!!minBudget
	);

	// Client-side category & text filtering helper for global feed
	let filteredJobs = $derived(
		(data.allJobs || []).filter(job => {
			const isNotCompleted = job.status !== 'completed';
			const q = searchQuery.trim().toLowerCase();
			const matchesSearch = !q || 
				(job.title && job.title.toLowerCase().includes(q)) || 
				(job.description && job.description.toLowerCase().includes(q));
			const matchesCategory = !searchCategory || job.category === searchCategory;
			const matchesLocation = !searchLocation || job.location.toLowerCase().includes(searchLocation.toLowerCase());
			const matchesBudget = !minBudget || job.budget >= minBudget;
			return isNotCompleted && matchesSearch && matchesCategory && matchesLocation && matchesBudget;
		})
	);

	let activeJobs = $derived(data.posts.filter(job => job.status !== 'completed'));
	let completedJobs = $derived(data.posts.filter(job => job.status === 'completed'));

	// Modal State
	let showRatingModal = $state(false);
	/** @type {any} */
	let activeJobForRating = $state(null);
	let ratingValue = $state(5);
	let reviewText = $state('');

	// Client-side loading state
	let postingJob = $state(false);
	let changingStatus = $state(false);

	// Delete Job Modal State
	let deleteJobModal = $state({
		open: false,
		id: null,
		title: '',
		deleting: false
	});

	function openDeleteJobModal(job) {
		deleteJobModal = {
			open: true,
			id: job.id,
			title: job.title,
			deleting: false
		};
	}

	function closeDeleteJobModal() {
		deleteJobModal = {
			open: false,
			id: null,
			title: '',
			deleting: false
		};
	}

	// Category mapping for badge styling helper
	function getCategoryBadge(category) {
		switch (category) {
			case 'Plumbing / Tubero': return 'badge-plumbing';
			case 'Roofing / Ayos Yero': return 'badge-roofing';
			case 'Excavation / Hukay Lupa': return 'badge-excavation';
			case 'Gardening': return 'badge-gardening';
			case 'Carpentry': return 'badge-carpentry';
			default: return 'badge-general';
		}
	}

	function openRatingModal(job) {
		activeJobForRating = job;
		ratingValue = 5;
		reviewText = '';
		showRatingModal = true;
	}

	function selectRating(val) {
		ratingValue = val;
	}
</script>

<svelte:head>
	<title>Customer Dashboard | Serviee</title>
</svelte:head>

<!-- Tab Navigation Header -->
<div class="tabs-header">
	<button 
		type="button" 
		class="tab-btn {activeTab === 'feed' ? 'active' : ''}" 
		onclick={() => activeTab = 'feed'}
		id="tab-feed-btn"
	>
		Sideline Feed (Job Board)
	</button>
	<button 
		type="button" 
		class="tab-btn {activeTab === 'my-jobs' ? 'active' : ''}" 
		onclick={() => activeTab = 'my-jobs'}
		id="tab-myjobs-btn"
	>
		My Active Jobs ({activeJobs.length})
	</button>
	<button 
		type="button" 
		class="tab-btn {activeTab === 'chat' ? 'active' : ''}" 
		onclick={() => {
			activeTab = 'chat';
			if (activeConversation) {
				unreadConvIds.delete(activeConversation.id);
				unreadConvIds = new Set(unreadConvIds);
			}
			scrollToBottom(false);
		}}
		id="tab-chat-btn"
		style="display: inline-flex; align-items: center; gap: 0.4rem;"
	>
		<MessageSquare size={16} /> Messages ({conversations?.length || 0})
		{#if unreadConvIds.size > 0}
			<span class="badge-unread-counter">{unreadConvIds.size}</span>
		{/if}
	</button>
	<button 
		type="button" 
		class="tab-btn {activeTab === 'profile' ? 'active' : ''}" 
		onclick={() => activeTab = 'profile'}
		id="tab-profile-btn"
	>
		My Profile & History
	</button>
</div>

{#if form?.success}
	<div style="background-color: var(--success-light); border: 1px solid var(--success); color: var(--text-primary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.95rem;">
		{form.success}
	</div>
{/if}

{#if form?.error}
	<div style="background-color: var(--error-light); border: 1px solid var(--error); color: var(--text-primary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.95rem;">
		{form.error}
	</div>
{/if}

<!-- TAB 1: SIDELINE FEED (GLOBAL JOB BOARD + FILTERS) -->
{#if activeTab === 'feed'}
	<div class="dashboard-layout">
		
		<!-- Mobile Filter Toggle Button (visible only on mobile) -->
		<button 
			type="button" 
			class="mobile-filter-toggle-btn"
			onclick={() => showMobileFilters = !showMobileFilters}
			aria-expanded={showMobileFilters}
		>
			<span style="display: flex; align-items: center; gap: 0.5rem;">
				<SlidersHorizontal size={16} />
				<span>{showMobileFilters ? 'Hide Filter Options' : 'Filter Jobs by Category / Location'}</span>
				{#if hasActiveFilters}
					<span class="active-filter-indicator"></span>
				{/if}
			</span>
			{#if showMobileFilters}
				<ChevronUp size={16} />
			{:else}
				<ChevronDown size={16} />
			{/if}
		</button>

		<!-- Filters sidebar (always visible on desktop, toggleable on mobile) -->
		<aside 
			class="card feed-filters-card feed-filters-aside {showMobileFilters ? 'mobile-open' : ''}" 
			style="position: sticky; top: 90px; padding: 1.25rem; height: fit-content;"
		>
			<h4 style="font-size: 1.1rem; margin-bottom: 0.75rem;">Filter Jobs</h4>
			
			<div class="feed-filters-grid">
				<div class="form-group form-group-full">
					<label for="filter-category">Category</label>
					<select id="filter-category" bind:value={searchCategory}>
						<option value="">All Categories</option>
						<option value="Plumbing / Tubero">Plumbing / Tubero</option>
						<option value="Roofing / Ayos Yero">Roofing / Ayos Yero</option>
						<option value="Excavation / Hukay Lupa">Excavation / Hukay Lupa</option>
						<option value="Gardening">Gardening / Landscape</option>
						<option value="Carpentry">Carpentry / Karpintero</option>
						<option value="General Manual Labor">General Manual Labor</option>
					</select>
				</div>

				<div class="form-group">
					<label for="filter-location">City/Municipality</label>
					<select 
						id="filter-location" 
						bind:value={searchLocation} 
					>
						<option value="">All Locations</option>
						{#each CITIES_MUNICIPALITIES as city}
							<option value={city}>{city}</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="filter-budget">Min Budget (₱)</label>
					<input 
						type="number" 
						id="filter-budget" 
						placeholder="E.g. 500" 
						bind:value={minBudget} 
					/>
				</div>
			</div>
		</aside>

		<!-- Feed stream list -->
		<section style="display: flex; flex-direction: column; gap: 1.25rem;">
			<!-- Search Bar above Job Postings -->
			<div class="job-search-bar-container">
				<div class="job-search-input-wrapper">
					<Search size={18} class="job-search-icon" />
					<input 
						type="text" 
						id="job-search-input" 
						placeholder="Search jobs by title or description..." 
						bind:value={searchQuery}
						class="job-search-input"
					/>
					{#if searchQuery}
						<button 
							type="button" 
							class="job-search-clear-btn" 
							onclick={() => searchQuery = ''}
							aria-label="Clear search"
						>
							<X size={15} />
						</button>
					{/if}
				</div>
			</div>

			<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
				<h2 style="font-size: 1.4rem;">All Available Postings ({filteredJobs.length})</h2>
				<a href="/customer/post-job" class="btn btn-primary" style="width: auto; padding: 0.5rem 1.25rem;">
					+ Post a Job
				</a>
			</div>

			{#if filteredJobs.length === 0}
				<div class="card" style="text-align: center; padding: 4rem 2rem; border-style: dashed;">
					<h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">No job postings found.</h4>
					<p style="color: var(--text-secondary); font-size: 0.9rem;">
						Try modifying your filters or check back later for new job postings.
					</p>
				</div>
			{:else}
				{#each filteredJobs as job (job.id)}
					<div class="card feed-job-card">
						<div class="feed-job-header">
							<div>
								<div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.35rem;">
									<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
									<span class="status status-{job.status}">
										{#if job.status === 'open'} Open
										{:else if job.status === 'assigned'} Assigned
										{:else if job.status === 'in_progress'} In Progress
										{:else} Completed
										{/if}
									</span>
									<span style="font-size: 0.75rem; color: var(--text-muted);">
										Posted: {new Date(job.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
									</span>
								</div>
								<h3 class="feed-job-title">{job.title}</h3>
								<span style="font-size: 0.8rem; color: var(--text-secondary);">
									Posted by: 
									{#if job.customer_id !== data.user.id}
										<button 
											type="button" 
											style="background: none; border: none; color: var(--accent); font-weight: 600; cursor: pointer; text-decoration: underline; padding: 0; font-size: inherit;"
											onclick={() => openViewProfile(job.customer_id)}
										>
											{job.customerName}
										</button>
									{:else}
										<strong>{job.customerName} (You)</strong>
									{/if}
								</span>
							</div>
							<div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem;">
								<strong class="feed-job-budget" style="color: var(--accent); font-size: 1.25rem; display: block;">₱{job.budget.toLocaleString()}</strong>
								{#if job.customer_id === data.user.id}
									<button
										type="button"
										class="btn btn-outline"
										style="padding: 0.25rem 0.6rem; font-size: 0.75rem; border-color: #ef4444; color: #ef4444; display: inline-flex; align-items: center; gap: 0.3rem;"
										onclick={() => openDeleteJobModal(job)}
										title="Delete Your Job Post"
									>
										<Trash2 size={13} />
										<span>Delete</span>
									</button>
								{/if}
							</div>
						</div>

						<p class="feed-job-desc">
							{job.description}
						</p>

						<div class="metadata-bar feed-job-meta">
							<div><strong>Location:</strong> {job.location}</div>
							<div><strong>Schedule:</strong> {new Date(job.target_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
							{#if job.latitude && job.longitude}
								<div>
									<a 
										href={getGoogleMapsUrl(job.latitude, job.longitude, job.title)} 
										target="_blank" 
										rel="noopener noreferrer" 
										class="gps-badge"
									>
										<MapPin size={12} /> Google Maps
									</a>
								</div>
							{/if}
						</div>

						{#if job.latitude && job.longitude}
							<div class="feed-job-map-preview">
								<div class="feed-job-map-header">
									<div style="display: flex; align-items: center; gap: 0.35rem; color: var(--accent-hover); font-weight: 600;">
										<MapPin size={13} /> Pinned GPS Location ({job.latitude}, {job.longitude})
									</div>
									<a 
										href={getGoogleMapsUrl(job.latitude, job.longitude, job.title)} 
										target="_blank" 
										rel="noopener noreferrer" 
										class="btn btn-outline"
										style="padding: 0.15rem 0.5rem; font-size: 0.72rem; border-color: var(--accent); color: var(--accent-hover);"
									>
										<ExternalLink size={11} /> Open Directions
									</a>
								</div>
								<div class="feed-job-map-iframe-container">
									<iframe 
										title="Pinned Job Location Map"
										src={getEmbedMapUrl(job.latitude, job.longitude)}
										loading="lazy"
									></iframe>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</section>
	</div>
{/if}

<!-- TAB 2: MY ACTIVE JOBS -->
{#if activeTab === 'my-jobs'}
	<div style="max-width: 900px; margin: 0 auto; width: 100%;">
		<!-- Dashboard Header -->
		<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
			<h2 style="font-size: 1.75rem; margin: 0;">My Active Jobs ({activeJobs.length})</h2>
			<a href="/customer/post-job" class="btn btn-primary" style="width: auto; padding: 0.6rem 1.5rem;" id="post-new-job-btn">
				+ Post a New Job
			</a>
		</div>

		<div style="display: flex; flex-direction: column; gap: 1.5rem;">
			{#if activeJobs.length === 0}
				<div class="card" style="text-align: center; padding: 5rem 2rem; border-style: dashed;">
					<h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">You have no active jobs right now.</h4>
					<p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 450px; margin: 0 auto 1.5rem auto;">
						Post a job describing what you need to connect with local sideline workers and handymen in your area.
					</p>
					<a href="/customer/post-job" class="btn btn-primary" style="width: auto; display: inline-flex; margin: 0 auto;">
						Post Your First Job
					</a>
				</div>
			{:else}
				{#each activeJobs as job (job.id)}
					<div class="card feed-job-card">
						
						<!-- Job Header -->
						<div class="feed-job-header">
							<div>
								<div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.35rem;">
									<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
									<span class="status status-{job.status}">
										{#if job.status === 'open'} Naghahanap
										{:else if job.status === 'assigned'} Assigned
										{:else if job.status === 'in_progress'} In Progress
										{:else} Completed
										{/if}
									</span>
									<span style="font-size: 0.75rem; color: var(--text-muted);">
										Posted: {new Date(job.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
									</span>
								</div>
								<h3 class="feed-job-title">{job.title}</h3>
							</div>

							<div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem;">
								<strong class="feed-job-budget" style="color: var(--accent); font-size: 1.25rem; display: block;">₱{job.budget.toLocaleString()}</strong>
								<button
									type="button"
									class="btn btn-outline"
									style="padding: 0.25rem 0.6rem; font-size: 0.75rem; border-color: #ef4444; color: #ef4444; display: inline-flex; align-items: center; gap: 0.3rem;"
									onclick={() => openDeleteJobModal(job)}
									title="Delete Job Post"
								>
									<Trash2 size={13} />
									<span>Delete Post</span>
								</button>
							</div>
						</div>

						<!-- Details Info -->
						<div style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; border-left: 2px solid var(--border-color); padding-left: 1rem;">
							<p>{job.description}</p>
						</div>

						<!-- Metadata details bar -->
						<div class="metadata-bar">
							<div><strong>Location:</strong> {job.location}</div>
							<div><strong>Target Date:</strong> {new Date(job.target_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
							{#if job.latitude && job.longitude}
								<div>
									<a 
										href={getGoogleMapsUrl(job.latitude, job.longitude, job.title)} 
										target="_blank" 
										rel="noopener noreferrer" 
										class="gps-badge"
									>
										<MapPin size={12} /> Google Maps
									</a>
								</div>
							{/if}
						</div>

						{#if job.latitude && job.longitude}
							<div class="feed-job-map-preview">
								<div class="feed-job-map-header">
									<div style="display: flex; align-items: center; gap: 0.35rem; color: var(--accent-hover); font-weight: 600;">
										<MapPin size={13} /> Pinned GPS Location ({job.latitude}, {job.longitude})
									</div>
									<a 
										href={getGoogleMapsUrl(job.latitude, job.longitude, job.title)} 
										target="_blank" 
										rel="noopener noreferrer" 
										class="btn btn-outline"
										style="padding: 0.15rem 0.5rem; font-size: 0.72rem; border-color: var(--accent); color: var(--accent-hover);"
									>
										<ExternalLink size={11} /> Open Directions
									</a>
								</div>
								<div class="feed-job-map-iframe-container">
									<iframe 
										title="Pinned Job Location Map"
										src={getEmbedMapUrl(job.latitude, job.longitude)}
										loading="lazy"
									></iframe>
								</div>
							</div>
						{/if}

						<!-- WORKER ASSIGNMENT & STATUS ACTIONS -->
						<div style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 0.5rem;">
							{#if job.status === 'open'}
								<h4 style="font-size: 0.95rem; margin-bottom: 0.75rem; color: var(--text-primary);">
									Applicants ({job.applicants.length})
								</h4>
								{#if job.applicants.length === 0}
									<p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">
										Waiting for interested handymen or workers to apply...
									</p>
								{:else}
									<div style="display: flex; flex-direction: column; gap: 0.75rem;">
										{#each job.applicants as applicant (applicant.id)}
											<div class="applicant-card">
												<div class="applicant-info">
													<strong style="color: var(--text-primary); font-size: 0.95rem;">{applicant.name}</strong>
													<div class="applicant-meta-row">
														<span class="rating-badge {applicant.average_rating > 0 ? 'rating-badge-positive' : applicant.average_rating < 0 ? 'rating-badge-negative' : 'rating-badge-zero'}" style="display: inline-flex; align-items: center; gap: 0.2rem;">
															<Star size={11} fill="currentColor" /> {applicant.average_rating > 0 ? `+${applicant.average_rating}` : applicant.average_rating} rating
														</span>
														<span>•</span>
														<span>Completed: {applicant.completed_jobs_count}</span>
														<span>•</span>
														<span>Phone: {applicant.phone}</span>
													</div>
													{#if applicant.address}
														<span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 0.2rem;">Address: {applicant.address}</span>
													{/if}
												</div>
												<div class="applicant-actions">
													<button 
														type="button" 
														class="btn btn-outline" 
														style="padding: 0.35rem 0.65rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.3rem;"
														onclick={() => openViewProfile(applicant.id)}
													>
														<User size={13} /> Profile
													</button>
													<button 
														type="button" 
														class="btn btn-outline" 
														style="padding: 0.35rem 0.65rem; font-size: 0.8rem; border-color: var(--accent); color: var(--accent-hover); display: inline-flex; align-items: center; gap: 0.3rem;"
														onclick={() => openChat(job.id, applicant.id)}
													>
														<MessageSquare size={13} /> Open Chat
													</button>

													<form method="POST" action="?/assignWorker" use:enhance={() => {
														changingStatus = true;
														return async ({ update }) => {
															changingStatus = false;
															await update();
														};
													}}>
														<input type="hidden" name="jobId" value={job.id} />
														<input type="hidden" name="workerId" value={applicant.id} />
														<button type="submit" class="btn btn-primary" style="padding: 0.35rem 0.85rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.3rem;" disabled={changingStatus}>
															{#if changingStatus}
																<span class="spinner spinner-sm"></span>
															{:else}
																<UserCheck size={14} />
															{/if}
															Hire Worker
														</button>
													</form>
												</div>
											</div>
										{/each}
									</div>
								{/if}
							{:else if job.status === 'assigned'}
								<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
									<div>
										<span style="color: var(--text-muted); font-size: 0.85rem; display: block;">Assigned Worker:</span>
										<button 
											type="button"
											style="background: none; border: none; color: var(--text-primary); font-weight: 700; font-size: 1rem; cursor: pointer; text-decoration: underline; padding: 0;"
											onclick={() => openViewProfile(job.worker_id)}
										>
											{job.assignedWorker?.name}
										</button>
										<span class="rating-badge {job.assignedWorker?.average_rating > 0 ? 'rating-badge-positive' : job.assignedWorker?.average_rating < 0 ? 'rating-badge-negative' : 'rating-badge-zero'}" style="margin-left: 0.35rem; display: inline-flex; align-items: center; gap: 0.2rem;">
											<Star size={12} fill="currentColor" /> {job.assignedWorker?.average_rating > 0 ? `+${job.assignedWorker.average_rating}` : job.assignedWorker?.average_rating || 0}
										</span>
										<span style="color: var(--text-secondary); font-size: 0.85rem; margin-left: 0.5rem;">Phone: {job.assignedWorker?.phone}</span>
									</div>
									
									<div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
										{#if job.worker_id}
											<button 
												type="button" 
												class="btn btn-outline" 
												style="padding: 0.4rem 0.85rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;"
												onclick={() => openViewProfile(job.worker_id)}
											>
												<User size={14} /> Profile
											</button>
											<button 
												type="button" 
												class="btn btn-outline" 
												style="padding: 0.4rem 0.85rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;"
												onclick={() => openChat(job.id, job.worker_id)}
											>
												<MessageSquare size={14} /> Chat Worker
											</button>
										{/if}

										<form method="POST" action="?/startJob" use:enhance={() => {
											changingStatus = true;
											return async ({ update }) => {
												changingStatus = false;
												await update();
											};
										}}>
											<input type="hidden" name="jobId" value={job.id} />
											<button type="submit" class="btn btn-primary" style="padding: 0.4rem 1rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;" disabled={changingStatus}>
												{#if changingStatus}
													<span class="spinner spinner-sm"></span>
												{/if}
												Start Job Execution
											</button>
										</form>
									</div>
								</div>
							{:else if job.status === 'in_progress'}
								<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
									<div>
										<span style="color: var(--text-muted); font-size: 0.85rem; display: block;">Job Status:</span>
										<span style="color: var(--accent); font-weight: 600;">Work In Progress by {job.assignedWorker?.name}</span>
									</div>
									
									<div style="display: flex; gap: 0.5rem; align-items: center;">
										{#if job.worker_id}
											<button 
												type="button" 
												class="btn btn-outline" 
												style="padding: 0.4rem 0.85rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;"
												onclick={() => openChat(job.id, job.worker_id)}
											>
												<MessageSquare size={14} /> Chat Worker
											</button>
										{/if}

										<button 
											type="button" 
											class="btn btn-primary" 
											style="padding: 0.4rem 1rem; font-size: 0.85rem;"
											onclick={() => openRatingModal(job)}
										>
											Mark Completed & Rate (-5 to +5 Stars)
										</button>
									</div>
								</div>
							{:else if job.status === 'completed'}
								<div style="font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem;">
									<span>
										This project has been successfully completed by <strong>{job.assignedWorker?.name}</strong>.
									</span>
								</div>
							{/if}
						</div>

					</div>
				{/each}
			{/if}
		</div>
	</div>
{/if}

<!-- TAB: MESSAGES & CHAT -->
{#if activeTab === 'chat'}
	<div class="chat-container {activeConvId ? 'has-active-conv' : ''}">
		<!-- Left Sidebar: Conversations List -->
		<div class="chat-threads-sidebar">
			<div class="chat-threads-header" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
				<div style="display: flex; align-items: center; gap: 0.5rem;">
					<MessageSquare size={18} /> Inquiries & Messages
				</div>
			</div>
			<div class="chat-thread-list">
				{#if !conversations || conversations.length === 0}
					<div style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
						No active chats yet.<br>When workers inquire on your job posts, chats will appear here.
					</div>
				{:else}
					{#each conversations as conv (conv.id)}
						<button 
							type="button" 
							class="chat-thread-item {activeConversation?.id === conv.id ? 'active' : ''}"
							onclick={() => selectConversation(conv.id)}
						>
							<div class="chat-avatar" style="position: relative;">
								{conv.other_user_name ? conv.other_user_name.charAt(0).toUpperCase() : 'U'}
								{#if unreadConvIds.has(conv.id)}
									<span class="chat-unread-dot" style="position: absolute; top: -2px; right: -2px; border: 2px solid var(--bg-card);"></span>
								{/if}
							</div>
							<div class="chat-thread-info">
								<div class="chat-thread-top">
									<span class="chat-thread-name">{conv.other_user_name}</span>
									<span class="chat-role-badge">{conv.other_user_role || 'Worker'}</span>
								</div>
								<div class="chat-thread-title">
									<Pin size={11} style="flex-shrink: 0;" /> <span class="chat-thread-title-text">{conv.job_title}</span>
								</div>
								<div class="chat-thread-preview" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
									<span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
										{conv.last_message || 'No messages yet.'}
									</span>
									{#if unreadConvIds.has(conv.id)}
										<span class="badge-unread-counter" style="font-size: 0.65rem; height: 14px; min-width: 14px; padding: 0 3px;">•</span>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Right Panel: Message Thread Window -->
		<div class="chat-window">
			{#if activeConversation}
				<div class="chat-header">
					<div style="display: flex; align-items: center; gap: 0.5rem;">
						<button
							type="button"
							class="btn btn-outline mobile-back-btn"
							style="padding: 0.3rem 0.5rem; display: none; align-items: center;"
							onclick={() => {
								activeConvId = '';
								showGpsDropup = false;
							}}
						>
							<ArrowLeft size={16} />
						</button>
						<div>
							<h4 style="margin: 0; font-size: 1.05rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
								{activeConversation.other_user_name}
								<button 
									type="button" 
									class="btn btn-outline" 
									style="padding: 0.15rem 0.5rem; font-size: 0.72rem; border-color: var(--accent); color: var(--accent-hover);"
									onclick={() => openViewProfile(activeConversation.other_user_id)}
								>
									<User size={11} /> Profile
								</button>
							</h4>
							<span style="font-size: 0.78rem; color: var(--accent-hover); display: block;">
								Job: {activeConversation.job_title}
							</span>
						</div>
					</div>
				</div>

				<div class="chat-messages-body" id="chat-messages-customer-body" onscroll={handleChatScroll}>
					{#if loadingMessagesConvId === activeConversation.id && (!activeConversation.messages || activeConversation.messages.length === 0)}
						<div style="display: flex; align-items: center; justify-content: center; height: 100%; min-height: 180px; margin: auto;">
							<div class="spinner spinner-accent"></div>
						</div>
					{:else if !activeConversation.messages || activeConversation.messages.length === 0}
						<div style="text-align: center; color: var(--text-muted); margin: auto; font-size: 0.9rem;">
							Start conversation with {activeConversation.other_user_name}...
						</div>
					{:else}
						{#if loadingMoreMessages}
							<div style="display: flex; align-items: center; justify-content: center; padding: 0.5rem 0; width: 100%;">
								<div class="spinner spinner-sm spinner-accent"></div>
							</div>
						{:else if activeConversation.hasMore}
							<div style="text-align: center; padding: 0.3rem 0; margin-bottom: 0.5rem;">
								<button 
									type="button" 
									class="btn btn-outline" 
									style="font-size: 0.72rem; padding: 0.15rem 0.6rem; opacity: 0.8; border-color: var(--border-color); color: var(--text-muted);"
									onclick={loadMoreMessages}
								>
									Load older messages
								</button>
							</div>
						{/if}
						{#each activeConversation.messages as msg (msg.id || msg.created_at)}
							{@const gpsData = parseGpsMessage(msg.content)}
							<div class="chat-bubble {msg.sender_id === data.user.id ? 'sent' : 'received'}">
								{#if gpsData}
									<div class="chat-location-card">
										<div class="chat-location-header">
											<MapPin size={15} color="var(--accent-hover)" />
											<span>{gpsData.label}</span>
										</div>
										<div class="chat-location-preview-box">
											<iframe 
												title="Shared GPS Location"
												src={gpsData.embedUrl}
												loading="lazy"
											></iframe>
										</div>
										<div style="font-size: 0.72rem; opacity: 0.85;">
											Coordinates: {gpsData.lat}, {gpsData.lng}
										</div>
										<div class="chat-location-actions">
											<a 
												href={gpsData.mapUrl} 
												target="_blank" 
												rel="noopener noreferrer" 
												class="chat-location-btn"
											>
												<ExternalLink size={13} /> Open in Google Maps
											</a>
										</div>
									</div>
								{:else}
									<div>{msg.content}</div>
								{/if}
								<div class="chat-time">
									{new Date(msg.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
								</div>
							</div>
						{/each}
					{/if}

					{#if isOtherUserTyping}
						<div class="chat-typing-indicator">
							<span>{activeConversation.other_user_name} is typing</span>
							<div class="typing-dots">
								<span class="typing-dot"></span>
								<span class="typing-dot"></span>
								<span class="typing-dot"></span>
							</div>
						</div>
					{/if}
				</div>

				<div class="chat-footer">
					<form onsubmit={handleSendMessage} style="display: flex; gap: 0.5rem; align-items: center; width: 100%;">
						<input type="hidden" name="jobId" value={activeConversation.job_id} />
						<input type="hidden" name="receiverId" value={activeConversation.other_user_id} />
						
						<!-- Mobile GPS Icon with Dropup Menu -->
						<div class="chat-gps-mobile-container">
							<button 
								type="button" 
								class="chat-gps-mobile-trigger {showGpsDropup ? 'active' : ''}" 
								onclick={() => showGpsDropup = !showGpsDropup}
								aria-label="Location options"
								title="Share Location"
							>
								{#if sharingLocation}
									<span class="spinner spinner-sm"></span>
								{:else}
									<MapPin size={18} />
								{/if}
							</button>

							{#if showGpsDropup}
								<button 
									type="button" 
									class="chat-dropup-backdrop" 
									onclick={() => showGpsDropup = false}
									aria-label="Close location menu"
									tabindex="-1"
								></button>

								<div class="chat-gps-dropup-menu" role="menu">
									<button 
										type="button" 
										class="chat-dropup-item" 
										onclick={() => {
											showGpsDropup = false;
											handleShareLocation();
										}}
										disabled={sharingLocation || sendingMessage}
									>
										<Navigation size={16} color="var(--accent-hover)" />
										<div class="chat-dropup-item-info">
											<span class="dropup-title">Auto GPS</span>
											<span class="dropup-subtitle">Share current GPS location</span>
										</div>
									</button>

									<button 
										type="button" 
										class="chat-dropup-item" 
										onclick={() => {
											showGpsDropup = false;
											showCustomLocationModal = true;
										}}
										disabled={sendingMessage}
									>
										<Compass size={16} color="var(--accent-hover)" />
										<div class="chat-dropup-item-info">
											<span class="dropup-title">Custom Pin</span>
											<span class="dropup-subtitle">Search & pin on map</span>
										</div>
									</button>
								</div>
							{/if}
						</div>

						<!-- Desktop GPS Buttons -->
						<button 
							type="button" 
							class="chat-gps-btn chat-gps-desktop-btn" 
							onclick={handleShareLocation}
							disabled={sharingLocation || sendingMessage}
							title="Share your current device GPS location"
						>
							{#if sharingLocation}
								<span class="spinner spinner-sm"></span>
							{:else}
								<Navigation size={14} />
							{/if}
							<span style="font-size: 0.8rem;">Auto GPS</span>
						</button>

						<button 
							type="button" 
							class="chat-gps-btn chat-gps-desktop-btn" 
							onclick={() => showCustomLocationModal = true}
							disabled={sendingMessage}
							title="Search & pin any custom location or friend's address"
							style="border-color: var(--accent); color: var(--accent-hover);"
						>
							<Compass size={14} />
							<span style="font-size: 0.8rem;">Pin Map</span>
						</button>

						<input 
							type="text" 
							name="content" 
							placeholder="Type your message here..." 
							bind:value={newMessageContent}
							oninput={handleTypingInput}
							autocomplete="off"
							required 
							class="chat-input-field"
							style="flex: 1; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary);"
						/>
						<button type="submit" class="btn btn-primary chat-send-btn" style="display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;" disabled={sendingMessage || !newMessageContent.trim()}>
							{#if sendingMessage}
								<span class="spinner spinner-sm"></span>
							{/if}
							Send
						</button>
					</form>
				</div>
			{:else}
				<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); flex-direction: column; gap: 0.75rem; padding: 2rem;">
					<MessageSquare size={48} style="opacity: 0.6;" />
					<p style="font-size: 0.95rem;">Select an inquiry on the left to start messaging.</p>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- TAB 3: MY PROFILE & HISTORY OF TRANSACTIONS -->
{#if activeTab === 'profile'}
	<div class="profile-container">
		
		<!-- Cover Banner & Header Card -->
		<div class="profile-header-card">
			<div class="profile-cover-banner"></div>
			<div class="profile-header-content">
				<div class="profile-header-row">
					
					<!-- Left Side: Avatar + Name + Role Badge -->
					<div class="profile-user-left">
						<div class="profile-avatar-wrapper">
							{data.user?.name ? data.user.name.charAt(0).toUpperCase() : 'U'}
						</div>
						<div class="profile-user-text">
							<h2 style="font-size: 1.6rem; margin-bottom: 0.25rem;">{data.user?.name}</h2>
							<span class="badge badge-general" style="font-size: 0.75rem;">Customer Account</span>
						</div>
					</div>

					<!-- Right Side: Stat Numbers (Total Posts & Tasks Completed) -->
					<div class="profile-stats-group">
						<div class="profile-stat-item">
							<span class="profile-stat-value">{data.posts.length}</span>
							<span class="profile-stat-label">Total Posts</span>
						</div>
						<div class="profile-stat-item">
							<span class="profile-stat-value" style="color: var(--success);">{completedJobs.length}</span>
							<span class="profile-stat-label">Tasks Completed</span>
						</div>
					</div>

				</div>
			</div>
		</div>

		<!-- Main 2-Column Grid -->
		<div class="profile-main-grid">
			
			<!-- Left Column: Introduction / Details -->
			<aside class="card" style="padding: 1.5rem;">
				<h4 style="font-size: 1.25rem; margin-bottom: 1.25rem; color: var(--text-primary);">Introduction</h4>
				<div style="display: flex; flex-direction: column; gap: 1rem; font-size: 0.9rem;">
					<div>
						<span style="color: var(--text-muted); font-size: 0.8rem; display: block; text-transform: uppercase;">Email Address</span>
						<strong style="color: var(--text-primary);">{data.user?.email}</strong>
					</div>
					<div>
						<span style="color: var(--text-muted); font-size: 0.8rem; display: block; text-transform: uppercase;">Phone Number</span>
						<strong style="color: var(--text-primary);">{data.user?.phone}</strong>
					</div>
					<div>
						<span style="color: var(--text-muted); font-size: 0.8rem; display: block; text-transform: uppercase;">Address / City</span>
						<strong style="color: var(--text-primary);">{data.user?.address}</strong>
					</div>
				</div>
			</aside>

			<!-- Right Column: History of Transactions with 2 Sub-tabs -->
			<section style="display: flex; flex-direction: column; gap: 1.25rem;">
				<div class="tabs-header" style="margin-bottom: 0.25rem;">
					<button 
						type="button" 
						class="tab-btn {historySubTab === 'posted' ? 'active' : ''}" 
						onclick={() => historySubTab = 'posted'}
						id="subtab-posted-btn"
						style="display: inline-flex; align-items: center; gap: 0.4rem;"
					>
						<ClipboardList size={16} /> Job Posted ({data.posts.length})
					</button>
					<button 
						type="button" 
						class="tab-btn {historySubTab === 'completed' ? 'active' : ''}" 
						onclick={() => historySubTab = 'completed'}
						id="subtab-completed-btn"
						style="display: inline-flex; align-items: center; gap: 0.4rem;"
					>
						<CheckCircle2 size={16} /> Completed Jobs ({completedJobs.length})
					</button>
				</div>

				{#if historySubTab === 'posted'}
					<!-- TAB 1: ALL JOBS POSTED (COMPLETED & UNCOMPLETED) -->
					{#if data.posts.length === 0}
						<div class="card" style="text-align: center; padding: 4rem 2rem; border-style: dashed;">
							<h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">No job postings created yet.</h4>
							<p style="color: var(--text-secondary); font-size: 0.9rem;">
								Your job postings (both completed and ongoing) will appear here.
							</p>
						</div>
					{:else}
						{#each data.posts as job (job.id)}
							<div class="card feed-job-card">
								<div class="feed-job-header">
									<div>
										<div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.35rem;">
											<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
											{#if job.status === 'completed'}
												<span class="status status-completed">Completed</span>
											{:else if job.status === 'in_progress'}
												<span class="status status-in-progress">In Progress</span>
											{:else}
												<span class="status status-open">Open</span>
											{/if}
											<span style="font-size: 0.75rem; color: var(--text-muted);">
												Posted: {new Date(job.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
											</span>
										</div>
										<h3 class="feed-job-title">{job.title}</h3>
									</div>
									<div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem;">
										<strong class="feed-job-budget" style="color: var(--accent); font-size: 1.25rem; display: block;">₱{job.budget.toLocaleString()}</strong>
										<button
											type="button"
											class="btn btn-outline"
											style="padding: 0.25rem 0.6rem; font-size: 0.75rem; border-color: #ef4444; color: #ef4444; display: inline-flex; align-items: center; gap: 0.3rem;"
											onclick={() => openDeleteJobModal(job)}
											title="Delete Job Post"
										>
											<Trash2 size={13} />
											<span>Delete</span>
										</button>
									</div>
								</div>

								<div style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; border-left: 2px solid var(--border-color); padding-left: 1rem;">
									<p>{job.description}</p>
								</div>

								{#if job.assignedWorker}
									<div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.25rem; font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem;">
										<span>Assigned Worker: <strong style="color: var(--text-primary);">{job.assignedWorker.name}</strong></span>
									</div>
								{/if}
							</div>
						{/each}
					{/if}

				{:else if historySubTab === 'completed'}
					<!-- TAB 2: COMPLETED JOBS (ONLY COMPLETE & RATING GIVEN TO WORKER) -->
					{#if completedJobs.length === 0}
						<div class="card" style="text-align: center; padding: 4rem 2rem; border-style: dashed;">
							<h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">No completed transactions yet.</h4>
							<p style="color: var(--text-secondary); font-size: 0.9rem;">
								Your past completed job postings and worker ratings will appear here.
							</p>
						</div>
					{:else}
						{#each completedJobs as job (job.id)}
							<div class="card feed-job-card">
								<div class="feed-job-header">
									<div>
										<div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.35rem;">
											<span class="badge {getCategoryBadge(job.category)}">{job.category}</span>
											<span class="status status-completed">Completed</span>
											<span style="font-size: 0.75rem; color: var(--text-muted);">
												Posted: {new Date(job.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
											</span>
										</div>
										<h3 class="feed-job-title">{job.title}</h3>
									</div>
									<div style="text-align: right;">
										<strong class="feed-job-budget" style="color: var(--accent); font-size: 1.25rem; display: block;">₱{job.budget.toLocaleString()}</strong>
									</div>
								</div>

								<div style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; border-left: 2px solid var(--border-color); padding-left: 1rem;">
									<p>{job.description}</p>
								</div>

								<!-- Worker & Rating details given -->
								<div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.25rem; display: flex; flex-direction: column; gap: 0.5rem;">
									<div style="font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
										<span>Completed by: <strong style="color: var(--text-primary);">{job.assignedWorker?.name || 'Worker'}</strong></span>
										{#if job.review}
											<span class="rating-badge {job.review.rating > 0 ? 'rating-badge-positive' : job.review.rating < 0 ? 'rating-badge-negative' : 'rating-badge-zero'}">
												<Star size={12} fill="currentColor" /> Rating Given: {job.review.rating > 0 ? `+${job.review.rating}` : job.review.rating} Star{Math.abs(job.review.rating) === 1 ? '' : 's'}
											</span>
										{/if}
									</div>

									{#if job.review && job.review.review_text}
										<div style="background: var(--bg-input); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); font-size: 0.88rem; color: var(--text-secondary); font-style: italic;">
											"{job.review.review_text}"
										</div>
									{/if}
								</div>

							</div>
						{/each}
					{/if}
				{/if}
			</section>

		</div>
	</div>
{/if}

<!-- COMPLETED RATING & REVIEW MODAL (-5 to +5 Stars) -->
{#if showRatingModal}
	<div class="modal-backdrop">
		<div class="modal-content" style="max-width: 600px; width: 92%;">
			<h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Mark Job as Completed & Rate Worker</h3>
			<p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1.5rem;">
				Rate worker <strong>{activeJobForRating?.assignedWorker?.name}</strong> from <strong>-5 Stars (Very Poor)</strong> to <strong>+5 Stars (Excellent)</strong>.
			</p>

			{#if form?.error && showRatingModal}
				<div style="background-color: var(--error-light); border: 1px solid var(--error); color: var(--text-primary); padding: 0.75rem; border-radius: var(--radius-md); margin-bottom: 1rem; font-size: 0.85rem;">
					{form.error}
				</div>
			{/if}

			<form method="POST" action="?/completeAndRateJob" use:enhance={() => {
				changingStatus = true;
				return async ({ update }) => {
					changingStatus = false;
					showRatingModal = false;
					await update();
				};
			}}>
				<input type="hidden" name="jobId" value={activeJobForRating?.id} />
				<input type="hidden" name="workerId" value={activeJobForRating?.worker_id} />
				<input type="hidden" name="rating" value={ratingValue} />

				<!-- Rating Selector UI (-5 to +5 Stars) -->
				<div class="form-group">
					<div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary); display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
						<span>Select Star Rating (-5 to +5):</span>
						<span class="rating-badge {ratingValue > 0 ? 'rating-badge-positive' : ratingValue < 0 ? 'rating-badge-negative' : 'rating-badge-zero'}" style="display: inline-flex; align-items: center; gap: 0.2rem;">
							<Star size={12} fill="currentColor" /> {ratingValue > 0 ? `+${ratingValue}` : ratingValue} Star{Math.abs(ratingValue) === 1 ? '' : 's'}
						</span>
					</div>
					
					<div class="rating-options-container">
						{#each [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5] as num}
							<button 
								type="button"
								class="rating-btn {ratingValue === num ? (num > 0 ? 'active-positive' : num < 0 ? 'active-negative' : 'active-zero') : ''}"
								onclick={() => selectRating(num)}
								aria-label="Rating {num}"
							>
								<span class="rating-num">{num > 0 ? `+${num}` : num}</span>
								<span class="rating-star-icon" style="display: inline-flex; align-items: center;"><Star size={12} fill="currentColor" /></span>
							</button>
						{/each}
					</div>
				</div>

				<div class="form-group" style="margin-bottom: 2rem;">
					<label for="reviewText">Comment / Feedback Review</label>
					<textarea 
						id="reviewText" 
						name="reviewText" 
						bind:value={reviewText}
						placeholder="E.g. Excellent work, completed the sideline quickly and professionally!" 
						required
					></textarea>
				</div>

				<div style="display: flex; gap: 1rem; justify-content: flex-end;">
					<button type="button" class="btn btn-secondary" onclick={() => showRatingModal = false}>
						Cancel
					</button>
					<button type="submit" class="btn btn-primary" style="background-color: var(--success); display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;" disabled={changingStatus}>
						{#if changingStatus}
							<span class="spinner spinner-sm"></span>
							<span>Submitting...</span>
						{:else}
							Submit & Complete
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- VIEW PROFILE MODAL FOR OTHER USERS -->
<ViewProfileModal 
	bind:show={showViewProfileModal} 
	userId={viewProfileUserId} 
	currentUserId={data.user?.id}
	onopenchat={(targetUserId) => {
		const matchConv = conversations?.find(c => c.other_user_id === targetUserId);
		if (matchConv) {
			selectConversation(matchConv.id);
			activeTab = 'chat';
		}
	}}
/>

<!-- CUSTOM LOCATION PINNING MODAL FOR CHAT -->
<LocationPickerModal 
	bind:show={showCustomLocationModal}
	title="Share Custom Pin / Friend's Location"
	onSave={handleCustomChatLocationSaved}
/>

<!-- CONFIRM DELETE JOB MODAL -->
{#if deleteJobModal.open}
	<div class="modal-backdrop" style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem;">
		<div class="card" style="max-width: 440px; width: 100%; border: 1px solid rgba(239, 68, 68, 0.3); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); padding: 1.75rem; text-align: center; border-radius: var(--radius-lg); background: var(--bg-card);">
			<div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); color: #ef4444; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto;">
				<Trash2 size={24} />
			</div>
			
			<h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">
				Delete Job Post?
			</h3>
			
			<p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1.5rem;">
				Sigurado ka bang gusto mong tanggalin ang <strong>"{deleteJobModal.title}"</strong>? Hindi na ito mababawi kapag na-delete.
			</p>

			<div style="display: flex; gap: 0.75rem; justify-content: center;">
				<button 
					type="button" 
					class="btn btn-secondary" 
					style="padding: 0.5rem 1.25rem; font-size: 0.9rem;"
					onclick={closeDeleteJobModal}
					disabled={deleteJobModal.deleting}
				>
					Cancel
				</button>

				<form 
					method="POST" 
					action="?/deleteJob" 
					use:enhance={() => {
						deleteJobModal.deleting = true;
						return async ({ update }) => {
							deleteJobModal.deleting = false;
							closeDeleteJobModal();
							await update();
						};
					}}
				>
					<input type="hidden" name="jobId" value={deleteJobModal.id} />
					<button 
						type="submit" 
						class="btn btn-primary" 
						style="background-color: #ef4444; border-color: #ef4444; padding: 0.5rem 1.25rem; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 0.4rem;"
						disabled={deleteJobModal.deleting}
					>
						{#if deleteJobModal.deleting}
							<span class="spinner spinner-sm"></span>
							<span>Deleting...</span>
						{:else}
							<Trash2 size={15} />
							<span>Confirm Delete</span>
						{/if}
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}


