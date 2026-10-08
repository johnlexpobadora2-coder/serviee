/**
 * Server-Side Security Utilities for Serviee
 * Includes:
 * 1. Sliding-window in-memory Rate Limiter with automatic memory cleanup
 * 2. Reverse-proxy aware Client IP Resolver
 * 3. Anti-XSS String Sanitizer
 */

// In-Memory Storage for Rate Limiting
// Key: identifier (e.g., "login:192.168.1.1") -> Array of hit timestamps
const rateLimitMap = new Map();

// Periodic cleanup every 5 minutes to prevent memory leaks on long-running VPS servers
if (typeof setInterval !== 'undefined') {
	setInterval(() => {
		const now = Date.now();
		for (const [key, timestamps] of rateLimitMap.entries()) {
			// Remove entries older than 10 minutes
			const validTimestamps = timestamps.filter(t => now - t < 10 * 60 * 1000);
			if (validTimestamps.length === 0) {
				rateLimitMap.delete(key);
			} else {
				rateLimitMap.set(key, validTimestamps);
			}
		}
	}, 5 * 60 * 1000);
}

/**
 * Check and record a rate limit hit for a given identifier.
 * @param {string} identifier - Unique key (e.g., `login:${ip}` or `admin:${ip}`)
 * @param {Object} options
 * @param {number} [options.limit=10] - Maximum allowed attempts in the time window
 * @param {number} [options.windowMs=60000] - Time window in milliseconds (default: 1 min)
 * @returns {{ allowed: boolean, remaining: number, retryAfterSeconds: number }}
 */
export function checkRateLimit(identifier, { limit = 10, windowMs = 60000 } = {}) {
	if (!identifier) return { allowed: true, remaining: limit, retryAfterSeconds: 0 };

	const now = Date.now();
	const windowStart = now - windowMs;

	// Retrieve existing timestamps and filter out old ones outside current window
	const existing = rateLimitMap.get(identifier) || [];
	const recentTimestamps = existing.filter(t => t > windowStart);

	if (recentTimestamps.length >= limit) {
		const oldestInWindow = recentTimestamps[0];
		const retryAfterMs = Math.max(0, oldestInWindow + windowMs - now);
		const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
		
		return {
			allowed: false,
			remaining: 0,
			retryAfterSeconds
		};
	}

	// Record the current hit
	recentTimestamps.push(now);
	rateLimitMap.set(identifier, recentTimestamps);

	return {
		allowed: true,
		remaining: limit - recentTimestamps.length,
		retryAfterSeconds: 0
	};
}

/**
 * Reset rate limit for an identifier (e.g. upon successful authentication)
 * @param {string} identifier 
 */
export function resetRateLimit(identifier) {
	if (identifier) {
		rateLimitMap.delete(identifier);
	}
}

/**
 * Resolves the client IP address across direct connections and reverse proxies (Nginx, Caddy, Cloudflare).
 * @param {any} eventOrRequest
 * @returns {string}
 */
export function getClientIp(eventOrRequest) {
	if (!eventOrRequest) return '127.0.0.1';

	/** @type {Headers|null} */
	let headers = null;
	if (eventOrRequest.headers && typeof eventOrRequest.headers.get === 'function') {
		headers = eventOrRequest.headers;
	} else if (eventOrRequest.request && eventOrRequest.request.headers && typeof eventOrRequest.request.headers.get === 'function') {
		headers = eventOrRequest.request.headers;
	}

	if (headers) {
		// Check standard proxy headers first
		const cfIp = headers.get('cf-connecting-ip');
		if (cfIp) return cfIp.trim();

		const xRealIp = headers.get('x-real-ip');
		if (xRealIp) return xRealIp.trim();

		const xForwardedFor = headers.get('x-forwarded-for');
		if (xForwardedFor) {
			// Take the first client IP in the comma-separated chain
			const ips = xForwardedFor.split(',');
			if (ips.length > 0 && ips[0].trim()) {
				return ips[0].trim();
			}
		}
	}

	// Fallback to SvelteKit event.getClientAddress() if available
	try {
		if (eventOrRequest && typeof eventOrRequest.getClientAddress === 'function') {
			return eventOrRequest.getClientAddress() || '127.0.0.1';
		}
	} catch (e) {
		// getClientAddress may throw if headers aren't trusted or in dev
	}

	return '127.0.0.1';
}

