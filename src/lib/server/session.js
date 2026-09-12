import crypto from 'crypto';
import { env } from '$env/dynamic/private';

// Stable secret for session signing, with fallback if not defined in .env
const SESSION_SECRET = env.SESSION_SECRET || process.env.SESSION_SECRET || 'serviee_secret_session_signing_key_2026';

/**
 * Creates a cryptographically signed session token: `${userId}:${tokenVersion}.${signature}`
 * @param {string} userId - The user's UUID
 * @param {number} [tokenVersion=1] - Version number for session invalidation
 * @returns {string} Signed session token
 */
export function createSignedSession(userId, tokenVersion = 1) {
	if (!userId) return '';
	const payload = `${userId}:${tokenVersion}`;
	const signature = crypto
		.createHmac('sha256', SESSION_SECRET)
		.update(payload)
		.digest('hex');
	return `${payload}.${signature}`;
}

/**
 * Verifies a signed session token and extracts the userId and tokenVersion if valid.
 * @param {string} token - The signed token string
 * @returns {{ userId: string, tokenVersion: number }|null} The verified session info, or null if invalid or tampered
 */
export function verifySignedSession(token) {
	if (!token || typeof token !== 'string' || !token.includes('.')) {
		return null;
	}

	const parts = token.split('.');
	if (parts.length !== 2) return null;

	const [payload, signature] = parts;
	if (!payload || !signature) return null;

	// Support both legacy `${userId}` and `${userId}:${tokenVersion}` formats
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
		const [userId, versionStr] = payload.split(':');
		const tokenVersion = parseInt(versionStr, 10) || 1;
		return { userId, tokenVersion };
	}

	// Legacy format (no version in payload)
	return { userId: payload, tokenVersion: 1 };
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
