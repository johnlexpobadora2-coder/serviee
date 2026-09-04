<script>
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { MessageSquare, Pin, RefreshCw, Star, ClipboardList, Check, User, ArrowLeft, Radio, Send, MapPin, Navigation, ExternalLink, Compass, Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-svelte';
	import ViewProfileModal from '$lib/ViewProfileModal.svelte';
	import LocationPickerModal from '$lib/LocationPickerModal.svelte';
	import { CITIES_MUNICIPALITIES } from '$lib/locations.js';
	import { setupRealtimeChat, playNotificationSound } from '$lib/realtimeChat.js';
	import { getCurrentCoordinates, formatGpsChatMessage, parseGpsMessage, getGoogleMapsUrl, getEmbedMapUrl, isGpsMessage } from '$lib/gpsUtils.js';

	import { onMount } from 'svelte';

	let { data, form } = $props();

	let activeTab = $state("feed"); // 'feed' | 'my-jobs' | 'chat' | 'profile'
	let profileSubTab = $state("history"); // 'history' | 'reviews'
	let activeConvId = $state("");
	let newMessageContent = $state("");
	let sendingMessage = $state(false);
	// svelte-ignore state_referenced_locally
	let conversations = $state(data.conversations || []);

	// Restore chat tab & active conversation on page refresh
	onMount(() => {
		try {
			const savedTab = sessionStorage.getItem('serviee_worker_tab');
			if (savedTab === 'chat') {
				activeTab = 'chat';
				const savedConvId = sessionStorage.getItem('serviee_worker_conv');
				if (savedConvId) {
					activeConvId = savedConvId;
					loadConversationMessages(savedConvId);
				}
			}
		} catch (e) {
			console.error(e);
		}
	});

	// Sync chat tab & active conversation with sessionStorage
	$effect(() => {
		try {
			if (activeTab === 'chat') {
				sessionStorage.setItem('serviee_worker_tab', 'chat');
				if (activeConvId) {
					sessionStorage.setItem('serviee_worker_conv', activeConvId);
				} else {
					sessionStorage.removeItem('serviee_worker_conv');
				}
			} else {
				sessionStorage.removeItem('serviee_worker_tab');
				sessionStorage.removeItem('serviee_worker_conv');
			}
		} catch (e) {
			console.error(e);
		}
	});

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
			const gpsMsgContent = formatGpsChatMessage(lat, lng, `Location shared by ${data.user.name || 'Worker'}`);

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
			const body = document.getElementById('chat-messages-worker-body');
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
			console.error("Failed to load conversation messages:", err);
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
		const body = document.getElementById('chat-messages-worker-body');
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
			console.error("Failed to load older messages:", err);
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
			const res = await fetch("/api/messages");
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
			console.error("Failed to refresh chat:", err);
		}
	}

	let activeConversation = $derived(
		conversations.find((c) => c.id === activeConvId) ||
			conversations[0] ||
			null,
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

	function openChat(jobId, customerId) {
		const convId = `${jobId}_${customerId}`;
		activeConvId = convId;
		showGpsDropup = false;
		activeTab = "chat";
		unreadConvIds.delete(convId);
		unreadConvIds = new Set(unreadConvIds);
		loadConversationMessages(convId);
		scrollToBottom(false);
	}

	// Auto load messages when chat tab is active
	$effect(() => {
		if (activeTab === "chat" && activeConversation && !activeConversation.messagesLoaded && loadingMessagesConvId !== activeConversation.id) {
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
	let searchQuery = $state("");
	let searchCategory = $state("");
	// svelte-ignore state_referenced_locally
	let searchLocation = $state(data.user?.address || "");
	let minBudget = $state(null);

	let hasActiveFilters = $derived(
		!!searchCategory || 
		(searchLocation !== "" && searchLocation !== (data.user?.address || "")) || 
		!!minBudget
	);

	let applyingJobId = $state(null);

	let visibleFeedJobsLimit = $state(40);

	let filteredJobs = $derived(
		data.availableJobs.filter((job) => {
			const q = searchQuery.trim().toLowerCase();
			const matchesSearch =
				!q ||
				(job.title && job.title.toLowerCase().includes(q)) ||
				(job.description && job.description.toLowerCase().includes(q));
			const matchesCategory =
				!searchCategory || job.category === searchCategory;
			const matchesLocation =
				!searchLocation ||
				job.location
					.toLowerCase()
					.includes(searchLocation.toLowerCase());
			const matchesBudget = !minBudget || job.budget >= minBudget;
			return matchesSearch && matchesCategory && matchesLocation && matchesBudget;
		}),
	);

	let visibleFeedJobs = $derived(
		filteredJobs.slice(0, visibleFeedJobsLimit)
	);

	function loadMoreFeedJobs() {
		visibleFeedJobsLimit += 20;
	}

	function handleFeedScroll() {
		if (typeof window === 'undefined') return;
		const scrollPosition = window.innerHeight + window.scrollY;
		const threshold = document.documentElement.scrollHeight - 200;
		if (scrollPosition >= threshold) {
			if (visibleFeedJobsLimit < filteredJobs.length) {
				visibleFeedJobsLimit += 20;
			}
		}
	}

	$effect(() => {
		if (typeof window !== 'undefined') {
			window.addEventListener('scroll', handleFeedScroll);
			return () => {
				window.removeEventListener('scroll', handleFeedScroll);
			};
		}
	});

	// Category mapping for badge styling helper
	function getCategoryBadge(category) {
		switch (category) {
			case "Plumbing / Tubero":
				return "badge-plumbing";
			case "Roofing / Ayos Yero":
				return "badge-roofing";
			case "Excavation / Hukay Lupa":
				return "badge-excavation";
			case "Gardening":
				return "badge-gardening";
			case "Carpentry":
				return "badge-carpentry";
			default:
				return "badge-general";
		}
	}
	let visibleMyJobsLimit = $state(20);

	let sortedMyJobs = $derived(
		[...(data.myJobs || [])].sort(
			(a, b) => new Date(b.created_at || b.target_date).getTime() - new Date(a.created_at || a.target_date).getTime()
		)
	);

	let visibleMyJobs = $derived(
		sortedMyJobs.slice(0, visibleMyJobsLimit)
	);

	function loadMoreMyJobs() {
		visibleMyJobsLimit += 20;
	}

	function handleMyJobsScroll(e) {
		const target = e.target;
		if (!target) return;
		if (target.scrollTop + target.clientHeight >= target.scrollHeight - 100) {
			if (visibleMyJobsLimit < sortedMyJobs.length) {
				visibleMyJobsLimit += 20;
			}
		}
	}
</script>

<svelte:head>
	<title>Worker Dashboard | Serviee</title>
</svelte:head>

<!-- Tab Navigation Header -->
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
		My Jobs ({data.myJobs.length})
	</button>
	<button
		type="button"
		class="tab-btn {activeTab === 'chat' ? 'active' : ''}"
		onclick={() => {
			activeTab = "chat";
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
		onclick={() => (activeTab = "profile")}
		id="tab-profile-btn"
	>
		My Profile & Feedback
	</button>
</div>

{#if form?.success}
	<div
		style="background-color: var(--success-light); border: 1px solid var(--success); color: var(--text-primary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.95rem;"
	>
		{form.success}
	</div>
{/if}

{#if form?.error}
	<div
		style="background-color: var(--error-light); border: 1px solid var(--error); color: var(--text-primary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.95rem;"
	>
		{form.error}
	</div>
{/if}

<!-- TAB 1: SIDELINE FEED -->
{#if activeTab === "feed"}
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
			style="position: sticky; top: 90px; padding: 1.25rem;"
		>
			<h4 style="font-size: 1.1rem; margin-bottom: 0.75rem;">
				Filter Jobs
			</h4>

			<div class="feed-filters-grid">
				<div class="form-group form-group-full">
					<label for="filter-category">Category</label>
					<select id="filter-category" bind:value={searchCategory}>
						<option value="">All Categories</option>
						<option value="Plumbing / Tubero">Plumbing / Tubero</option>
						<option value="Roofing / Ayos Yero"
							>Roofing / Ayos Yero</option
						>
						<option value="Excavation / Hukay Lupa"
							>Excavation / Hukay Lupa</option
						>
						<option value="Gardening">Gardening / Landscape</option>
						<option value="Carpentry">Carpentry / Karpintero</option>
						<option value="General Manual Labor"
							>General Manual Labor</option
						>
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
		<section style="display: flex; flex-direction: column; gap: 1rem; min-width: 0; width: 100%;">
			<!-- Search Bar above Job Postings -->
			<div class="job-search-bar-container">
				<div class="job-search-input-wrapper">
					<Search size={18} class="job-search-icon" />
					<input 
						type="text" 
						id="worker-job-search-input" 
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

			<div
				style="display: flex; justify-content: space-between; align-items: center;"
			>
				<h2 style="font-size: 1.3rem;">
					Available Jobs ({filteredJobs.length})
				</h2>
			</div>

			{#if filteredJobs.length === 0}
				<div
					class="card"
					style="text-align: center; padding: 3rem 1.5rem; border-style: dashed;"
				>
					<h4 style="font-size: 1.15rem; margin-bottom: 0.5rem;">
						No sideline jobs found.
					</h4>
					<p style="color: var(--text-secondary); font-size: 0.85rem;">
						Try modifying your filters or check back later for new
						job postings from clients.
					</p>
				</div>
			{:else}
				{#each visibleFeedJobs as job (job.id)}
					<div
						class="card feed-job-card"
						style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.85rem;"
					>
						<div class="feed-job-header">
							<div>
								<div
									style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.35rem;"
								>
									<span
										class="badge {getCategoryBadge(
											job.category,
										)}">{job.category}</span
									>
									<span
										style="font-size: 0.75rem; color: var(--text-muted);"
									>
										Posted: {new Date(
											job.created_at,
										).toLocaleDateString("en-PH", {
											month: "short",
											day: "numeric",
											year: "numeric",
											hour: "numeric",
											minute: "2-digit",
										})}
									</span>
								</div>
								<h3
									class="feed-job-title"
									style="font-size: 1.25rem; color: var(--text-primary);"
								>
									{job.title}
								</h3>
								<span style="font-size: 0.8rem; color: var(--text-secondary);">
									Client: 
									<button 
										type="button" 
										style="background: none; border: none; color: var(--accent); font-weight: 600; cursor: pointer; text-decoration: underline; padding: 0; font-size: inherit;"
										onclick={() => openViewProfile(job.customer_id)}
									>
										{job.customerName}
									</button>
								</span>
							</div>
							<div style="text-align: right;">
								<strong
									class="feed-job-budget"
									style="color: var(--accent); font-size: 1.25rem; display: block;"
									>₱{job.budget.toLocaleString()}</strong
								>
							</div>
						</div>

						<p
							class="feed-job-desc"
							style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;"
						>
							{job.description}
						</p>

						<div class="metadata-bar feed-job-meta">
							<div><strong>Loc:</strong> {job.location}</div>
							<div>
								<strong>Sched:</strong>
								{new Date(job.target_date).toLocaleDateString(
									"en-PH",
									{
										month: "short",
										day: "numeric",
										hour: "2-digit",
										minute: "2-digit",
									},
								)}
							</div>
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

						<div
							class="feed-job-actions"
							style="display: flex; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: 0.75rem;"
						>
							{#if job.hasApplied}
								<button
									type="button"
									class="btn btn-outline"
									style="padding: 0.45rem 1.1rem; border-color: var(--accent); color: var(--accent-hover); display: inline-flex; align-items: center; gap: 0.35rem;"
									onclick={() =>
										openChat(job.id, job.customer_id)}
								>
									<MessageSquare size={14} /> Open Chat
								</button>
							{:else}
								<form
									method="POST"
									action="?/inquireJob"
									use:enhance={() => {
										applyingJobId = job.id;
										return async ({ update }) => {
											applyingJobId = null;
											await update();
											openChat(job.id, job.customer_id);
										};
									}}
									style="width: 100%; display: flex; justify-content: flex-end;"
								>
									<input
										type="hidden"
										name="jobId"
										value={job.id}
									/>
									<input
										type="hidden"
										name="customerId"
										value={job.customer_id}
									/>
									<input
										type="hidden"
										name="initialMessage"
										value="Hello! Inquiring po ako sa sideline job na ito: {job.title}."
									/>
									<button
										type="submit"
										class="btn btn-primary"
										style="padding: 0.45rem 1.1rem; display: inline-flex; align-items: center; gap: 0.35rem;"
										disabled={applyingJobId === job.id}
										id="inquire-btn-{job.id}"
									>
										{#if applyingJobId === job.id}
											<span class="spinner spinner-sm"></span>
											<span>Connecting...</span>
										{:else}
											<MessageSquare size={14} />
											<span>Apply / Chat Client</span>
										{/if}
									</button>
								</form>
							{/if}
						</div>
					</div>
				{/each}

				{#if visibleFeedJobsLimit < filteredJobs.length}
					<div style="text-align: center; padding: 1rem 0;">
						<button
							type="button"
							class="btn btn-secondary"
							onclick={loadMoreFeedJobs}
							style="padding: 0.6rem 1.5rem;"
						>
							Load 20 More Jobs ({filteredJobs.length - visibleFeedJobsLimit} remaining)
						</button>
					</div>
				{/if}
			{/if}
		</section>
	</div>
{/if}

<!-- TAB 2: MY CURRENT JOBS -->
{#if activeTab === "my-jobs"}
	<section
		style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 900px; margin: 0 auto; max-height: calc(100vh - 180px); overflow-y: auto; padding-right: 0.5rem;"
		onscroll={handleMyJobsScroll}
	>
		<h2 style="font-size: 1.5rem;">
			My Active Jobs ({sortedMyJobs.length})
		</h2>

		{#if sortedMyJobs.length === 0}
			<div
				class="card"
				style="text-align: center; padding: 4rem 2rem; border-style: dashed;"
			>
				<h4 style="font-size: 1.25rem; margin-bottom: 0.5rem;">
					You have no active jobs at the moment.
				</h4>
				<p style="color: var(--text-secondary); font-size: 0.9rem;">
					Head over to the **Sideline Feed** tab to browse and apply
					for available jobs.
				</p>
			</div>
		{:else}
			{#each visibleMyJobs as job (job.id)}
				<div
					class="card active-job-card"
					style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.85rem;"
				>
					<div class="active-job-header">
						<div>
							<div
								style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.35rem;"
							>
								<span
									class="badge {getCategoryBadge(
										job.category,
									)}">{job.category}</span
								>
								<span class="status status-{job.status}">
									{job.status === "assigned"
										? "Assigned"
										: "In Progress"}
								</span>
								{#if job.created_at}
									<span
										style="font-size: 0.75rem; color: var(--text-muted);"
									>
										Posted: {new Date(
											job.created_at,
										).toLocaleDateString("en-PH", {
											month: "short",
											day: "numeric",
											year: "numeric",
											hour: "numeric",
											minute: "2-digit",
										})}
									</span>
								{/if}
							</div>
							<h3
								class="active-job-title"
								style="font-size: 1.25rem; color: var(--text-primary);"
							>
								{job.title}
							</h3>
						</div>
						<strong
							class="active-job-budget"
							style="color: var(--success); font-size: 1.25rem;"
							>₱{job.budget.toLocaleString()}</strong
						>
					</div>

					<p
						class="active-job-desc"
						style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;"
					>
						{job.description}
					</p>

					<!-- Client Contact Box -->
					<div
						class="active-contact-box"
						style="padding: 0.85rem 1rem; background-color: var(--accent-light); border: 1px dashed var(--accent); border-radius: var(--radius-md); font-size: 0.85rem; margin: 0.25rem 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;"
					>
						<div>
							<p style="margin-bottom: 0.2rem; font-size: 0.85rem;">
								<strong>Client:</strong> {job.customerName}
							</p>
							<p style="margin-bottom: 0;">
								<strong>Phone:</strong>
								<span
									style="font-family: monospace; font-size: 0.95rem; color: var(--accent-hover); font-weight: 600;"
									>{job.customerPhone}</span
								>
							</p>
						</div>

						<div class="active-contact-actions" style="display: flex; gap: 0.4rem; align-items: center;">
							<button
								type="button"
								class="btn btn-outline"
								style="padding: 0.4rem 0.75rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.3rem;"
								onclick={() => openViewProfile(job.customer_id)}
							>
								<User size={13} /> Profile
							</button>

							<button
								type="button"
								class="btn btn-outline"
								style="padding: 0.4rem 0.75rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.3rem;"
								onclick={() => openChat(job.id, job.customer_id)}
							>
								<MessageSquare size={13} /> Chat
							</button>
						</div>
					</div>

					<div class="metadata-bar feed-job-meta">
						<div><strong>Loc:</strong> {job.location}</div>
						<div>
							<strong>Target:</strong>
							{new Date(job.target_date).toLocaleDateString(
								"en-PH",
								{
									month: "short",
									day: "numeric",
									hour: "2-digit",
									minute: "2-digit",
								},
							)}
						</div>
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

			{#if visibleMyJobsLimit < sortedMyJobs.length}
				<div style="text-align: center; padding: 1rem 0;">
					<button
						type="button"
						class="btn btn-secondary"
						onclick={loadMoreMyJobs}
						style="padding: 0.6rem 1.5rem;"
					>
						Load 20 More Jobs ({sortedMyJobs.length - visibleMyJobsLimit} remaining)
					</button>
				</div>
			{/if}
		{/if}
	</section>
{/if}

<!-- TAB: MESSAGES & CHAT -->
{#if activeTab === "chat"}
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
					<div
						style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;"
					>
						No active chats yet.<br />Click "Chat / Inquire" on any
						job post to contact clients.
					</div>
				{:else}
					{#each conversations as conv (conv.id)}
						<button
							type="button"
							class="chat-thread-item {activeConversation?.id ===
							conv.id
								? 'active'
								: ''}"
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
									<span class="chat-role-badge">Client</span>
								</div>
								<div class="chat-thread-title">
									<Pin size={11} style="flex-shrink: 0;" /> <span class="chat-thread-title-text">{conv.job_title}</span>
								</div>
								<div class="chat-thread-preview" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
									<span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
										{conv.last_message || "No messages yet."}
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
								activeConvId = "";
								showGpsDropup = false;
							}}
						>
							<ArrowLeft size={16} />
						</button>
						<div>
							<h4
								style="margin: 0; font-size: 1.05rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;"
							>
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
							<span
								style="font-size: 0.78rem; color: var(--accent-hover); display: block;"
							>
								Job: {activeConversation.job_title}
							</span>
						</div>
					</div>
				</div>

				<div class="chat-messages-body" id="chat-messages-worker-body" onscroll={handleChatScroll}>
					{#if loadingMessagesConvId === activeConversation.id && (!activeConversation.messages || activeConversation.messages.length === 0)}
						<div style="display: flex; align-items: center; justify-content: center; height: 100%; min-height: 180px; margin: auto;">
							<div class="spinner spinner-accent"></div>
						</div>
					{:else if !activeConversation.messages || activeConversation.messages.length === 0}
						<div
							style="text-align: center; color: var(--text-muted); margin: auto; font-size: 0.9rem;"
						>
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
							<div
								class="chat-bubble {msg.sender_id ===
								data.user?.id
									? 'sent'
									: 'received'}"
							>
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
									{new Date(
										msg.created_at,
									).toLocaleTimeString("en-PH", {
										hour: "2-digit",
										minute: "2-digit",
									})}
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
					<form
						onsubmit={handleSendMessage}
						style="display: flex; gap: 0.5rem; align-items: center; width: 100%;"
					>
						<input
							type="hidden"
							name="jobId"
							value={activeConversation.job_id}
						/>
						<input
							type="hidden"
							name="receiverId"
							value={activeConversation.other_user_id}
						/>

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
							title="Search & pin any custom location or landmark"
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
						<button
							type="submit"
							class="btn btn-primary chat-send-btn"
							style="display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;"
							disabled={sendingMessage ||
								!newMessageContent.trim()}
						>
							{#if sendingMessage}
								<span class="spinner spinner-sm"></span>
							{/if}
							Send
						</button>
					</form>
				</div>
			{:else}
				<div
					style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); flex-direction: column; gap: 0.75rem; padding: 2rem;"
				>
					<MessageSquare size={48} style="opacity: 0.6;" />
					<p style="font-size: 0.95rem;">
						Select an inquiry on the left to start messaging.
					</p>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- TAB 3: MY PROFILE -->
<!-- TAB 3: MY PROFILE -->
{#if activeTab === "profile"}
	<div class="profile-container">
		<!-- Cover Banner & Header Card -->
		<div class="profile-header-card">
			<div class="profile-cover-banner"></div>
			<div class="profile-header-content">
				<div class="profile-header-row">
					<!-- Left Side: Avatar + Name + Role Badge -->
					<div class="profile-user-left">
						<div class="profile-avatar-wrapper">
							{data.user?.name
								? data.user.name.charAt(0).toUpperCase()
								: "W"}
						</div>
						<div class="profile-user-text">
							<h2
								style="font-size: 1.6rem; margin-bottom: 0.25rem;"
							>
								{data.user?.name}
							</h2>
							<span
								class="badge badge-general"
								style="font-size: 0.75rem;">Worker Account</span
							>
						</div>
					</div>

					<!-- Right Side: Stat Numbers (Tasks Completed & Star Rating) -->
					<div class="profile-stats-group">
						<div class="profile-stat-item">
							<span
								class="profile-stat-value"
								style="color: var(--success);"
								>{data.stats?.completed_jobs_count || 0}</span
							>
							<span class="profile-stat-label"
								>Tasks Completed</span
							>
						</div>
						<div class="profile-stat-item">
							<span
								class="rating-badge {data.stats
									?.average_rating > 0
									? 'rating-badge-positive'
									: data.stats?.average_rating < 0
										? 'rating-badge-negative'
										: 'rating-badge-zero'}"
								style="font-size: 1.1rem; padding: 0.3rem 0.8rem; display: inline-flex; align-items: center; gap: 0.25rem;"
							>
								<Star size={14} fill="currentColor" /> {data.stats?.average_rating > 0
									? `+${data.stats.average_rating}`
									: data.stats?.average_rating || "0"}
							</span>
							<span
								class="profile-stat-label"
								style="margin-top: 0.3rem;">Total Rating</span
							>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Main 2-Column Grid -->
		<div class="profile-main-grid">
			<!-- Left Column: Introduction / Details -->
			<aside class="card" style="padding: 1.5rem;">
				<h4
					style="font-size: 1.25rem; margin-bottom: 1.25rem; color: var(--text-primary);"
				>
					Introduction
				</h4>
				<div
					style="display: flex; flex-direction: column; gap: 1rem; font-size: 0.9rem;"
				>
					<div>
						<span
							style="color: var(--text-muted); font-size: 0.8rem; display: block; text-transform: uppercase;"
							>Email Address</span
						>
						<strong style="color: var(--text-primary);"
							>{data.user?.email}</strong
						>
					</div>
					<div>
						<span
							style="color: var(--text-muted); font-size: 0.8rem; display: block; text-transform: uppercase;"
							>Phone Number</span
						>
						<strong style="color: var(--text-primary);"
							>{data.user?.phone}</strong
						>
					</div>
					<div>
						<span
							style="color: var(--text-muted); font-size: 0.8rem; display: block; text-transform: uppercase;"
							>Address / City</span
						>
						<strong style="color: var(--text-primary);"
							>{data.user?.address}</strong
						>
					</div>
				</div>
			</aside>

			<!-- Right Column: Service History & Feedback Sub-tabs -->
			<section
				style="display: flex; flex-direction: column; gap: 1.25rem; min-width: 0; width: 100%;"
			>
				<!-- Sub-tabs header nav matching main tabs design -->
				<div class="tabs-header" style="margin-bottom: 0.5rem;">
					<button
						type="button"
						class="tab-btn {profileSubTab === 'history' ? 'active' : ''}"
						onclick={() => (profileSubTab = "history")}
						id="subtab-history-btn"
						style="display: inline-flex; align-items: center; gap: 0.4rem;"
					>
						<ClipboardList size={16} /> Service History ({data.completedJobs?.length || 0})
					</button>
					<button
						type="button"
						class="tab-btn {profileSubTab === 'reviews' ? 'active' : ''}"
						onclick={() => (profileSubTab = "reviews")}
						id="subtab-reviews-btn"
						style="display: inline-flex; align-items: center; gap: 0.4rem;"
					>
						<Star size={16} fill="currentColor" /> Reviews & Feedback ({data
							.stats?.reviews?.length || 0})
					</button>
				</div>

				{#if profileSubTab === "history"}
					<!-- TAB 1: SERVICE HISTORY -->
					{#if !data.completedJobs || data.completedJobs.length === 0}
						<div
							class="card"
							style="text-align: center; padding: 3.5rem 2rem; border-style: dashed;"
						>
							<h4
								style="font-size: 1.15rem; margin-bottom: 0.5rem;"
							>
								No service history yet.
							</h4>
							<p
								style="color: var(--text-secondary); font-size: 0.9rem;"
							>
								Completed jobs and work history will appear here
								once you finish assigned services.
							</p>
						</div>
					{:else}
						<div
							style="display: flex; flex-direction: column; gap: 1rem; min-width: 0; width: 100%;"
						>
							{#each data.completedJobs as job (job.id)}
								<div
									class="card"
									style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; min-width: 0; max-width: 100%; box-sizing: border-box; overflow: hidden;"
								>
									<div
										style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; flex-wrap: wrap; min-width: 0; width: 100%;"
									>
										<div style="min-width: 0; flex: 1 1 auto;">
											<div
												style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;"
											>
												<span
													class="badge {getCategoryBadge(
														job.category,
													)}">{job.category}</span
												>
												<span
													class="badge"
													style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 0.25rem;"
												>
													<Check size={14} /> Completed
												</span>
											</div>
											<h4
												style="font-size: 1.15rem; color: var(--text-primary); margin: 0; overflow-wrap: break-word; word-break: break-word;"
											>
												{job.title}
											</h4>
											<span
												style="font-size: 0.85rem; color: var(--text-secondary); overflow-wrap: break-word;"
												>Client: <strong
													>{job.customerName}</strong
												></span
											>
										</div>
										<strong
											style="color: var(--success); font-size: 1.15rem; flex-shrink: 0; white-space: nowrap;"
											>₱{job.budget.toLocaleString()}</strong
										>
									</div>
									<p
										style="font-size: 0.9rem; color: var(--text-secondary); margin: 0; overflow-wrap: break-word; word-break: break-word;"
									>
										{job.description}
									</p>
									<div
										style="font-size: 0.8rem; color: var(--text-muted); display: flex; justify-content: space-between; border-top: 1px dashed var(--border-color); padding-top: 0.5rem; flex-wrap: wrap; gap: 0.5rem; min-width: 0; width: 100%;"
									>
										<span style="min-width: 0; overflow-wrap: break-word; word-break: break-word;"
											><strong>Location:</strong>
											{job.location}</span
										>
										<span style="min-width: 0; overflow-wrap: break-word; word-break: break-word;"
											><strong>Date Completed:</strong>
											{new Date(
												job.target_date ||
													job.created_at,
											).toLocaleDateString("en-PH", {
												month: "short",
												day: "numeric",
												year: "numeric",
											})}</span
										>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				{:else if profileSubTab === "reviews"}
					<!-- TAB 2: CUSTOMER COMMENTS, FEEDBACK & REVIEW RATINGS -->
					{#if (data.stats?.reviews?.length || 0) === 0}
						<div
							class="card"
							style="text-align: center; padding: 3.5rem 2rem; border-style: dashed;"
						>
							<h4
								style="font-size: 1.15rem; margin-bottom: 0.5rem;"
							>
								No reviews received yet.
							</h4>
							<p
								style="color: var(--text-secondary); font-size: 0.9rem;"
							>
								Once clients review and rate your completed
								work, their feedback, comments, and ratings will
								be displayed here.
							</p>
						</div>
					{:else}
						<div
							style="display: flex; flex-direction: column; gap: 1rem; min-width: 0; width: 100%;"
						>
							{#each data.stats.reviews as review (review.id)}
								<div
									class="card"
									style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; max-width: 100%; box-sizing: border-box; overflow: hidden;"
								>
									<div
										style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; min-width: 0; width: 100%;"
									>
										<div style="min-width: 0;">
											<strong
												style="color: var(--text-primary); overflow-wrap: break-word;"
												>{review.customer_name}</strong
											>
											<span
												style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;"
											>
												{new Date(
													review.created_at,
												).toLocaleDateString("en-PH", {
													month: "short",
													day: "numeric",
													year: "numeric",
												})}
											</span>
										</div>
										<div style="flex-shrink: 0;">
											<span
												class="rating-badge {review.rating >
												0
													? 'rating-badge-positive'
													: review.rating < 0
														? 'rating-badge-negative'
														: 'rating-badge-zero'}"
												style="display: inline-flex; align-items: center; gap: 0.25rem;"
											>
												<Star size={12} fill="currentColor" /> {review.rating > 0
													? `+${review.rating}`
													: review.rating} Star{Math.abs(
													review.rating,
												) === 1
													? ""
													: "s"}
											</span>
										</div>
									</div>
									<p
										style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; font-style: italic; margin: 0; overflow-wrap: break-word; word-break: break-word;"
									>
										"{review.review_text}"
									</p>
								</div>
							{/each}
						</div>
					{/if}
				{/if}
			</section>
		</div>
	</div>
{/if}

<!-- VIEW PROFILE MODAL FOR OTHER USERS -->
<ViewProfileModal
	bind:show={showViewProfileModal}
	userId={viewProfileUserId}
	currentUserId={data.user?.id}
	onopenchat={(targetUserId) => {
		const matchConv = conversations?.find((c) => c.other_user_id === targetUserId);
		if (matchConv) {
			selectConversation(matchConv.id);
			activeTab = "chat";
		}
	}}
/>

<!-- CUSTOM LOCATION PINNING MODAL FOR CHAT -->
<LocationPickerModal 
	bind:show={showCustomLocationModal}
	title="Share Custom Pin / Landmark Location"
	onSave={handleCustomChatLocationSaved}
/>
