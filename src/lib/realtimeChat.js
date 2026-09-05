import { supabase } from '$lib/supabaseClient.js';

/**
 * Play a subtle, pleasant notification chime using Web Audio API
 */
export function playNotificationSound() {
	if (typeof window === 'undefined') return;
	try {
		const AudioContextClass = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
		if (!AudioContextClass) return;
		const ctx = new AudioContextClass();
		if (ctx.state === 'suspended') {
			ctx.resume().catch(() => {});
		}

		const osc1 = ctx.createOscillator();
		const osc2 = ctx.createOscillator();
		const gainNode = ctx.createGain();

		osc1.type = 'sine';
		osc2.type = 'sine';

		// Soft pleasant harmonic chord (C6 & E6)
		osc1.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
		osc2.frequency.setValueAtTime(1318.5, ctx.currentTime); // E6

		gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
		gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

		osc1.connect(gainNode);
		osc2.connect(gainNode);
		gainNode.connect(ctx.destination);

		osc1.start(ctx.currentTime);
		osc2.start(ctx.currentTime);

		osc1.stop(ctx.currentTime + 0.35);
		osc2.stop(ctx.currentTime + 0.35);
	} catch (e) {
		// Audio context not allowed or unsupported
	}
}

/**
 * Connect to Supabase Realtime WebSocket for chat messages & typing indicators
 * @param {Object} options
 * @param {string} options.currentUserId
 * @param {(message: any) => void} options.onMessage
 * @param {(messageId: string) => void} [options.onDelete]
 * @param {(data: { convId: string, userId: string, isTyping: boolean }) => void} [options.onTyping]
 * @param {(status: string) => void} [options.onStatusChange]
 * @returns {{ channel: any, sendTypingSignal: Function, sendBroadcastMessage: Function, sendBroadcastDelete: Function, unsubscribe: Function }}
 */
export function setupRealtimeChat({ currentUserId, onMessage, onDelete, onTyping, onStatusChange }) {
	if (!currentUserId || !supabase) {
		return {
			channel: null,
			sendTypingSignal: () => {},
			sendBroadcastMessage: () => {},
			sendBroadcastDelete: () => {},
			unsubscribe: () => {}
		};
	}

	const channelName = 'serviee_realtime_chat';
	const channel = supabase.channel(channelName, {
		config: {
			broadcast: { self: false }
		}
	});

	// 1. Listen for Database INSERTs on messages table
	channel.on(
		'postgres_changes',
		{
			event: 'INSERT',
			schema: 'public',
			table: 'messages'
		},
		(payload) => {
			const msg = payload.new;
			if (msg && (msg.sender_id === currentUserId || msg.receiver_id === currentUserId)) {
				onMessage(msg);
			}
		}
	);

	// 2. Listen for Database DELETEs on messages table
	channel.on(
		'postgres_changes',
		{
			event: 'DELETE',
			schema: 'public',
			table: 'messages'
		},
		(payload) => {
			const deletedId = payload.old?.id;
			if (deletedId && onDelete) {
				onDelete(deletedId);
			}
		}
	);

	// 3. Listen for Instant Broadcast Messages (0ms peer-to-peer WebSocket delivery)
	channel.on('broadcast', { event: 'new_message' }, ({ payload }) => {
		if (payload && (payload.sender_id === currentUserId || payload.receiver_id === currentUserId)) {
			onMessage(payload);
		}
	});

	// 4. Listen for Broadcast Message Deletion
	channel.on('broadcast', { event: 'delete_message' }, ({ payload }) => {
		if (payload && payload.messageId && onDelete) {
			onDelete(payload.messageId);
		}
	});

	// 5. Listen for Typing Indicators
	channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
		if (payload && onTyping && payload.userId !== currentUserId) {
			onTyping(payload);
		}
	});

	// Subscribe to the channel
	channel.subscribe((status) => {
		if (onStatusChange) onStatusChange(status);
	});

	// Helpers
	const sendTypingSignal = (convId, isTyping = true) => {
		try {
			channel.send({
				type: 'broadcast',
				event: 'typing',
				payload: {
					convId,
					userId: currentUserId,
					isTyping
				}
			});
		} catch (err) {
			console.warn('Failed to send typing signal:', err);
		}
	};

	const sendBroadcastMessage = (message) => {
		try {
			channel.send({
				type: 'broadcast',
				event: 'new_message',
				payload: message
			});
		} catch (err) {
			console.warn('Failed to broadcast message:', err);
		}
	};

	const sendBroadcastDelete = (messageId) => {
		try {
			channel.send({
				type: 'broadcast',
				event: 'delete_message',
				payload: { messageId }
			});
		} catch (err) {
			console.warn('Failed to broadcast message delete:', err);
		}
	};

	const unsubscribe = () => {
		try {
			supabase.removeChannel(channel);
		} catch (err) {
			console.warn('Error removing realtime channel:', err);
		}
	};

	return {
		channel,
		sendTypingSignal,
		sendBroadcastMessage,
		sendBroadcastDelete,
		unsubscribe
	};
}
