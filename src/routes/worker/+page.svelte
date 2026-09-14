<script>
	import { onMount, untrack } from 'svelte';
	import ViewProfileModal from '$lib/ViewProfileModal.svelte';
	import LocationPickerModal from '$lib/LocationPickerModal.svelte';
	import ConfirmDeleteModal from '$lib/ConfirmDeleteModal.svelte';
	import MobileChatHistory from '$lib/MobileChatHistory.svelte';
	import { setupRealtimeChat, playNotificationSound } from '$lib/realtimeChat.js';
	import { getCurrentCoordinates, formatGpsChatMessage, formatImageChatMessage, compressImageFile, formatMessagePreview } from '$lib/gpsUtils.js';

	import WorkerTabsNav from '$lib/worker/WorkerTabsNav.svelte';
	import WorkerFeedTab from '$lib/worker/WorkerFeedTab.svelte';
	import WorkerActiveJobsTab from '$lib/worker/WorkerActiveJobsTab.svelte';
	import ChatTab from '$lib/ChatTab.svelte';
	import WorkerProfileTab from '$lib/worker/WorkerProfileTab.svelte';
	import ImagePreviewModal from '$lib/ImagePreviewModal.svelte';
	import { getSmartCache, setSmartCache, removeSmartCache } from '$lib/smartCache.js';
	import { savedJobs } from '$lib/savedJobs.svelte.js';
	import { toast } from '$lib/toast.svelte.js';

	let { data, form } = $props();

	let activeTab = $state("feed"); // 'feed' | 'my-jobs' | 'chat' | 'profile'
	let profileSubTab = $state("history"); // 'history' | 'reviews'

	// --- FEED TAB LAZY & PAGINATED STATE ---
	// svelte-ignore state_referenced_locally
	let feedJobs = $state(data.initialFeedJobs || []);
	// svelte-ignore state_referenced_locally
	let feedTotalCount = $state(data.initialFeedTotalCount || 0);
	// svelte-ignore state_referenced_locally
	let feedHasMore = $state(data.initialFeedHasMore ?? false);
	let feedLoading = $state(false);
	let feedLoadingMore = $state(false);
	// svelte-ignore state_referenced_locally
	let availableLocations = $state(data.availableLocations || []);

	let showMobileFilters = $state(false);
	let searchQuery = $state("");
	let searchCategory = $state("");
	// svelte-ignore state_referenced_locally
	let searchLocation = $state(data.user?.address || "");
	/** @type {number | null} */
	let minBudget = $state(null);
	/** @type {number | null} */
	let maxBudget = $state(null);
	let sortBy = $state("newest");
	let applyingJobId = $state(null);

	let hasActiveFilters = $derived(
		!!searchCategory || 
		!!searchLocation || 
		minBudget != null ||
		maxBudget != null ||
		!!searchQuery ||
		sortBy !== 'newest'
	);

	async function fetchFeedJobs(offset = 0, append = false) {
		if (append) {
			if (feedLoadingMore || !feedHasMore) return;
			feedLoadingMore = true;
		} else {
			feedLoading = true;
		}

		try {
			const params = new URLSearchParams({
				limit: '10',
				offset: String(offset),
				category: searchCategory || '',
				location: searchLocation || '',
				sortBy: sortBy || 'newest',
				search: searchQuery.trim()
			});
			if (minBudget != null) {
				params.append('minBudget', String(minBudget));
			}
			if (maxBudget != null) {
				params.append('maxBudget', String(maxBudget));
			}

			const res = await fetch(`/api/jobs/feed?${params.toString()}`);
			if (res.ok) {
				const result = await res.json();
				if (result.jobs) {
					if (append) {
						feedJobs = [...feedJobs, ...result.jobs];
					} else {
						feedJobs = result.jobs;
						if (!hasActiveFilters && offset === 0) {
							setSmartCache(`${data.user?.id}_worker_feed_default`, {
								jobs: result.jobs,
								totalCount: result.totalCount,
								hasMore: result.hasMore,
								availableLocations: result.availableLocations || availableLocations
							});
						}
					}
					feedTotalCount = result.totalCount;
					feedHasMore = result.hasMore;
					if (result.availableLocations && result.availableLocations.length > 0) {
						availableLocations = result.availableLocations;
					}
				}
			}
		} catch (err) {
			console.error('Failed to fetch feed jobs:', err);
		} finally {
			feedLoading = false;
			feedLoadingMore = false;
		}
	}

	let prevFilterKey = null;
	let feedDebounceTimer = null;

	// Trigger debounced feed search/filter when filter criteria changes
	$effect(() => {
		const currentKey = `${searchCategory}::${searchLocation}::${minBudget}::${maxBudget}::${searchQuery.trim()}::${sortBy}`;

		if (prevFilterKey === null) {
			prevFilterKey = currentKey;
			return;
		}

		if (currentKey === prevFilterKey) return;
		prevFilterKey = currentKey;

		if (feedDebounceTimer) clearTimeout(feedDebounceTimer);
		feedDebounceTimer = setTimeout(() => {
			untrack(() => {
				fetchFeedJobs(0, false);
			});
		}, 300);
	});

	// --- ACTIVE JOBS TAB LAZY & PAGINATED STATE ---
	let activeJobs = $state([]);
	let activeJobsTotalCount = $state(0);
	let activeJobsHasMore = $state(false);
	let activeJobsLoaded = $state(false);
	let activeJobsLoading = $state(false);
	let activeJobsLoadingMore = $state(false);

	async function fetchActiveJobs(offset = 0, append = false, silent = false) {
		if (append) {
			if (activeJobsLoadingMore || !activeJobsHasMore) return;
			activeJobsLoadingMore = true;
		} else if (!silent) {
			activeJobsLoading = true;
		}

		try {
			const res = await fetch(`/api/jobs/active?offset=${offset}&limit=10`);
			if (res.ok) {
				const result = await res.json();
				if (result.jobs) {
					if (append) {
						activeJobs = [...activeJobs, ...result.jobs];
					} else {
						activeJobs = result.jobs;
						if (offset === 0) {
							setSmartCache(`${data.user?.id}_worker_active_jobs`, {
								jobs: result.jobs,
								totalCount: result.totalCount,
								hasMore: result.hasMore
							});
						}
					}
					activeJobsTotalCount = result.totalCount;
					activeJobsHasMore = result.hasMore;
					activeJobsLoaded = true;
				}
			}
		} catch (err) {
			console.error('Failed to fetch active jobs:', err);
		} finally {
			activeJobsLoading = false;
			activeJobsLoadingMore = false;
		}
	}

	// --- CHAT TAB LAZY STATE ---
	let activeConvId = $state("");
	let newMessageContent = $state("");
	let sendingMessage = $state(false);
	let conversations = $state([]);
	let conversationsLoaded = $state(false);
	let conversationsLoading = $state(false);
	let tempConversation = $state(null);
	let displayedConversations = $derived(
		tempConversation ? [tempConversation, ...conversations.filter(c => c.id !== tempConversation.id)] : conversations
	);

	async function fetchConversations(silent = false) {
		if (conversationsLoading) return;
		if (!silent) conversationsLoading = true;
		try {
			const res = await fetch('/api/conversations');
			if (res.ok) {
				const result = await res.json();
				if (result.conversations) {
					const existingMap = new Map(conversations.map(c => [c.id, c]));
					conversations = result.conversations.map(newConv => {
						const existing = existingMap.get(newConv.id);
						if (existing && existing.messagesLoaded) {
							return {
								...newConv,
								messages: existing.messages || [],
								messagesLoaded: true,
								hasMore: existing.hasMore
							};
						}
						return newConv;
					});
					conversationsLoaded = true;
					setSmartCache(`${data.user?.id}_conversations`, conversations);
				}
			}
		} catch (err) {
			console.error('Failed to fetch conversations:', err);
		} finally {
			conversationsLoading = false;
		}
	}

	// --- PROFILE TAB LAZY STATE ---
	let profileStats = $state(null);
	let profileCompletedJobs = $state([]);
	let profileLoaded = $state(false);
	let profileLoading = $state(false);

	async function fetchProfileData(silent = false) {
		if (profileLoading) return;
		if (!silent) profileLoading = true;
		try {
			const res = await fetch('/api/user/profile-data');
			if (res.ok) {
				const result = await res.json();
				if (result.stats) {
					profileStats = result.stats;
					profileCompletedJobs = result.completedJobs || [];
					profileLoaded = true;
					setSmartCache(`${data.user?.id}_worker_profile`, {
						stats: result.stats,
						completedJobs: result.completedJobs || []
					});
				}
			}
		} catch (err) {
			console.error('Failed to fetch profile data:', err);
		} finally {
			profileLoading = false;
		}
	}

	// --- TAB LAZY LOADER EFFECT WITH SMART CACHE ---
	$effect(() => {
		const tab = activeTab;
		untrack(() => {
			if (tab === 'my-jobs') {
				if (!activeJobsLoaded && !activeJobsLoading) {
					const cached = getSmartCache(`${data.user?.id}_worker_active_jobs`, 5000);
					if (cached.exists && cached.data) {
						activeJobs = cached.data.jobs || [];
						activeJobsTotalCount = cached.data.totalCount || 0;
						activeJobsHasMore = cached.data.hasMore || false;
						activeJobsLoaded = true;
						if (cached.isStale) fetchActiveJobs(0, false, true);
					} else {
						fetchActiveJobs(0, false, false);
					}
				}
			} else if (tab === 'chat') {
				if (!conversationsLoaded && !conversationsLoading) {
					const cached = getSmartCache(`${data.user?.id}_conversations`, 5000);
					if (cached.exists && cached.data) {
						conversations = cached.data;
						conversationsLoaded = true;
						fetchConversations(true);
					} else {
						fetchConversations(false);
					}
				}
			} else if (tab === 'profile') {
				if (!profileLoaded && !profileLoading) {
					const cached = getSmartCache(`${data.user?.id}_worker_profile`);
					if (cached.exists && cached.data) {
						profileStats = cached.data.stats || null;
						profileCompletedJobs = cached.data.completedJobs || [];
						profileLoaded = true;
						if (cached.isStale) fetchProfileData(true);
					} else {
						fetchProfileData(false);
					}
				}
			}
		});
	});

	// Restore chat tab & active conversation on page refresh, and init saved jobs
	onMount(() => {
		try {
			savedJobs.init(data.user?.id, data.initialSavedJobs);
			const savedTab = sessionStorage.getItem('serviee_worker_tab');
			if (savedTab === 'chat') {
				activeTab = 'chat';
				const savedConvId = sessionStorage.getItem('serviee_worker_conv');
				if (savedConvId) {
					activeConvId = savedConvId;
				}
			}
		} catch (e) {
			console.error(e);
		}
	});

	// Sync chat tab & active conversation with sessionStorage
	$effect(() => {
		const tab = activeTab;
		const convId = activeConvId;
		untrack(() => {
			try {
				if (tab === 'chat') {
					sessionStorage.setItem('serviee_worker_tab', 'chat');
					if (convId) {
						sessionStorage.setItem('serviee_worker_conv', convId);
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
		if (!convId) return;
		const targetConv = conversations.find(c => c.id === convId) || (tempConversation?.id === convId ? tempConversation : null);
		if (!targetConv) return;
		if (targetConv.messagesLoaded && !force && (targetConv.messages || []).length > 0) return;

		loadingMessagesConvId = convId;
		try {
			const res = await fetch(`/api/messages?jobId=${encodeURIComponent(targetConv.job_id)}&otherUserId=${encodeURIComponent(targetConv.other_user_id)}&limit=10`);
			if (res.ok) {
				const result = await res.json();
				if (result.messages) {
					if (tempConversation && tempConversation.id === convId) {
						tempConversation = {
							...tempConversation,
							messages: result.messages,
							hasMore: result.hasMore,
							messagesLoaded: true
						};
					}
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
					setSmartCache(`${data.user?.id}_conversations`, conversations);
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
		const body = document.getElementById('chat-messages-worker-body');
		const prevScrollHeight = body ? body.scrollHeight : 0;
		const prevScrollTop = body ? body.scrollTop : 0;

		try {
			const res = await fetch(`/api/messages?jobId=${encodeURIComponent(targetJobId)}&otherUserId=${encodeURIComponent(targetOtherUserId)}&limit=10&before=${encodeURIComponent(beforeTimestamp)}`);
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
			const res = await fetch('/api/conversations');
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
								messagesLoaded: true,
								hasMore: existing.hasMore
							};
						}
						return newConv;
					});
				}
			}
		} catch (err) {
			console.error('Failed to refresh chat data:', err);
		}
	}

	let activeConversation = $derived(
		displayedConversations.find(c => c.id === activeConvId)
	);

	function selectConversation(convId) {
		activeConvId = convId;
		showGpsDropup = false;
		unreadConvIds.delete(convId);
		unreadConvIds = new Set(unreadConvIds);
		loadConversationMessages(convId);
		scrollToBottom(false);
	}

	function closeActiveConversation() {
		activeConvId = "";
		showGpsDropup = false;
	}

	function openChat(jobId, customerId, extraData = {}) {
		const convKey = `${jobId}_${customerId}`;
		let matchedConv = conversations.find(c => c.id === convKey);

		const targetJob = feedJobs.find(j => j.id === jobId) || activeJobs.find(j => j.id === jobId);
		const jobTitle = extraData.jobTitle || targetJob?.title || 'Sideline Job Inquiry';
		const customerName = extraData.customerName || targetJob?.customerName || 'Client';

		let initialMsgObj = extraData.sentMessage || null;
		if (!initialMsgObj && extraData.initialMessage) {
			initialMsgObj = {
				id: 'init_' + Date.now(),
				job_id: jobId,
				sender_id: data.user.id,
				receiver_id: customerId,
				content: extraData.initialMessage,
				created_at: new Date().toISOString()
			};
		}

		if (initialMsgObj && realtimeControls) {
			realtimeControls.sendBroadcastMessage(initialMsgObj);
		}

		if (!matchedConv) {
			tempConversation = {
				id: convKey,
				job_id: jobId,
				other_user_id: customerId,
				job_title: jobTitle,
				other_user_name: customerName,
				other_user_role: 'customer',
				last_message: initialMsgObj ? formatMessagePreview(initialMsgObj.content) : 'Inquired on post. Send a message...',
				last_message_at: initialMsgObj ? initialMsgObj.created_at : new Date().toISOString(),
				messages: initialMsgObj ? [initialMsgObj] : [],
				messagesLoaded: !!initialMsgObj,
				hasMore: false
			};
		} else {
			tempConversation = null;
			if (initialMsgObj) {
				const existingMsgs = matchedConv.messages || [];
				if (!existingMsgs.some(m => m.id === initialMsgObj.id || m.content === initialMsgObj.content)) {
					conversations = conversations.map(c => {
						if (c.id === convKey) {
							return {
								...c,
								last_message: formatMessagePreview(initialMsgObj.content),
								last_message_at: initialMsgObj.created_at,
								messages: [...(c.messages || []), initialMsgObj],
								messagesLoaded: true
							};
						}
						return c;
					});
					setSmartCache(`${data.user?.id}_conversations`, conversations);
				}
			}
		}

		activeConvId = convKey;
		activeTab = "chat";
		showGpsDropup = false;
		unreadConvIds.delete(convKey);
		unreadConvIds = new Set(unreadConvIds);
		fetchConversations(true);
		loadConversationMessages(convKey, true);
		scrollToBottom(false);
	}

	function openChatFromProfile(customerUserId, extraData = {}) {
		if (!customerUserId) return;
		showViewProfileModal = false;

		const matchingConv = conversations.find(c => c.other_user_id === customerUserId);

		if (matchingConv) {
			activeConvId = matchingConv.id;
			activeTab = "chat";
			showGpsDropup = false;
			unreadConvIds.delete(matchingConv.id);
			unreadConvIds = new Set(unreadConvIds);
			loadConversationMessages(matchingConv.id);
			scrollToBottom(false);
			return;
		}

		let targetJobId = extraData.jobId;
		if (!targetJobId && activeJobs && activeJobs.length > 0) {
			const jobWithCustomer = activeJobs.find(j => j.customer_id === customerUserId);
			if (jobWithCustomer) {
				targetJobId = jobWithCustomer.id;
			} else {
				targetJobId = activeJobs[0].id;
			}
		}

		if (!targetJobId) {
			targetJobId = 'profile_inquiry';
		}

		const tempConvId = `${targetJobId}_${customerUserId}`;
		tempConversation = {
			id: tempConvId,
			job_id: targetJobId,
			other_user_id: customerUserId,
			job_title: extraData.jobTitle || 'Direct Client Inquiry',
			other_user_name: extraData.userName || 'Client',
			other_user_role: 'customer',
			last_message: 'Inquired on profile. Send a message...',
			last_message_at: new Date().toISOString(),
			messages: [],
			messagesLoaded: true,
			hasMore: false
		};

		activeConvId = tempConvId;
		activeTab = "chat";
		showGpsDropup = false;
		unreadConvIds.delete(tempConvId);
		unreadConvIds = new Set(unreadConvIds);
		loadConversationMessages(tempConvId, true);
		scrollToBottom(false);
	}

	$effect(() => {
		if (activeTab === 'chat' && activeConversation && !activeConversation.messagesLoaded && loadingMessagesConvId !== activeConversation.id) {
			const targetId = activeConversation.id;
			untrack(() => {
				loadConversationMessages(targetId);
			});
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

			setSmartCache(`${data.user?.id}_conversations`, conversations);

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
		conversations = conversations.map(c => ({
			...c,
			messages: (c.messages || []).filter(m => m.id !== messageId)
		}));
		setSmartCache(`${data.user?.id}_conversations`, conversations);
	}

	let showDeleteConfirmModal = $state(false);
	let messageToDeleteId = $state(null);
	let deletingMessage = $state(false);

	let showDeleteConvConfirmModal = $state(false);
	let convToDelete = $state(null);
	let deletingConversation = $state(false);

	function promptDeleteMessage(msgId) {
		if (!msgId) return;
		messageToDeleteId = msgId;
		showDeleteConfirmModal = true;
	}

	async function confirmDeleteMessage() {
		if (!messageToDeleteId || !activeConversation) return;
		const msgId = messageToDeleteId;
		deletingMessage = true;

		try {
			handleIncomingMessageDelete(msgId);
			if (realtimeControls) {
				realtimeControls.sendBroadcastDelete(msgId);
			}
			showDeleteConfirmModal = false;
			messageToDeleteId = null;
			await fetch('/api/messages/delete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messageId: msgId })
			});
		} catch (err) {
			console.error('Failed to delete message:', err);
		} finally {
			deletingMessage = false;
		}
	}

	function promptDeleteConversation(conv) {
		if (!conv) return;
		convToDelete = conv;
		showDeleteConvConfirmModal = true;
	}

	async function confirmDeleteConversation() {
		if (!convToDelete) return;
		const targetConv = convToDelete;
		deletingConversation = true;

		try {
			const res = await fetch('/api/conversations/delete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jobId: targetConv.job_id,
					otherUserId: targetConv.other_user_id
				})
			});

			conversations = conversations.filter(c => c.id !== targetConv.id);
			setSmartCache(`${data.user?.id}_conversations`, conversations);
			if (activeConvId === targetConv.id || activeConversation?.id === targetConv.id) {
				closeActiveConversation();
			}
			showDeleteConvConfirmModal = false;
			convToDelete = null;
		} catch (err) {
			console.error('Failed to delete conversation:', err);
		} finally {
			deletingConversation = false;
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

		if (tempConversation && tempConversation.id === targetConv.id) {
			tempConversation = null;
		}
		const previewText = formatMessagePreview(trimmed);
		const updatedConv = {
			...targetConv,
			last_message: previewText,
			last_message_at: nowIso,
			messages: [...(targetConv.messages || []), optimisticMsg],
			messagesLoaded: true
		};
		const exists = conversations.some(c => c.id === targetConv.id);
		if (exists) {
			conversations = conversations.map(c => c.id === targetConv.id ? updatedConv : c).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
		} else {
			conversations = [updatedConv, ...conversations].sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
		}

		setSmartCache(`${data.user?.id}_conversations`, conversations);
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
							messages: (c.messages || []).map(m => m.id === tempId ? result.message : m)
						};
					}
					return c;
				});
				setSmartCache(`${data.user?.id}_conversations`, conversations);
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

	// Refetch and toast when form actions return
	let lastHandledFormSuccess = null;
	$effect(() => {
		const successMsg = form?.success;
		if (successMsg && successMsg !== lastHandledFormSuccess) {
			lastHandledFormSuccess = successMsg;
			toast.success(successMsg);
			untrack(() => {
				if (form?.activeTab) {
					activeTab = form.activeTab;
				}
				if (form?.activeConvId) {
					activeConvId = form.activeConvId;
				}
				removeSmartCache(`${data.user?.id}_worker_active_jobs`);
				removeSmartCache(`${data.user?.id}_worker_feed_default`);
				removeSmartCache(`${data.user?.id}_worker_profile`);
				removeSmartCache(`${data.user?.id}_conversations`);
				fetchActiveJobs(0, false);
				fetchFeedJobs(0, false);
				fetchConversations(false);
				if (profileLoaded) fetchProfileData();
			});
		}
	});

	let lastHandledFormError = null;
	$effect(() => {
		const errorMsg = form?.error;
		if (errorMsg && errorMsg !== lastHandledFormError) {
			lastHandledFormError = errorMsg;
			toast.error(errorMsg);
		}
	});