/**
 * Sanitizes a string by stripping dangerous HTML tags and event handlers to prevent XSS.
 * @param {string} input 
 * @returns {string}
 */
export function sanitizeInput(input) {
	if (typeof input !== 'string') return input;

	return input
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
		.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
		.replace(/on\w+\s*=\s*(['"]).*?\1/gi, '')
		.replace(/javascript\s*:/gi, '')
		.replace(/data\s*:\s*text\/html/gi, '')
		.trim();
}

import crypto from 'crypto';
import { env } from '$env/dynamic/private';

let cachedChatKey = null;

/**
 * Derives and caches a consistent 32-byte encryption key from environment secret
 * @returns {Buffer}
 */
function getChatEncryptionKey() {
	if (cachedChatKey) return cachedChatKey;
	const secret = 
		env.CHAT_ENCRYPTION_KEY || 
		env.SUPABASE_SERVICE_ROLE_KEY || 
		env.DATABASE_URL || 
		'serviee-secure-chat-aes256gcm-vault-key-2026';
	cachedChatKey = crypto.createHash('sha256').update(secret).digest();
	return cachedChatKey;
}

/**
 * Encrypts chat message content using AES-256-GCM authenticated encryption.
 * Format: enc:v1:<iv_b64>:<authTag_b64>:<ciphertext_b64>
 * @param {string} plaintext 
 * @returns {string}
 */
export function encryptChatMessage(plaintext) {
	if (!plaintext || typeof plaintext !== 'string') return plaintext;
	
	// Avoid double-encryption if already encrypted
	if (plaintext.startsWith('enc:v1:')) return plaintext;

	try {
		const key = getChatEncryptionKey();
		const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
		const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

		let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
		ciphertext += cipher.final('base64');

		const authTag = cipher.getAuthTag();

		return `enc:v1:${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext}`;
	} catch (err) {
		console.error('Chat encryption error:', err);
		return plaintext; // Fallback in case of unexpected crypto failure
	}
}

/**
 * Decrypts an encrypted chat message string.
 * Gracefully returns original plaintext if not encrypted or backwards compatible.
 * @param {string} payload 
 * @returns {string}
 */
export function decryptChatMessage(payload) {
	if (!payload || typeof payload !== 'string') return payload;

	// Backwards compatibility for plain text legacy messages
	if (!payload.startsWith('enc:v1:')) {
		return payload;
	}

	try {
		const parts = payload.split(':');
		if (parts.length < 5) return payload;

		// Format: ['enc', 'v1', iv_b64, authTag_b64, ciphertext_b64]
		const ivB64 = parts[2];
		const authTagB64 = parts[3];
		const ciphertextB64 = parts.slice(4).join(':'); // Handle any colons in ciphertext safely

		const key = getChatEncryptionKey();
		const iv = Buffer.from(ivB64, 'base64');
		const authTag = Buffer.from(authTagB64, 'base64');

		const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
		decipher.setAuthTag(authTag);

		let decrypted = decipher.update(ciphertextB64, 'base64', 'utf8');
		decrypted += decipher.final('utf8');

		return decrypted;
	} catch (err) {
		console.warn('Chat decryption error (possibly corrupted or modified):', err.message);
		return '[Encrypted Message]';
	}
}

/**
 * Hydrate/decrypt a message record object safely
 * @param {Object} msg 
 * @returns {Object}
 */
export function decryptMessageRecord(msg) {
	if (!msg) return msg;
	if (typeof msg.content === 'string') {
		return {
			...msg,
			content: decryptChatMessage(msg.content)
		};
	}
	return msg;
}
