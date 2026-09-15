/**
 * Utility functions for Job Cards (Relative Time, Schedule Urgency, GPS formatting)
 */

/**
 * Convert an ISO date string into relative human-friendly time (e.g. "Just now", "15m ago", "2h ago", "Yesterday", "3d ago")
 * @param {string|Date|number} dateInput
 * @returns {string}
 */
export function formatRelativeTime(dateInput) {
	if (!dateInput) return '';
	const date = new Date(dateInput);
	if (isNaN(date.getTime())) return '';

	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (diffInSeconds < 0) {
		return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
	}
	if (diffInSeconds < 60) {
		return 'Just now';
	}
	const diffInMinutes = Math.floor(diffInSeconds / 60);
	if (diffInMinutes < 60) {
		return `${diffInMinutes}m ago`;
	}
	const diffInHours = Math.floor(diffInMinutes / 60);
	if (diffInHours < 24) {
		return `${diffInHours}h ago`;
	}
	const diffInDays = Math.floor(diffInHours / 24);
	if (diffInDays === 1) {
		return 'Yesterday';
	}
	if (diffInDays < 7) {
		return `${diffInDays}d ago`;
	}

	const isSameYear = date.getFullYear() === now.getFullYear();
	return date.toLocaleDateString('en-PH', {
		month: 'short',
		day: 'numeric',
		year: isSameYear ? undefined : 'numeric'
	});
}

/**
 * Format full date and time for tooltips / exact timestamps
 * @param {string|Date|number} dateInput
 * @returns {string}
 */
export function formatFullDateTime(dateInput) {
	if (!dateInput) return '';
	const date = new Date(dateInput);
	if (isNaN(date.getTime())) return '';

	return date.toLocaleDateString('en-PH', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
}

/**
 * Analyze schedule date relative to current day to provide urgency cues
 * @param {string|Date|number} targetDateInput
 * @returns {{ label: string, type: 'rush' | 'urgent' | 'upcoming' | 'past', isUrgent: boolean } | null}
 */
export function getScheduleUrgency(targetDateInput) {
	if (!targetDateInput) return null;
	const target = new Date(targetDateInput);
	if (isNaN(target.getTime())) return null;

	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
	const diffDays = Math.round((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

	if (diffDays < 0) {
		return { label: 'Past Schedule', type: 'past', isUrgent: false };
	}
	if (diffDays === 0) {
		return { label: 'Rush (Today)', type: 'rush', isUrgent: true };
	}
	if (diffDays === 1) {
		return { label: 'Tomorrow', type: 'urgent', isUrgent: true };
	}
	if (diffDays <= 3) {
		return { label: `In ${diffDays} days`, type: 'upcoming', isUrgent: false };
	}
	return null;
}
