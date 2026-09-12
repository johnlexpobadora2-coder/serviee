<script>
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { getGoogleMapsUrl } from '$lib/gpsUtils.js';
	import { 
		MapPin, 
		ExternalLink, 
		ArrowLeft, 
		Copy, 
		Check, 
		Navigation, 
		Layers,
		ZoomIn,
		ZoomOut,
		Share2
	} from 'lucide-svelte';

	/**
	 * @type {{
	 *  latitude: number|string,
	 *  longitude: number|string,
	 *  title?: string,
	 *  address?: string,
	 *  backUrl?: string,
	 *  fullscreen?: boolean,
	 *  onClose?: (() => void) | null
	 * }}
	 */
	let { 
		latitude = 14.599512, 
		longitude = 120.984222, 
		title = 'Pinned Location', 
		address = '', 
		backUrl = '',
		fullscreen = true,
		onClose = null
	} = $props();

	let mapContainer = $state(null);
	let mapInstance = null;
	let markerInstance = null;
	let leafletLib = null;
	let currentLayer = $state('streets'); // 'streets' | 'satellite'
	let tileLayerInstance = null;

	let copied = $state(false);
	let copyTimer = null;

	const numLat = $derived(typeof latitude === 'number' ? latitude : parseFloat(latitude) || 14.599512);
	const numLng = $derived(typeof longitude === 'number' ? longitude : parseFloat(longitude) || 120.984222);
	const googleMapsUrl = $derived(getGoogleMapsUrl(numLat, numLng, title || 'Job Location'));

	function createCustomPin(L) {
		return L.divIcon({
			className: 'serviee-map-viewer-pin',
			html: `
				<div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -100%);">
					<div style="
						width: 38px;
						height: 38px;
						background: #10b981;
						border: 3px solid #ffffff;
						border-radius: 50% 50% 50% 0;
						transform: rotate(-45deg);
						display: flex;
						align-items: center;
						justify-content: center;
						box-shadow: 0 2px 6px rgba(0,0,0,0.3);
						z-index: 2;
					">
						<svg style="transform: rotate(45deg); width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/>
							<circle cx="12" cy="10" r="3"/>
						</svg>
					</div>
					<div style="
						position: absolute;
						bottom: -4px;
						left: 50%;
						transform: translateX(-50%);
						width: 14px;
						height: 5px;
						background: rgba(0,0,0,0.4);
						border-radius: 50%;
					"></div>
				</div>
			`,
			iconSize: [0, 0],
			iconAnchor: [0, 0],
			popupAnchor: [0, -42]
		});
	}

	async function initMap() {
		if (!browser || !mapContainer) return;

		try {
			if (!leafletLib) {
				const mod = await import('leaflet');
				leafletLib = mod.default || mod;
			}
			const L = leafletLib;

			if (!mapInstance) {
				mapInstance = L.map(mapContainer, {
					center: [numLat, numLng],
					zoom: 16,
					zoomControl: false,
					attributionControl: false
				});

				setMapLayer('streets');

				const customPin = createCustomPin(L);
				markerInstance = L.marker([numLat, numLng], {
					icon: customPin,
					draggable: false
				}).addTo(mapInstance);

				const popupContent = `
					<div style="font-family: inherit; font-size: 0.85rem; color: #1e293b; padding: 4px; min-width: 180px;">
						<div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">${title || 'Pinned Location'}</div>
						${address ? `<div style="font-size: 0.75rem; color: #64748b; margin-bottom: 6px;">${address}</div>` : ''}
						<div style="font-size: 0.72rem; color: #10b981; font-weight: 600; margin-bottom: 8px;">
							${numLat.toFixed(6)}, ${numLng.toFixed(6)}
						</div>
						<a 
							href="${googleMapsUrl}" 
							target="_blank" 
							rel="noopener noreferrer"
							style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; width: 100%; background: #10b981; color: #ffffff; text-decoration: none; padding: 6px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;"
						>
							Open Google Maps ↗
						</a>
					</div>
				`;

				markerInstance.bindPopup(popupContent).openPopup();

				// Invalidate size once rendered
				setTimeout(() => {
					if (mapInstance) mapInstance.invalidateSize();
				}, 150);
			} else {
				mapInstance.setView([numLat, numLng], 16);
				if (markerInstance) {
					markerInstance.setLatLng([numLat, numLng]);
				}
			}
		} catch (err) {
			console.error('Failed to initialize MapViewer Leaflet:', err);
		}
	}

	function setMapLayer(type) {
		if (!mapInstance || !leafletLib) return;
		const L = leafletLib;

		if (tileLayerInstance) {
			mapInstance.removeLayer(tileLayerInstance);
		}

		currentLayer = type;
		if (type === 'satellite') {
			tileLayerInstance = L.tileLayer(
				'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
				{ maxZoom: 19, attribution: 'Esri World Imagery' }
			).addTo(mapInstance);
		} else {
			tileLayerInstance = L.tileLayer(
				'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
				{ maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }
			).addTo(mapInstance);
		}
	}

	function toggleLayer() {
		setMapLayer(currentLayer === 'streets' ? 'satellite' : 'streets');
	}

	function recenterMap() {
		if (mapInstance) {
			mapInstance.flyTo([numLat, numLng], 16, { duration: 0.8 });
			if (markerInstance) markerInstance.openPopup();
		}
	}

	function zoomIn() {
		if (mapInstance) mapInstance.zoomIn();
	}

	function zoomOut() {
		if (mapInstance) mapInstance.zoomOut();
	}

	function handleBack() {
		if (onClose) {
			onClose();
			return;
		}
		if (browser) {
			if (window.history.length > 1) {
				window.history.back();
			} else if (backUrl) {
				window.location.href = backUrl;
			} else {
				window.location.href = '/customer';
			}
		}
	}

	async function copyCoordinates() {
		if (!browser) return;
		try {
			await navigator.clipboard.writeText(`${numLat}, ${numLng}`);
			copied = true;
			if (copyTimer) clearTimeout(copyTimer);
			copyTimer = setTimeout(() => {
				copied = false;
			}, 2500);
		} catch (e) {
			console.warn('Failed to copy coordinates', e);
		}
	}

	async function shareLocation() {
		if (!browser) return;
		if (navigator.share) {
			try {
				await navigator.share({
					title: title || 'Location on Serviee',
					text: `Location: ${title || 'Job Location'} (${numLat}, ${numLng})`,
					url: window.location.href
				});
			} catch (e) {
				// User cancelled or share failed
			}
		} else {
			copyCoordinates();
		}
	}

	onMount(() => {
		initMap();
	});

	onDestroy(() => {
		if (copyTimer) clearTimeout(copyTimer);
		if (mapInstance) {
			mapInstance.remove();
			mapInstance = null;
		}
	});
