import crypto from 'crypto';
import { sendOtpEmail } from './email.js';

// In-Memory OTP Store: key -> { otp, type, metadata, expiresAt, attempts }
// key format: `${type}:${email.toLowerCase().trim()}`
const otpStore = new Map();

// In-Memory Password Reset Sessions: token -> { email, roles, expiresAt }
const resetSessionStore = new Map();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESET_SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateOtpCode() {
	const min = 100000;
	const max = 999999;
	return crypto.randomInt(min, max + 1).toString();
}

/**
 * Creates and sends an OTP to an email address.
 * @param {Object} params
 * @param {string} params.email
 * @param {'registration' | 'forgot_password'} params.type
 * @param {Object} [params.metadata] - Extra data (e.g. name, role, form values)
 * @param {string} [params.name]
 */
export async function createAndSendOtp({ email, type, metadata = null, name = '' }) {
	const normalizedEmail = (email || '').toLowerCase().trim();
	if (!normalizedEmail) throw new Error('Email is required.');

	const key = `${type}:${normalizedEmail}`;
	const otp = generateOtpCode();
	const expiresAt = Date.now() + OTP_TTL_MS;

	otpStore.set(key, {
		otp,
		type,
		email: normalizedEmail,
		metadata,
		expiresAt,
		attempts: 0
	});

	// Send email using Nodemailer
	await sendOtpEmail({
		to: normalizedEmail,
		otp,
		type,
		name: name || metadata?.name || ''
	});

	return { success: true, expiresAt };
}

/**
 * Verifies an OTP code for a given email and type.
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.otp
 * @param {'registration' | 'forgot_password'} params.type
 */
export function verifyOtp({ email, otp, type }) {
	const normalizedEmail = (email || '').toLowerCase().trim();
	const key = `${type}:${normalizedEmail}`;
	const record = otpStore.get(key);

	if (!record) {
		return {
			valid: false,
			error: 'No verification code was requested or code has expired. Please request a new one.'
		};
	}

	if (Date.now() > record.expiresAt) {
		otpStore.delete(key);
		return {
			valid: false,
			error: 'The verification code has expired. Please request a new one.'
		};
	}

	if (record.attempts >= MAX_ATTEMPTS) {
		otpStore.delete(key);
		return {
			valid: false,
			error: 'Too many incorrect attempts. Please request a new verification code.'
		};
	}

	const cleanInputOtp = (otp || '').toString().trim();
	if (record.otp !== cleanInputOtp) {
		record.attempts += 1;
		const remaining = MAX_ATTEMPTS - record.attempts;
		return {
			valid: false,
			error: `Incorrect verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Code invalidated.'}`
		};
	}

	// Code matched! Delete record so it cannot be reused
	const metadata = record.metadata;
	otpStore.delete(key);

	return {
		valid: true,
		metadata
	};
}

/**
 * Creates a password reset session token after successful OTP verification.
 * @param {string} email
 * @param {Array<string>} roles
 */
export function createResetSession(email, roles = []) {
	const normalizedEmail = (email || '').toLowerCase().trim();
	const token = crypto.randomUUID();
	const expiresAt = Date.now() + RESET_SESSION_TTL_MS;

	resetSessionStore.set(token, {
		email: normalizedEmail,
		roles,
		expiresAt
	});

	return token;
}

/**
 * Verifies if a reset session token is valid for the given email.
 * @param {string} token
 * @param {string} email
 */
export function verifyResetSession(token, email) {
	if (!token) return { valid: false, error: 'Reset session token is missing.' };
	const session = resetSessionStore.get(token);
	if (!session) return { valid: false, error: 'Reset session has expired or is invalid. Please restart the reset process.' };

	if (Date.now() > session.expiresAt) {
		resetSessionStore.delete(token);
		return { valid: false, error: 'Reset session has expired. Please restart the reset process.' };
	}

	const normalizedEmail = (email || '').toLowerCase().trim();
	if (session.email !== normalizedEmail) {
		return { valid: false, error: 'Email mismatch with reset session.' };
	}

	return { valid: true, session };
}

/**
 * Consumes/removes the reset session after password change.
 * @param {string} token
 */
export function consumeResetSession(token) {
	if (token) {
		resetSessionStore.delete(token);
	}
}
