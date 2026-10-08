import crypto from 'crypto';
import { env } from '$env/dynamic/private';

// Stable secret for session signing, with fallback if not defined in .env
const SESSION_SECRET = env.SESSION_SECRET || process.env.SESSION_SECRET || 'serviee_secret_session_signing_key_2026';

/**
 * Creates a cryptographically signed session token: `${userId}:${tokenVersion}:${sessionId}.${signature}`
 * @param {string} userId - The user's UUID
 * @param {number} [tokenVersion=1] - Version number for session invalidation
 * @param {string} [sessionId=''] - Optional unique session ID for multi-device tracking
 * @returns {string} Signed session token
 */
export function createSignedSession(userId, tokenVersion = 1, sessionId = '') {
	if (!userId) return '';
	const payload = sessionId ? `${userId}:${tokenVersion}:${sessionId}` : `${userId}:${tokenVersion}`;
	const signature = crypto
		.createHmac('sha256', SESSION_SECRET)
		.update(payload)
		.digest('hex');
	return `${payload}.${signature}`;
}

/**
 * Verifies a signed session token and extracts the userId, tokenVersion, and sessionId if valid.
 * @param {string} token - The signed token string
 * @returns {{ userId: string, tokenVersion: number, sessionId: string|null }|null} The verified session info, or null if invalid or tampered
 */
export function verifySignedSession(token) {
	if (!token || typeof token !== 'string' || !token.includes('.')) {
		return null;
	}

	const parts = token.split('.');
	if (parts.length !== 2) return null;

	const [payload, signature] = parts;
	if (!payload || !signature) return null;

	// Support both legacy `${userId}`, `${userId}:${tokenVersion}`, and `${userId}:${tokenVersion}:${sessionId}` formats
	const expectedSignature = crypto
		.createHmac('sha256', SESSION_SECRET)
		.update(payload)
		.digest('hex');

	// Timing-safe comparison to prevent timing attacks
	const sigBuffer = Buffer.from(signature, 'hex');
	const expectedBuffer = Buffer.from(expectedSignature, 'hex');

	if (sigBuffer.length !== expectedBuffer.length) {
		return null;
	}

	if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
		return null;
	}

	if (payload.includes(':')) {
		const segments = payload.split(':');
		if (segments.length >= 3) {
			const [userId, versionStr, sessionId] = segments;
			const tokenVersion = parseInt(versionStr, 10) || 1;
			return { userId, tokenVersion, sessionId: sessionId || null };
		}
		const [userId, versionStr] = segments;
		const tokenVersion = parseInt(versionStr, 10) || 1;
		return { userId, tokenVersion, sessionId: null };
	}

	// Legacy format (no version in payload)
	return { userId: payload, tokenVersion: 1, sessionId: null };
}

const ADMIN_PASSCODE = env.ADMIN_PASSCODE || process.env.ADMIN_PASSCODE || '1473';

/**
 * Verifies the admin passcode.
 * @param {string} inputCode
 * @returns {boolean}
 */
export function verifyAdminPasscode(inputCode) {
	if (!inputCode) return false;
	return inputCode.trim() === ADMIN_PASSCODE.trim();
}

/**
 * Creates an admin session token with timestamp and signature.
 * @returns {string}
 */
export function createAdminSessionToken() {
	const timestamp = Date.now().toString();
	const payload = `admin_${timestamp}`;
	const signature = crypto
		.createHmac('sha256', SESSION_SECRET)
		.update(payload)
		.digest('hex');
	return `${payload}.${signature}`;
}

/**
 * Verifies if the admin session token is valid and not expired (24-hour TTL).
 * @param {string} token
 * @returns {boolean}
 */
export function verifyAdminSessionToken(token) {
	if (!token || typeof token !== 'string' || !token.includes('.')) {
		return false;
	}

	const parts = token.split('.');
	if (parts.length !== 2) return false;

	const [payload, signature] = parts;
	if (!payload || !signature) return false;

	const expectedSignature = crypto
		.createHmac('sha256', SESSION_SECRET)
		.update(payload)
		.digest('hex');

	const sigBuffer = Buffer.from(signature, 'hex');
	const expectedBuffer = Buffer.from(expectedSignature, 'hex');

	if (sigBuffer.length !== expectedBuffer.length) return false;
	if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return false;

	// Check timestamp (max 24 hours)
	const match = payload.match(/^admin_(\d+)$/);
	if (!match) return false;

	const issuedAt = parseInt(match[1], 10);
	const maxAge = 24 * 60 * 60 * 1000;
	if (Date.now() - issuedAt > maxAge) {
		return false;
	}

	return true;
}

/**
 * Extracts human-readable device, browser, and OS info from a User-Agent string.
 * @param {string} userAgent
 * @param {string} [ip='']
 * @returns {{ deviceType: string, os: string, browser: string, ip: string, lastActive: string, isCurrent: boolean }}
 */
export function parseDeviceInfo(userAgent = '', ip = '') {
	const ua = userAgent || '';

	// Operating System
	let os = 'Unknown OS';
	if (/windows nt 10/i.test(ua)) os = 'Windows 10/11';
	else if (/windows/i.test(ua)) os = 'Windows';
	else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
	else if (/android/i.test(ua)) os = 'Android';
	else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS (Apple)';
	else if (/linux/i.test(ua)) os = 'Linux';

	// Browser
	let browser = 'Web Browser';
	if (/edg\//i.test(ua)) browser = 'Microsoft Edge';
	else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
	else if (/chrome|crios/i.test(ua)) browser = 'Google Chrome';
	else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';
	else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Apple Safari';
	else if (/opera|opr\//i.test(ua)) browser = 'Opera';

	// Device Type
	let deviceType = 'desktop';
	if (/tablet|ipad/i.test(ua)) {
		deviceType = 'tablet';
	} else if (/mobile|android|iphone|ipod/i.test(ua)) {
		deviceType = 'mobile';
	}

	const displayIp = (!ip || ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') ? 'Localhost (Dev)' : ip;

	return {
		deviceType,
		os,
		browser,
		ip: displayIp,
		lastActive: 'Active Now',
		isCurrent: true
	};
}