</script>

<svelte:head>
	<title>Worker Dashboard | Serviee</title>
</svelte:head>

<WorkerTabsNav 
	bind:activeTab 
	unreadCount={unreadConvIds.size} 
	onselectchat={() => {
		if (activeConversation) {
			unreadConvIds.delete(activeConversation.id);
			unreadConvIds = new Set(unreadConvIds);
		}
		scrollToBottom(false);
	}} 
/>

{#if activeTab === "feed"}
	<WorkerFeedTab 
		jobs={feedJobs} 
		totalCount={feedTotalCount}
		loading={feedLoading}
		loadingMore={feedLoadingMore}
		hasMore={feedHasMore}
		{availableLocations}
		bind:searchCategory 
		bind:searchLocation 
		bind:minBudget 
		bind:maxBudget 
		bind:searchQuery 
		bind:sortBy
		bind:showMobileFilters 
		{hasActiveFilters} 
		bind:applyingJobId 
		onloadmore={() => fetchFeedJobs(feedJobs.length, true)}
		onopenviewprofile={openViewProfile} 
		onopenchat={openChat} 
	/>
{:else if activeTab === "my-jobs"}
	<WorkerActiveJobsTab 
		activeJobs={activeJobs} 
		totalCount={activeJobsTotalCount}
		loading={activeJobsLoading}
		loadingMore={activeJobsLoadingMore}
		hasMore={activeJobsHasMore}
		onloadmore={() => fetchActiveJobs(activeJobs.length, true)}
		onopenviewprofile={openViewProfile} 
		onopenchat={openChat} 
	/>
{:else if activeTab === "chat"}
	<ChatTab 
		userRole="worker"
		conversations={displayedConversations} 
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
		onpromptdeleteconversation={promptDeleteConversation} 
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
		stats={profileStats} 
		completedJobs={profileCompletedJobs} 
		bind:profileSubTab 
	/>
{/if}

<ViewProfileModal
	bind:show={showViewProfileModal}
	userId={viewProfileUserId}
	currentUserId={data.user?.id}
	currentUserRole={data.user?.role}
	onopenchat={(targetUserId, extraData) => {
		openChatFromProfile(targetUserId, extraData);
	}}
/>

<LocationPickerModal 
	bind:show={showCustomLocationModal}
	title="Share Custom Pin / Landmark Location"
	onSave={handleCustomChatLocationSaved}
/>

<MobileChatHistory bind:activeConvId bind:showGpsDropup {activeTab} />

<ImagePreviewModal bind:previewImageModalUrl />

<ConfirmDeleteModal 
	bind:show={showDeleteConfirmModal} 
	loading={deletingMessage} 
	onConfirm={confirmDeleteMessage} 
/>

<ConfirmDeleteModal 
	bind:show={showDeleteConvConfirmModal} 
	title="Delete Conversation?"
	message="Are you sure you want to delete this conversation? It will be removed from your chat list. If the other person also deletes it, the messages will be permanently deleted."
	confirmText="Delete for me"
	loading={deletingConversation} 
	onConfirm={confirmDeleteConversation} 
/>
