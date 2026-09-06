<script>
	import { onMount } from 'svelte';
	import ViewProfileModal from '$lib/ViewProfileModal.svelte';
	import LocationPickerModal from '$lib/LocationPickerModal.svelte';
	import ConfirmDeleteModal from '$lib/ConfirmDeleteModal.svelte';
	import MobileChatHistory from '$lib/MobileChatHistory.svelte';
	import { setupRealtimeChat, playNotificationSound } from '$lib/realtimeChat.js';
	import { getCurrentCoordinates, formatGpsChatMessage, formatImageChatMessage, compressImageFile, formatMessagePreview } from '$lib/gpsUtils.js';

	import WorkerTabsNav from '$lib/worker/WorkerTabsNav.svelte';
	import WorkerFeedTab from '$lib/worker/WorkerFeedTab.svelte';
	import WorkerActiveJobsTab from '$lib/worker/WorkerActiveJobsTab.svelte';
	import WorkerChatTab from '$lib/worker/WorkerChatTab.svelte';
	import WorkerProfileTab from '$lib/worker/WorkerProfileTab.svelte';
	import WorkerImagePreviewModal from '$lib/worker/WorkerImagePreviewModal.svelte';

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

	function closeActiveConversation() {
		if (typeof window !== 'undefined' && history.state?.chatOpen) {
			history.back();
		} else {
			activeConvId = '';
			showGpsDropup = false;
		}
	}

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
		activeTab = 'chat';
		unreadConvIds.delete(convId);
		unreadConvIds = new Set(unreadConvIds);
		loadConversationMessages(convId);
		scrollToBottom(false);
	}

	$effect(() => {
		if (activeTab === 'chat' && activeConversation && !activeConversation.messagesLoaded && loadingMessagesConvId !== activeConversation.id) {
			loadConversationMessages(activeConversation.id);
		}
	});

	let fileInputRef = $state(null);
	let uploadingImage = $state(false);
	let previewImageModalUrl = $state(null);

	function triggerImageUpload() {
		if (fileInputRef) {
			fileInputRef.click();
		}
	}

	async function handleImageFileSelect(e) {
		const file = e.target.files?.[0];
		if (!file) return;

		e.target.value = '';

		if (!file.type.startsWith('image/')) {
			alert('Please select a valid image file (JPG, PNG, WebP, etc.).');
			return;
		}

		uploadingImage = true;
		try {
			const compressedDataUrl = await compressImageFile(file);
			const imageMsgPayload = formatImageChatMessage(compressedDataUrl);
			await sendChatMessagePayload(imageMsgPayload);
		} catch (err) {
			console.error('Failed to process image:', err);
			alert('Could not process selected image. Please try again.');
		} finally {
			uploadingImage = false;
		}
	}

	function handleIncomingMessage(msg) {
		if (!msg || !msg.job_id || !msg.sender_id || !msg.receiver_id || !conversations) return;
		const otherUserId = msg.sender_id === data.user?.id ? msg.receiver_id : msg.sender_id;
		const convKey = `${msg.job_id}_${otherUserId}`;

		let matchedConv = conversations.find(c => c.id === convKey);

		if (matchedConv) {
			conversations = conversations.map(c => {
				if (c.id === matchedConv.id) {
					const existingMsgs = c.messages || [];
					let updatedMsgs = existingMsgs;

					const isAlreadyPresent = existingMsgs.some(m => m.id === msg.id);
					if (!isAlreadyPresent) {
						const optimisticIdx = existingMsgs.findIndex(m => m.id && String(m.id).startsWith('temp_') && m.sender_id === msg.sender_id && m.content === msg.content);
						if (optimisticIdx !== -1) {
							updatedMsgs = [...existingMsgs];
							updatedMsgs[optimisticIdx] = msg;
						} else {
							updatedMsgs = [...(c.messages || []), msg];
						}
					}

					return {
						...c,
						last_message: formatMessagePreview(msg.content),
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

	function handleIncomingMessageDelete(messageId) {
		if (!messageId || !conversations) return;
		conversations = conversations.map(c => {
			const updatedMsgs = (c.messages || []).filter(m => m.id !== messageId);
			const lastMsg = updatedMsgs[updatedMsgs.length - 1];
			return {
				...c,
				last_message: formatMessagePreview(lastMsg?.content),
				messages: updatedMsgs
			};
		});
	}

	let showDeleteConfirmModal = $state(false);
	let pendingDeleteMsgId = $state('');
	let deletingMessage = $state(false);

	function promptDeleteMessage(messageId) {
		if (!messageId) return;
		pendingDeleteMsgId = messageId;
		showDeleteConfirmModal = true;
	}

	async function confirmDeleteMessage() {
		if (!pendingDeleteMsgId) return;
		deletingMessage = true;
		try {
			await handleDeleteMessage(pendingDeleteMsgId);
		} finally {
			deletingMessage = false;
			pendingDeleteMsgId = '';
			showDeleteConfirmModal = false;
		}
	}

	async function handleDeleteMessage(messageId) {
		if (!messageId || !activeConversation) return;

		handleIncomingMessageDelete(messageId);

		if (realtimeControls) {
			realtimeControls.sendBroadcastDelete(messageId);
		}

		try {
			await fetch('/api/messages/delete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messageId })
			});
		} catch (err) {
			console.error('Failed to delete message:', err);
		}
	}

	$effect(() => {
		if (!data.user?.id) return;

		const rt = setupRealtimeChat({
			currentUserId: data.user.id,
			onMessage: (msg) => {
				handleIncomingMessage(msg);
			},
			onDelete: (messageId) => {
				handleIncomingMessageDelete(messageId);
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
				const previewText = formatMessagePreview(trimmed);
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
	let maxBudget = $state(null);

	let hasActiveFilters = $derived(
		!!searchCategory || 
		(searchLocation !== "" && searchLocation !== (data.user?.address || "")) || 
		minBudget != null ||
		maxBudget != null
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
			const matchesMinBudget = minBudget == null || job.budget >= Number(minBudget);
			const matchesMaxBudget = maxBudget == null || job.budget <= Number(maxBudget);
			return matchesSearch && matchesCategory && matchesLocation && matchesMinBudget && matchesMaxBudget;
		})
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

<WorkerTabsNav 
	bind:activeTab 
	myJobsCount={data.myJobs.length} 
	conversationsCount={conversations?.length || 0} 
	unreadCount={unreadConvIds.size} 
	onselectchat={() => {
		if (activeConversation) {
			unreadConvIds.delete(activeConversation.id);
			unreadConvIds = new Set(unreadConvIds);
		}
		scrollToBottom(false);
	}} 
/>

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

{#if activeTab === "feed"}
	<WorkerFeedTab 
		{filteredJobs} 
		{visibleFeedJobs} 
		bind:visibleFeedJobsLimit 
		bind:searchCategory 
		bind:searchLocation 
		bind:minBudget 
		bind:maxBudget 
		bind:searchQuery 
		bind:showMobileFilters 
		{hasActiveFilters} 
		bind:applyingJobId 
		onopenviewprofile={openViewProfile} 
		onopenchat={openChat} 
		onloadmorefeedjobs={loadMoreFeedJobs} 
	/>
{:else if activeTab === "my-jobs"}
	<WorkerActiveJobsTab 
		{sortedMyJobs} 
		{visibleMyJobs} 
		bind:visibleMyJobsLimit 
		onopenviewprofile={openViewProfile} 
		onopenchat={openChat} 
		onloadmoremyjobs={loadMoreMyJobs} 
		onmyjobsscroll={handleMyJobsScroll} 
	/>
{:else if activeTab === "chat"}
	<WorkerChatTab 
		{conversations} 
		{activeConversation} 
		bind:activeConvId 
		{unreadConvIds} 
		{loadingMessagesConvId} 
		{loadingMoreMessages} 
		{isOtherUserTyping} 
		bind:newMessageContent 
		{sendingMessage} 
		{sharingLocation} 
		{uploadingImage} 
		bind:showGpsDropup 
		currentUserId={data.user?.id} 
		bind:fileInputRef 
		onselectconversation={selectConversation} 
		oncloseactiveconversation={closeActiveConversation} 
		onchatscroll={handleChatScroll} 
		onloadmoremessages={loadMoreMessages} 
		onopenviewprofile={openViewProfile} 
		onpromptdeletemessage={promptDeleteMessage} 
		ontriggerimageupload={triggerImageUpload} 
		onimagefileselect={handleImageFileSelect} 
		onsharelocation={handleShareLocation} 
		onopencustomlocationmodal={() => showCustomLocationModal = true} 
		onhandletypinginput={handleTypingInput} 
		onsendmessage={handleSendMessage} 
		onpreviewimage={(url) => previewImageModalUrl = url} 
	/>
{:else if activeTab === "profile"}
	<WorkerProfileTab 
		user={data.user} 
		stats={data.stats} 
		completedJobs={data.completedJobs} 
		bind:profileSubTab 
	/>
{/if}

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

<LocationPickerModal 
	bind:show={showCustomLocationModal}
	title="Share Custom Pin / Landmark Location"
	onSave={handleCustomChatLocationSaved}
/>

<MobileChatHistory bind:activeConvId bind:showGpsDropup {activeTab} />

<WorkerImagePreviewModal bind:previewImageModalUrl />

<ConfirmDeleteModal 
	bind:show={showDeleteConfirmModal} 
	loading={deletingMessage} 
	onConfirm={confirmDeleteMessage} 
/>