</script>

<div class="serviee-map-view-container {fullscreen ? 'fullscreen-mode' : ''}">
	<!-- Map Target Container -->
	<div bind:this={mapContainer} class="map-viewport"></div>

	<!-- Top Floating Header Bar -->
	<header class="map-top-bar">
		<button 
			type="button" 
			class="map-btn map-back-btn" 
			onclick={handleBack} 
			title="Go back"
			aria-label="Go back"
		>
			<ArrowLeft size={18} />
			<span class="back-text">Back</span>
		</button>

		<div class="map-title-wrap">
			<div class="map-title-row">
				<MapPin size={15} class="pin-icon" />
				<h1 class="map-title">{title || 'Pinned Location'}</h1>
			</div>
			{#if address}
				<p class="map-address-sub">{address}</p>
			{/if}
		</div>

		<div class="map-top-actions">
			<button 
				type="button" 
				class="map-btn map-icon-btn" 
				onclick={toggleLayer} 
				title="Switch between Street and Satellite view"
				aria-label="Switch map layer"
			>
				<Layers size={17} />
				<span class="btn-tooltip">{currentLayer === 'streets' ? 'Satellite' : 'Street'}</span>
			</button>

			<button 
				type="button" 
				class="map-btn map-icon-btn" 
				onclick={shareLocation} 
				title="Share location"
				aria-label="Share location"
			>
				<Share2 size={17} />
			</button>
		</div>
	</header>

	<!-- Right Floating Map Controls -->
	<div class="map-floating-controls">
		<button 
			type="button" 
			class="map-control-btn" 
			onclick={recenterMap} 
			title="Recenter location"
			aria-label="Recenter map"
		>
			<Navigation size={18} />
		</button>
		<div class="map-zoom-group">
			<button 
				type="button" 
				class="map-control-btn zoom-btn" 
				onclick={zoomIn} 
				title="Zoom in"
				aria-label="Zoom in"
			>
				<ZoomIn size={18} />
			</button>
			<button 
				type="button" 
				class="map-control-btn zoom-btn" 
				onclick={zoomOut} 
				title="Zoom out"
				aria-label="Zoom out"
			>
				<ZoomOut size={18} />
			</button>
		</div>
	</div>

	<!-- Bottom Info & Google Maps Launch Card -->
	<div class="map-bottom-card">
		<div class="map-bottom-card-inner">
			<div class="map-bottom-info">
				<div class="coords-tag">
					<span class="coord-dot"></span>
					<span class="coord-text">{numLat.toFixed(6)}, {numLng.toFixed(6)}</span>
					<button 
						type="button" 
						class="copy-coord-btn" 
						onclick={copyCoordinates} 
						title="Copy coordinates"
					>
						{#if copied}
							<Check size={13} color="var(--success, #10b981)" />
							<span style="color: var(--success, #10b981);">Copied</span>
						{:else}
							<Copy size={13} />
							<span>Copy</span>
						{/if}
					</button>
				</div>
				{#if address}
					<div class="map-address-full">{address}</div>
				{/if}
			</div>

			<div class="map-bottom-actions">
				<a 
					href={googleMapsUrl} 
					target="_blank" 
					rel="noopener noreferrer" 
					class="google-maps-btn"
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
					</svg>
					<span>Open in Google Maps</span>
					<ExternalLink size={15} />
				</a>
			</div>
		</div>
	</div>
</div>

<style>
	.serviee-map-view-container {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 400px;
		background: #0f172a;
		overflow: hidden;
		user-select: none;
	}

	.serviee-map-view-container.fullscreen-mode {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100vw;
		height: 100dvh;
		z-index: 99999;
	}

	.map-viewport {
		width: 100%;
		height: 100%;
		z-index: 1;
	}

	/* Top Floating Header Bar */
	.map-top-bar {
		position: absolute;
		top: 1rem;
		left: 1rem;
		right: 1rem;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.6rem 0.85rem;
		background: rgba(15, 23, 42, 0.82);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: var(--radius-lg, 16px);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
		color: #ffffff;
	}

	.map-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: #ffffff;
		padding: 0.5rem 0.85rem;
		border-radius: var(--radius-md, 10px);
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		text-decoration: none;
	}

	.map-btn:hover {
		background: rgba(255, 255, 255, 0.16);
		border-color: rgba(255, 255, 255, 0.25);
		transform: translateY(-1px);
	}

	.map-btn:active {
		transform: translateY(0);
	}

	.map-icon-btn {
		padding: 0.5rem;
		border-radius: var(--radius-md, 10px);
		position: relative;
	}

	.btn-tooltip {
		display: none;
	}

	.map-title-wrap {
		flex: 1;
		min-width: 0;
		text-align: center;
		padding: 0 0.5rem;
	}

	.map-title-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
	}

	:global(.pin-icon) {
		color: #10b981;
		flex-shrink: 0;
	}

	.map-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: #ffffff;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.map-address-sub {
		font-size: 0.72rem;
		color: rgba(255, 255, 255, 0.7);
		margin: 0.1rem 0 0 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.map-top-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	/* Right floating map controls */
	.map-floating-controls {
		position: absolute;
		right: 1rem;
		top: 5.5rem;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.map-control-btn {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(15, 23, 42, 0.88);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: #ffffff;
		border-radius: var(--radius-md, 10px);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.map-control-btn:hover {
		background: rgba(255, 255, 255, 0.18);
		border-color: rgba(255, 255, 255, 0.3);
		color: #ffffff;
	}

	.map-zoom-group {
		display: flex;
		flex-direction: column;
		background: rgba(15, 23, 42, 0.88);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: var(--radius-md, 10px);
		overflow: hidden;
	}

	.map-zoom-group .zoom-btn {
		background: transparent;
		border: none;
		border-radius: 0;
		box-shadow: none;
	}

	.map-zoom-group .zoom-btn:first-child {
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	/* Bottom Floating Action Card */
	.map-bottom-card {
		position: absolute;
		bottom: 1.25rem;
		left: 1rem;
		right: 1rem;
		z-index: 1000;
		max-width: 600px;
		margin: 0 auto;
	}

	.map-bottom-card-inner {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: rgba(15, 23, 42, 0.92);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: var(--radius-lg, 16px);
		padding: 1rem 1.2rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}

	.coords-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.08);
		padding: 0.3rem 0.6rem;
		border-radius: 20px;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.9);
	}

	.coord-dot {
		width: 7px;
		height: 7px;
		background: #10b981;
		border-radius: 50%;
	}

	.coord-text {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.75rem;
		color: #ffffff;
	}

	.copy-coord-btn {
		background: transparent;
		border: none;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.65);
		cursor: pointer;
		padding: 0.15rem 0.35rem;
		border-radius: 4px;
		transition: all 0.15s ease;
	}

	.copy-coord-btn:hover {
		background: rgba(255, 255, 255, 0.12);
		color: #ffffff;
	}

	.map-address-full {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.85);
		margin-top: 0.4rem;
		line-height: 1.4;
	}

	.map-bottom-actions {
		display: flex;
		gap: 0.5rem;
	}

	.google-maps-btn {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		background: #10b981;
		color: #ffffff;
		padding: 0.75rem 1.25rem;
		border-radius: var(--radius-md, 10px);
		font-size: 0.9rem;
		font-weight: 600;
		text-decoration: none;
		transition: background-color 0.15s ease;
	}

	.google-maps-btn:hover {
		background: #059669;
	}

	.google-maps-btn:active {
		background: #047857;
	}

	@keyframes -global-pulse-ring {
		0% {
			transform: scale(0.6);
			opacity: 0.9;
		}
		80%, 100% {
			transform: scale(1.6);
			opacity: 0;
		}
	}

	@media (max-width: 640px) {
		.map-top-bar {
			top: 0.75rem;
			left: 0.75rem;
			right: 0.75rem;
			padding: 0.5rem 0.7rem;
		}

		.back-text {
			display: none;
		}

		.map-btn {
			padding: 0.45rem 0.6rem;
		}

		.map-title {
			font-size: 0.85rem;
		}

		.map-floating-controls {
			top: 4.8rem;
			right: 0.75rem;
		}

		.map-bottom-card {
			bottom: 1rem;
			left: 0.75rem;
			right: 0.75rem;
		}

		.map-bottom-card-inner {
			padding: 0.85rem 1rem;
		}

		.google-maps-btn {
			padding: 0.65rem 1rem;
			font-size: 0.85rem;
		}
	}
</style>
