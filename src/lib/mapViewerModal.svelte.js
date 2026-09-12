import { browser } from '$app/environment';

class MapModalState {
	open = $state(false);
	/** @type {string|number} */
	latitude = $state(14.599512);
	/** @type {string|number} */
	longitude = $state(120.984222);
	title = $state('Pinned Location');
	address = $state('');
	backUrl = $state('');

	/**
	 * Open the map viewer modal overlay without reloading the page
	 * @param {{ latitude: number|string, longitude: number|string, title?: string, address?: string, backUrl?: string }} params
	 */
	openModal({ latitude, longitude, title = '', address = '', backUrl = '' }) {
		this.latitude = latitude;
		this.longitude = longitude;
		this.title = title || 'Pinned Location';
		this.address = address || '';
		this.backUrl = backUrl || '';
		this.open = true;

		if (browser) {
			const currentState = window.history.state || {};
			window.history.pushState({ ...currentState, servieeMapModal: true }, '');
		}
	}

	/**
	 * Close the map viewer modal and pop the history state
	 */
	closeModal() {
		if (this.open) {
			this.open = false;
			if (browser && window.history.state?.servieeMapModal) {
				window.history.back();
			}
		}
	}

	/**
	 * Handle browser back / popstate event
	 */
	handlePopState() {
		if (this.open) {
			this.open = false;
		}
	}
}

export const mapModal = new MapModalState();
