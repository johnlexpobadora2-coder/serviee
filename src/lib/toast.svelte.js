/**
 * Global reactive Toast notification store for Serviee
 * Built with Svelte 5 runes
 */

class ToastStore {
	toasts = $state([]);
	#counter = 0;

	/**
	 * @param {string} message
	 * @param {'success' | 'error' | 'info' | 'warning'} [type='info']
	 * @param {number} [duration=4000]
	 */
	add(message, type = 'info', duration = 4000) {
		if (!message || typeof message !== 'string') return null;
		
		const id = ++this.#counter;
		const newToast = {
			id,
			message,
			type,
			duration,
			createdAt: Date.now()
		};

		// Limit max active toasts to 4
		if (this.toasts.length >= 4) {
			this.toasts = [...this.toasts.slice(1), newToast];
		} else {
			this.toasts = [...this.toasts, newToast];
		}

		if (duration > 0) {
			setTimeout(() => {
				this.remove(id);
			}, duration);
		}

		return id;
	}

	success(message, duration = 4000) {
		return this.add(message, 'success', duration);
	}

	error(message, duration = 5000) {
		return this.add(message, 'error', duration);
	}

	info(message, duration = 4000) {
		return this.add(message, 'info', duration);
	}

	warning(message, duration = 4500) {
		return this.add(message, 'warning', duration);
	}

	remove(id) {
		this.toasts = this.toasts.filter(t => t.id !== id);
	}

	clear() {
		this.toasts = [];
	}
}

export const toast = new ToastStore();
