/**
 * Validation utilities for Serviee
 */

export const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
export const PHONE_REGEX = /^\d{11}$/;

/**
 * Validates whether an email address is a valid @gmail.com address.
 * @param {string} email
 * @returns {{ isValid: boolean, error: string | null }}
 */
export function validateGmail(email) {
	if (!email || typeof email !== 'string') {
		return { isValid: false, error: 'Email address is required.' };
	}
	const trimmed = email.trim();
	if (!GMAIL_REGEX.test(trimmed)) {
		return { isValid: false, error: 'Email must be a valid @gmail.com address (e.g. user@gmail.com).' };
	}
	return { isValid: true, error: null };
}

/**
 * Validates whether a phone number is exactly 11 digits.
 * @param {string} phone
 * @returns {{ isValid: boolean, error: string | null }}
 */
export function validatePhone(phone) {
	if (!phone || typeof phone !== 'string') {
		return { isValid: false, error: 'Invalid phone number format.' };
	}
	const trimmed = phone.trim();
	if (!PHONE_REGEX.test(trimmed)) {
		return { isValid: false, error: 'Invalid phone number format.' };
	}
	return { isValid: true, error: null };
}

/**
 * Validates password based on required security rules:
 * - Minimum 6 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 special character
 * @param {string} password
 * @returns {{
 *   isValid: boolean,
 *   error: string | null,
 *   checks: {
 *     minLength: boolean,
 *     hasUppercase: boolean,
 *     hasSpecialChar: boolean,
 *     hasNumber: boolean,
 *     hasLowercase: boolean
 *   }
 * }}
 */
export function validatePassword(password) {
	const str = typeof password === 'string' ? password : '';
	const minLength = str.length >= 6;
	const hasUppercase = /[A-Z]/.test(str);
	const hasSpecialChar = /[^A-Za-z0-9]/.test(str);
	const hasNumber = /[0-9]/.test(str);
	const hasLowercase = /[a-z]/.test(str);

	const isValid = minLength && hasUppercase && hasSpecialChar;

	let error = null;
	if (!isValid) {
		const missing = [];
		if (!minLength) missing.push('at least 6 characters');
		if (!hasUppercase) missing.push('1 uppercase letter (A-Z)');
		if (!hasSpecialChar) missing.push('1 special character (e.g. !@#$%)');
		error = `Password must have ${missing.join(', ')}.`;
	}

	return {
		isValid,
		error,
		checks: {
			minLength,
			hasUppercase,
			hasSpecialChar,
			hasNumber,
			hasLowercase
		}
	};
}

/**
 * Calculates password strength meter properties.
 * @param {string} password
 * @returns {{
 *   score: number, // 0 to 4
 *   label: 'Empty' | 'Weak' | 'Fair' | 'Good' | 'Strong',
 *   color: string,
 *   percent: number,
 *   checks: {
 *     minLength: boolean,
 *     hasUppercase: boolean,
 *     hasSpecialChar: boolean,
 *     hasNumber: boolean,
 *     hasLowercase: boolean
 *   }
 * }}
 */
export function getPasswordStrength(password) {
	const str = typeof password === 'string' ? password : '';
	if (!str) {
		return {
			score: 0,
			label: 'Empty',
			color: 'var(--border-color, #4b5563)',
			percent: 0,
			checks: {
				minLength: false,
				hasUppercase: false,
				hasSpecialChar: false,
				hasNumber: false,
				hasLowercase: false
			}
		};
	}

	const minLength = str.length >= 6;
	const hasUppercase = /[A-Z]/.test(str);
	const hasSpecialChar = /[^A-Za-z0-9]/.test(str);
	const hasNumber = /[0-9]/.test(str);
	const hasLowercase = /[a-z]/.test(str);
	const isLong = str.length >= 10;

	// Core criteria
	let score = 0;
	if (minLength) score += 1;
	if (hasUppercase) score += 1;
	if (hasSpecialChar) score += 1;
	if (hasNumber || hasLowercase) score += 1;
	if (isLong && score >= 3) score += 1;

	// Normalize score: 0 to 4
	if (score <= 1) {
		return {
			score: 1,
			label: 'Weak',
			color: '#ef4444', // Red
			percent: 25,
			checks: { minLength, hasUppercase, hasSpecialChar, hasNumber, hasLowercase }
		};
	} else if (score === 2) {
		return {
			score: 2,
			label: 'Fair',
			color: '#f97316', // Orange
			percent: 50,
			checks: { minLength, hasUppercase, hasSpecialChar, hasNumber, hasLowercase }
		};
	} else if (score === 3 || (!minLength || !hasUppercase || !hasSpecialChar)) {
		return {
			score: 3,
			label: 'Good',
			color: '#eab308', // Yellow/Amber
			percent: 75,
			checks: { minLength, hasUppercase, hasSpecialChar, hasNumber, hasLowercase }
		};
	} else {
		return {
			score: 4,
			label: 'Strong',
			color: '#10b981', // Emerald Green
			percent: 100,
			checks: { minLength, hasUppercase, hasSpecialChar, hasNumber, hasLowercase }
		};
	}
}
