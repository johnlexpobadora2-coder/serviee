<script>
	import { onMount } from 'svelte';
	import ViewProfileModal from '$lib/ViewProfileModal.svelte';
	import LocationPickerModal from '$lib/LocationPickerModal.svelte';
	import ConfirmDeleteModal from '$lib/ConfirmDeleteModal.svelte';
	import MobileChatHistory from '$lib/MobileChatHistory.svelte';
	import { setupRealtimeChat, playNotificationSound } from '$lib/realtimeChat.js';
	import { CITIES_MUNICIPALITIES } from '$lib/locations.js';
	import { getCurrentCoordinates, formatGpsChatMessage, formatImageChatMessage, compressImageFile, formatMessagePreview } from '$lib/gpsUtils.js';

	import CustomerTabsNav from '$lib/customer/CustomerTabsNav.svelte';
	import CustomerFeedTab from '$lib/customer/CustomerFeedTab.svelte';
	import CustomerActiveJobsTab from '$lib/customer/CustomerActiveJobsTab.svelte';
	import CustomerChatTab from '$lib/customer/CustomerChatTab.svelte';
	import CustomerProfileTab from '$lib/customer/CustomerProfileTab.svelte';
	import CustomerRatingModal from '$lib/customer/CustomerRatingModal.svelte';
	import CustomerDeleteJobModal from '$lib/customer/CustomerDeleteJobModal.svelte';
	import CustomerEditJobModal from '$lib/customer/CustomerEditJobModal.svelte';
	import CustomerImagePreviewModal from '$lib/customer/CustomerImagePreviewModal.svelte';

	let { data, form } = $props();

	let activeTab = $state('feed'); // 'feed' | 'my-jobs' | 'chat' | 'profile'
	let historySubTab = $state('posted'); // 'posted' | 'completed'
	let activeConvId = $state('');
	let newMessageContent = $state('');
	let sendingMessage = $state(false);
	// svelte-ignore state_referenced_locally
	let conversations = $state(data.conversations || []);

	// Restore chat tab & active conversation on page refresh
	onMount(() => {
		try {
			const savedTab = sessionStorage.getItem('serviee_customer_tab');
			if (savedTab === 'chat') {
				activeTab = 'chat';
				const savedConvId = sessionStorage.getItem('serviee_customer_conv');
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
				sessionStorage.setItem('serviee_customer_tab', 'chat');
				if (activeConvId) {
					sessionStorage.setItem('serviee_customer_conv', activeConvId);
				} else {
					sessionStorage.removeItem('serviee_customer_conv');
				}
			} else {
				sessionStorage.removeItem('serviee_customer_tab');
				sessionStorage.removeItem('serviee_customer_conv');
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
			const gpsMsgContent = formatGpsChatMessage(lat, lng, `Location shared by ${data.user.name || 'Client'}`);

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
	let searchQuery = $state('');
	let searchCategory = $state('');
	// svelte-ignore state_referenced_locally
	let searchLocation = $state(data.user?.address || '');
	/** @type {number | null} */
	let minBudget = $state(null);
	/** @type {number | null} */
	let maxBudget = $state(null);
	let sortBy = $state('newest');

	let hasActiveFilters = $derived(
		!!searchCategory || 
		!!searchLocation || 
		minBudget != null ||
		maxBudget != null ||
		!!searchQuery ||
		sortBy !== 'newest'
	);

	let filteredJobs = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		const list = (data.allJobs || []).filter(job => {
			const isNotCompleted = job.status !== 'completed';
			const matchesSearch = !q || 
				(job.title && job.title.toLowerCase().includes(q)) || 
				(job.description && job.description.toLowerCase().includes(q));
			const matchesCategory = !searchCategory || job.category === searchCategory;
			const matchesLocation = !searchLocation || (job.location && job.location.toLowerCase().includes(searchLocation.toLowerCase()));
			const matchesMinBudget = minBudget == null || job.budget >= Number(minBudget);
			const matchesMaxBudget = maxBudget == null || job.budget <= Number(maxBudget);
			return isNotCompleted && matchesSearch && matchesCategory && matchesLocation && matchesMinBudget && matchesMaxBudget;
		});

		return [...list].sort((a, b) => {
			if (sortBy === 'highest_cost') {
				return (Number(b.budget) || 0) - (Number(a.budget) || 0);
			} else if (sortBy === 'lowest_cost') {
				return (Number(a.budget) || 0) - (Number(b.budget) || 0);
			} else if (sortBy === 'nearest_date') {
				const timeA = new Date(a.target_date || a.created_at).getTime() || 0;
				const timeB = new Date(b.target_date || b.created_at).getTime() || 0;
				return timeA - timeB;
			} else {
				// 'newest' (default)
				const timeA = new Date(a.created_at).getTime() || 0;
				const timeB = new Date(b.created_at).getTime() || 0;
				return timeB - timeA;
			}
		});
	});

	let activeJobs = $derived(data.posts.filter(job => job.status !== 'completed'));
	let completedJobs = $derived(data.posts.filter(job => job.status === 'completed'));

	// Modal State
	let showRatingModal = $state(false);
	/** @type {any} */
	let activeJobForRating = $state(null);
	let ratingValue = $state(5);
	let reviewText = $state('');

	let postingJob = $state(false);
	let changingStatus = $state(false);

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

	let editJobModal = $state({
		open: false,
		id: null,
		title: '',
		category: '',
		description: '',
		location: '',
		budget: 0,
		target_date: '',
		latitude: null,
		longitude: null,
		saving: false
	});

	let showEditJobLocationModal = $state(false);

	function openEditJobModal(job) {
		const formattedDate = job.target_date ? new Date(job.target_date).toISOString().slice(0, 16) : '';
		editJobModal = {
			open: true,
			id: job.id,
			title: job.title || '',
			category: job.category || 'Plumbing / Tubero',
			description: job.description || '',
			location: job.location || '',
			budget: job.budget || 0,
			target_date: formattedDate,
			latitude: job.latitude || null,
			longitude: job.longitude || null,
			saving: false
		};
	}

	function closeEditJobModal() {
		editJobModal = {
			open: false,
			id: null,
			title: '',
			category: '',
			description: '',
			location: '',
			budget: 0,
			target_date: '',
			latitude: null,
			longitude: null,
			saving: false
		};
	}

	function handleEditJobLocationSaved(loc) {
		editJobModal.latitude = loc.latitude;
		editJobModal.longitude = loc.longitude;
		if (loc.city) {
			editJobModal.location = loc.city;
		} else if (loc.address) {
			const match = CITIES_MUNICIPALITIES.find(c => 
				loc.address.toLowerCase().includes(c.toLowerCase()) || 
				loc.address.toLowerCase().includes(c.toLowerCase().replace(' city', ''))
			);
			if (match) {
				editJobModal.location = match;
			} else {
				editJobModal.location = loc.address;
			}
		}
	}

	function openRatingModal(job) {
		activeJobForRating = job;
		ratingValue = 5;
		reviewText = '';
		showRatingModal = true;
	}
</script>

<svelte:head>
	<title>Customer Dashboard | Serviee</title>
</svelte:head>

<CustomerTabsNav 
	bind:activeTab 
	activeJobsCount={activeJobs.length} 
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

{#if activeTab === 'feed'}
	<CustomerFeedTab 
		{filteredJobs} 
		bind:searchCategory 
		bind:searchLocation 
		bind:minBudget 
		bind:maxBudget 
		bind:searchQuery 
		bind:sortBy
		bind:showMobileFilters 
		{hasActiveFilters} 
		currentUserId={data.user?.id} 
		onopenviewprofile={openViewProfile} 
		onopendeletejob={openDeleteJobModal} 
	/>
{:else if activeTab === 'my-jobs'}
	<CustomerActiveJobsTab 
		{activeJobs} 
		bind:changingStatus 
		onopeneditjob={openEditJobModal} 
		onopendeletejob={openDeleteJobModal} 
		onopenviewprofile={openViewProfile} 
		onopenchat={openChat} 
		onopenratingmodal={openRatingModal} 
	/>
{:else if activeTab === 'chat'}
	<CustomerChatTab 
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
{:else if activeTab === 'profile'}
	<CustomerProfileTab 
		user={data.user} 
		posts={data.posts} 
		{completedJobs} 
		bind:historySubTab 
		onopendeletejob={openDeleteJobModal} 
	/>
{/if}

<CustomerRatingModal 
	bind:showRatingModal 
	{activeJobForRating} 
	bind:ratingValue 
	bind:reviewText 
	bind:changingStatus 
	{form} 
/>

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

<LocationPickerModal 
	bind:show={showCustomLocationModal}
	title="Share Custom Pin / Friend's Location"
	onSave={handleCustomChatLocationSaved}
/>

<CustomerDeleteJobModal 
	bind:deleteJobModal 
	onclose={closeDeleteJobModal} 
/>

<CustomerEditJobModal 
	bind:editJobModal 
	bind:showEditJobLocationModal 
	onclose={closeEditJobModal} 
/>

<LocationPickerModal 
	bind:show={showEditJobLocationModal}
	title="Update Pinned Job Location"
	initialLat={editJobModal.latitude}
	initialLng={editJobModal.longitude}
	onSave={handleEditJobLocationSaved}
/>

<MobileChatHistory bind:activeConvId bind:showGpsDropup {activeTab} />

<CustomerImagePreviewModal bind:previewImageModalUrl />

<ConfirmDeleteModal 
	bind:show={showDeleteConfirmModal} 
	loading={deletingMessage} 
	onConfirm={confirmDeleteMessage} 
/>
