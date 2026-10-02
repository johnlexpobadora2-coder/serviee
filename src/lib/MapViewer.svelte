<script>
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { 
		getGoogleMapsUrl, 
		getGoogleMapsDirectionsUrl, 
		getCurrentCoordinates, 
		calculateDistance 
	} from '$lib/gpsUtils.js';
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
		Share2,
		Maximize2,
		Loader2,
		Crosshair
	} from 'lucide-svelte';
	import ThemeToggle from '$lib/ThemeToggle.svelte';

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
	let userMarkerInstance = null;
	let userAccuracyCircle = null;
	let leafletLib = null;
	let currentLayer = $state('streets'); // 'streets' | 'satellite'
	let tileLayerInstance = null;

	let copied = $state(false);
	let copyTimer = null;

	let userCoords = $state(null);
	let isLocating = $state(false);
	let locationError = $state(null);

	const numLat = $derived(typeof latitude === 'number' ? latitude : parseFloat(latitude) || 14.599512);
	const numLng = $derived(typeof longitude === 'number' ? longitude : parseFloat(longitude) || 120.984222);
	
	const googleMapsUrl = $derived(getGoogleMapsUrl(numLat, numLng, title || 'Job Location'));
	const directionsUrl = $derived(
		userCoords 
			? getGoogleMapsDirectionsUrl(userCoords.latitude, userCoords.longitude, numLat, numLng) 
			: googleMapsUrl
	);

	const distanceInfo = $derived(
		userCoords 
			? calculateDistance(userCoords.latitude, userCoords.longitude, numLat, numLng) 
			: null
	);

	function createCustomJobPin(L) {
		return L.divIcon({
			className: 'serviee-map-viewer-pin',
			html: `
				<div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -100%);">
					<div style="
						width: 38px;
						height: 38px;
						background: linear-gradient(135deg, #8b5cf6 0%, #6c47ff 100%);
						border: 3px solid #ffffff;
						border-radius: 50% 50% 50% 0;
						transform: rotate(-45deg);
						display: flex;
						align-items: center;
						justify-content: center;
						box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
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
						background: rgba(0,0,0,0.25);
						border-radius: 50%;
					"></div>
				</div>
			`,
			iconSize: [0, 0],
			iconAnchor: [0, 0],
			popupAnchor: [0, -42]
		});
	}

	function createUserLocationPin(L) {
		return L.divIcon({
			className: 'serviee-user-gps-pin',
			html: `
				<div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%);">
					<div style="
						position: absolute;
						inset: -6px;
						border-radius: 50%;
						background: rgba(99, 102, 241, 0.25);
						animation: pulseUserMarker 2s cubic-bezier(0, 0.2, 0.8, 1) infinite;
					"></div>
					<div style="
						width: 20px;
						height: 20px;
						border-radius: 50%;
						background: #6366f1;
						border: 3px solid #ffffff;
						box-shadow: 0 2px 6px rgba(0,0,0,0.2);
						z-index: 2;
					"></div>
				</div>
			`,
			iconSize: [0, 0],
			iconAnchor: [0, 0],
			popupAnchor: [0, -18]
		});
	}

	let resizeObserver = null;

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

				const customPin = createCustomJobPin(L);
				markerInstance = L.marker([numLat, numLng], {
					icon: customPin,
					draggable: false
				}).addTo(mapInstance);

				updateJobPopup();

				// Invalidate size once rendered
				setTimeout(() => {
					if (mapInstance) mapInstance.invalidateSize();
				}, 50);
				setTimeout(() => {
					if (mapInstance) mapInstance.invalidateSize();
				}, 250);
				setTimeout(() => {
					if (mapInstance) mapInstance.invalidateSize();
				}, 600);

				// Auto-fetch user GPS location in background
				locateUser(false);
			} else {
				mapInstance.setView([numLat, numLng], 16);
				if (markerInstance) {
					markerInstance.setLatLng([numLat, numLng]);
					updateJobPopup();
				}
				mapInstance.invalidateSize();
			}
		} catch (err) {
			console.error('Failed to initialize MapViewer Leaflet:', err);
		}
	}

	function updateJobPopup() {
		if (!markerInstance) return;
		const distText = distanceInfo ? ` • ${distanceInfo.text} away` : '';
		const popupContent = `
			<div class="serviee-leaflet-custom-popup">
				<div class="serviee-popup-title">${title || 'Pinned Location'}</div>
				${address ? `<div class="serviee-popup-address">${address}</div>` : ''}
				<div class="serviee-popup-coords">
					${numLat.toFixed(6)}, ${numLng.toFixed(6)}${distText}
				</div>
				<a 
					href="${directionsUrl}" 
					target="_blank" 
					rel="noopener noreferrer" 
					class="serviee-popup-cta-btn"
				>
					<span>${userCoords ? 'Directions in Google Maps' : 'Open in Google Maps'}</span>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
						<polyline points="15 3 21 3 21 9"></polyline>
						<line x1="10" y1="14" x2="21" y2="3"></line>
					</svg>
				</a>
			</div>
		`;
		markerInstance.bindPopup(popupContent);
	}

	async function locateUser(pan = false) {
		if (!browser) return;
		isLocating = true;
		locationError = null;

		try {
			const coords = await getCurrentCoordinates();
			if (coords && coords.latitude && coords.longitude) {
				userCoords = coords;

				if (mapInstance && leafletLib) {
					const L = leafletLib;

					// Remove existing user marker & circle if any
					if (userMarkerInstance) {
						mapInstance.removeLayer(userMarkerInstance);
					}
					if (userAccuracyCircle) {
						mapInstance.removeLayer(userAccuracyCircle);
					}

					// Accuracy circle
					if (coords.accuracy && coords.accuracy < 2000) {
						userAccuracyCircle = L.circle([coords.latitude, coords.longitude], {
							radius: coords.accuracy,
							color: '#6366f1',
							weight: 1,
							fillColor: '#6366f1',
							fillOpacity: 0.12
						}).addTo(mapInstance);
					}

					// Violet / Blue User GPS Pin
					const userPin = createUserLocationPin(L);
					userMarkerInstance = L.marker([coords.latitude, coords.longitude], {
						icon: userPin,
						zIndexOffset: 1000
					}).addTo(mapInstance);

					const userPopupContent = `
						<div class="serviee-leaflet-custom-popup">
							<div class="serviee-popup-user-header">
								<span class="serviee-popup-user-dot"></span>
								<span>Your GPS Location</span>
							</div>
							<div class="serviee-popup-address">
								${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}
							</div>
							${distanceInfo ? `<div class="serviee-popup-distance-tag">📍 ${distanceInfo.text} to job</div>` : ''}
						</div>
					`;
					userMarkerInstance.bindPopup(userPopupContent);

					// Update job popup with distance
					updateJobPopup();

					if (pan) {
						mapInstance.flyTo([coords.latitude, coords.longitude], 16, { duration: 0.8 });
						userMarkerInstance.openPopup();
					}
				}
			}
		} catch (err) {
			console.warn('MapViewer locateUser error:', err);
			locationError = err.message || 'Unable to retrieve your GPS location.';
		} finally {
			isLocating = false;
		}
	}

	function fitBothInView() {
		if (!mapInstance || !leafletLib) return;
		if (!userCoords) {
			locateUser(true);
			return;
		}
		const L = leafletLib;
		const bounds = L.latLngBounds([
			[numLat, numLng],
			[userCoords.latitude, userCoords.longitude]
		]);
		mapInstance.fitBounds(bounds, { padding: [80, 80], maxZoom: 16, animate: true });
	}

	function recenterJob() {
		if (mapInstance) {
			mapInstance.flyTo([numLat, numLng], 16, { duration: 0.8 });
			if (markerInstance) markerInstance.openPopup();
		}
	}

	function recenterUser() {
		if (userCoords && mapInstance) {
			mapInstance.flyTo([userCoords.latitude, userCoords.longitude], 16, { duration: 0.8 });
			if (userMarkerInstance) userMarkerInstance.openPopup();
		} else {
			locateUser(true);
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
			if (backUrl) {
				window.location.href = backUrl;
			} else if (window.history.length > 1) {
				window.history.back();
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
					text: `Location: ${title || 'Job Location'} (${numLat}, ${numLng})${distanceInfo ? ` - ${distanceInfo.text} away` : ''}`,
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
		if (browser && window.ResizeObserver && mapContainer) {
			resizeObserver = new ResizeObserver(() => {
				if (mapInstance) {
					mapInstance.invalidateSize();
				}
			});
			resizeObserver.observe(mapContainer);
		}
	});

	onDestroy(() => {
		if (copyTimer) clearTimeout(copyTimer);
		if (resizeObserver) {
			resizeObserver.disconnect();
			resizeObserver = null;
		}
		if (mapInstance) {
			mapInstance.remove();
			mapInstance = null;
			markerInstance = null;
			userMarkerInstance = null;
			userAccuracyCircle = null;
		}
	});
</script>

<div class="serviee-map-viewer-wrapper relative w-full h-full min-h-dvh bg-(--bg-base) text-(--text-primary) overflow-hidden select-none font-sans {fullscreen ? 'fixed inset-0 w-full h-dvh z-999' : ''}">
	<!-- Map Target Container -->
	<div bind:this={mapContainer} class="w-full h-full min-h-dvh z-1"></div>

	<!-- Top Floating Header Bar matching Serviee Navbar & Theme -->
	<div role="banner" class="map-viewer-floating-header absolute top-3.5 left-3.5 right-3.5 max-sm:top-2.5 max-sm:left-2.5 max-sm:right-2.5 z-1000 flex items-center justify-between gap-2.5 p-2 max-sm:p-2 bg-(--bg-header) backdrop-blur-xl border border-(--border-color) rounded-2xl shadow-(--shadow-sm) text-(--text-primary) transition-colors duration-200">
		<button 
			type="button" 
			class="inline-flex items-center justify-center gap-1.5 bg-(--bg-input) hover:bg-(--border-color) active:bg-(--bg-input) border border-(--border-color) text-(--text-primary) py-2 px-3.5 max-sm:p-2 rounded-xl text-[0.85rem] font-semibold cursor-pointer transition-all duration-150" 
			onclick={handleBack} 
			title="Go back"
			aria-label="Go back"
		>
			<ArrowLeft size={18} class="text-(--accent)" />
			<span class="max-sm:hidden">Back</span>
		</button>

		<div class="flex-1 min-w-0 text-center px-2">
			<div class="flex items-center justify-center gap-1.5">
				<MapPin size={16} class="text-(--accent) shrink-0" />
				<h1 class="text-[0.95rem] max-sm:text-[0.85rem] font-bold text-(--text-primary) m-0 truncate tracking-tight">{title || 'Pinned Location'}</h1>
			</div>
			{#if distanceInfo}
				<p class="text-[0.72rem] text-(--accent-hover) font-semibold mt-0.5 truncate flex items-center justify-center gap-1">
					<span class="w-1.5 h-1.5 rounded-full bg-(--accent) animate-pulse"></span>
					{distanceInfo.text} from your GPS location
				</p>
			{:else if address}
				<p class="text-[0.72rem] text-(--text-secondary) mt-0.5 truncate">{address}</p>
			{/if}
		</div>

		<div class="flex items-center gap-1.5">
			<button 
				type="button" 
				class="inline-flex items-center justify-center p-2 bg-(--bg-input) hover:bg-(--border-color) active:bg-(--bg-input) border border-(--border-color) text-(--text-primary) hover:text-(--accent) rounded-xl text-[0.85rem] font-medium cursor-pointer transition-all duration-150 {currentLayer === 'satellite' ? 'border-(--accent) text-(--accent) bg-(--accent-light)' : ''}" 
				onclick={toggleLayer} 
				title="Switch between Street and Satellite view"
				aria-label="Switch map layer"
			>
				<Layers size={17} />
			</button>

			<button 
				type="button" 
				class="inline-flex items-center justify-center p-2 bg-(--bg-input) hover:bg-(--border-color) active:bg-(--bg-input) border border-(--border-color) text-(--text-primary) hover:text-(--accent) rounded-xl text-[0.85rem] font-medium cursor-pointer transition-all duration-150" 
				onclick={shareLocation} 
				title="Share location"
				aria-label="Share location"
			>
				<Share2 size={17} />
			</button>

			<div class="flex items-center">
				<ThemeToggle />
			</div>
		</div>
	</div>

	<!-- Right Floating Map Controls -->
	<div class="absolute right-3.5 top-20 max-sm:right-2.5 max-sm:top-[4.5rem] z-1000 flex flex-col gap-2">
		<!-- Fit Both Button (Only visible if user GPS is loaded) -->
		{#if userCoords}
			<button 
				type="button" 
				class="w-10 h-10 flex items-center justify-center bg-(--bg-card)/90 backdrop-blur-xl border border-(--border-color) text-(--accent) rounded-xl cursor-pointer transition-all duration-150 hover:bg-(--bg-input) hover:border-(--accent) shadow-(--shadow-sm)" 
				onclick={fitBothInView} 
				title="Fit Both (Job + My GPS) in view"
				aria-label="Fit both locations in view"
			>
				<Maximize2 size={17} />
			</button>
		{/if}

		<!-- Recenter Job Pin Button -->
		<button 
			type="button" 
			class="w-10 h-10 flex items-center justify-center bg-(--bg-card)/90 backdrop-blur-xl border border-(--border-color) text-(--accent) rounded-xl cursor-pointer transition-all duration-150 hover:bg-(--bg-input) hover:border-(--accent) shadow-(--shadow-sm)" 
			onclick={recenterJob} 
			title="Focus Job Pin"
			aria-label="Focus Job Pin"
		>
			<Crosshair size={18} />
		</button>

		<!-- My GPS Location Button -->
		<button 
			type="button" 
			class="w-10 h-10 flex items-center justify-center bg-(--bg-card)/90 backdrop-blur-xl border border-(--border-color) {userCoords ? 'text-indigo-400 border-indigo-500/40' : 'text-(--text-secondary)'} rounded-xl cursor-pointer transition-all duration-150 hover:bg-(--bg-input) hover:text-(--accent) hover:border-(--accent) shadow-(--shadow-sm) relative" 
			onclick={recenterUser} 
			title={userCoords ? 'Focus My GPS Location' : 'Locate My GPS'}
			aria-label="Locate My GPS"
		>
			{#if isLocating}
				<Loader2 size={18} class="animate-spin text-(--accent)" />
			{:else}
				<Navigation size={18} />
			{/if}
			{#if userCoords}
				<span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-(--bg-card)"></span>
			{/if}
		</button>

		<!-- Zoom In / Zoom Out Controls -->
		<div class="flex flex-col bg-(--bg-card)/90 backdrop-blur-xl border border-(--border-color) rounded-xl overflow-hidden shadow-(--shadow-sm)">
			<button 
				type="button" 
				class="w-10 h-10 flex items-center justify-center bg-transparent border-none border-b border-(--border-color) text-(--text-primary) cursor-pointer transition-all duration-150 hover:bg-(--bg-input) hover:text-(--accent)" 
				onclick={zoomIn} 
				title="Zoom in"
				aria-label="Zoom in"
			>
				<ZoomIn size={18} />
			</button>
			<button 
				type="button" 
				class="w-10 h-10 flex items-center justify-center bg-transparent border-none text-(--text-primary) cursor-pointer transition-all duration-150 hover:bg-(--bg-input) hover:text-(--accent)" 
				onclick={zoomOut} 
				title="Zoom out"
				aria-label="Zoom out"
			>
				<ZoomOut size={18} />
			</button>
		</div>
	</div>

	<!-- Bottom Info & Navigation Launch Card -->
	<div class="absolute bottom-5 left-3.5 right-3.5 max-sm:bottom-3.5 max-sm:left-2.5 max-sm:right-2.5 z-1000 max-w-xl mx-auto">
		<div class="flex flex-col gap-3.5 bg-(--bg-card)/95 backdrop-blur-xl border border-(--border-color) rounded-2xl p-4 sm:p-5 shadow-(--shadow-sm) transition-colors duration-200">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<!-- GPS Coordinates Pill -->
				<div class="inline-flex items-center gap-2 bg-(--bg-input) border border-(--border-color) py-1.5 px-3 rounded-xl text-[0.78rem] text-(--text-primary)">
					<span class="w-2 h-2 bg-(--accent) rounded-full"></span>
					<span class="font-mono text-[0.78rem] font-semibold text-(--text-primary)">{numLat.toFixed(6)}, {numLng.toFixed(6)}</span>
					<button 
						type="button" 
						class="bg-transparent border-none inline-flex items-center gap-1 text-[0.72rem] text-(--text-secondary) hover:text-(--accent) cursor-pointer py-0.5 px-1.5 rounded transition-all duration-150" 
						onclick={copyCoordinates} 
						title="Copy coordinates"
					>
						{#if copied}
							<Check size={13} class="text-(--success)" />
							<span class="text-(--success) font-semibold">Copied</span>
						{:else}
							<Copy size={13} />
							<span>Copy</span>
						{/if}
					</button>
				</div>

				<!-- Distance from User GPS Tag -->
				{#if distanceInfo}
					<div class="inline-flex items-center gap-1.5 bg-(--accent-light) border border-(--accent)/30 text-(--accent) py-1.5 px-3 rounded-xl text-[0.76rem] font-bold">
						<Navigation size={12} class="text-(--accent) shrink-0" />
						<span>{distanceInfo.text} away from you</span>
					</div>
				{:else if isLocating}
					<div class="inline-flex items-center gap-1.5 bg-(--bg-input) border border-(--border-color) text-(--text-secondary) py-1.5 px-3 rounded-xl text-[0.75rem]">
						<Loader2 size={12} class="animate-spin text-(--accent)" />
						<span>Acquiring your GPS...</span>
					</div>
				{/if}
			</div>

			{#if address}
				<div class="text-[0.84rem] text-(--text-secondary) leading-relaxed font-medium flex items-start gap-1.5">
					<MapPin size={15} class="text-(--accent) shrink-0 mt-0.5" />
					<span>{address}</span>
				</div>
			{/if}

			<div class="flex items-center pt-1">
				<a 
					href={directionsUrl} 
					target="_blank" 
					rel="noopener noreferrer" 
					class="btn btn-primary w-full flex-1 py-3 px-5 max-sm:py-2.5 max-sm:px-4 text-[0.9rem] font-bold rounded-xl shadow-(--shadow-sm) hover:shadow-(--shadow-md) transition-all duration-150 no-underline inline-flex items-center justify-center gap-2"
				>
					{#if userCoords}
						<Navigation size={17} />
						<span>Directions in Google Maps</span>
					{:else}
						<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
						</svg>
						<span>Open in Google Maps</span>
					{/if}
					<ExternalLink size={15} />
				</a>
			</div>
		</div>
	</div>
</div>

<style>
	:global(.leaflet-container) {
		width: 100% !important;
		height: 100% !important;
		background: var(--bg-base) !important;
		font-family: var(--font-sans, inherit) !important;
	}

	.serviee-map-viewer-wrapper {
		width: 100%;
		height: 100%;
		min-height: 100dvh;
	}

	/* Leaflet Custom Popups styled according to Serviee Theme */
	:global(.leaflet-popup-content-wrapper) {
		background: var(--bg-card) !important;
		color: var(--text-primary) !important;
		border: 1px solid var(--border-color) !important;
		box-shadow: var(--shadow-sm) !important;
		border-radius: var(--radius-lg, 12px) !important;
		padding: 4px !important;
	}

	:global(.leaflet-popup-tip) {
		background: var(--bg-card) !important;
		border: 1px solid var(--border-color) !important;
	}

	:global(.leaflet-popup-close-button) {
		color: var(--text-muted) !important;
		padding: 6px !important;
	}

	:global(.leaflet-popup-close-button:hover) {
		color: var(--text-primary) !important;
	}

	:global(.serviee-leaflet-custom-popup) {
		font-family: inherit;
		font-size: 0.85rem;
		color: var(--text-primary);
		padding: 6px 4px;
		min-width: 200px;
	}

	:global(.serviee-popup-title) {
		font-weight: 700;
		color: var(--text-primary);
		font-size: 0.92rem;
		margin-bottom: 3px;
	}

	:global(.serviee-popup-address) {
		font-size: 0.76rem;
		color: var(--text-secondary);
		margin-bottom: 6px;
		line-height: 1.35;
	}

	:global(.serviee-popup-coords) {
		font-size: 0.72rem;
		color: var(--accent);
		font-weight: 600;
		margin-bottom: 8px;
		font-family: monospace;
	}

	:global(.serviee-popup-cta-btn) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		width: 100%;
		background: var(--accent);
		color: #ffffff !important;
		text-decoration: none;
		padding: 7px 12px;
		border-radius: var(--radius-md, 8px);
		font-size: 0.78rem;
		font-weight: 600;
		transition: background-color var(--transition-fast, 0.15s ease);
	}

	:global(.serviee-popup-cta-btn:hover) {
		background: var(--accent-hover);
		color: #ffffff !important;
	}

	:global(.serviee-popup-user-header) {
		display: flex;
		align-items: center;
		gap: 6px;
		font-weight: 700;
		color: #6366f1;
		font-size: 0.85rem;
		margin-bottom: 4px;
	}

	:global(.serviee-popup-user-dot) {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #6366f1;
	}

	:global(.serviee-popup-distance-tag) {
		font-size: 0.76rem;
		font-weight: 600;
		color: var(--accent);
		margin-top: 4px;
	}

	@keyframes pulseUserMarker {
		0% {
			transform: scale(0.6);
			opacity: 0.8;
		}
		50% {
			transform: scale(1.4);
			opacity: 0.2;
		}
		100% {
			transform: scale(1.8);
			opacity: 0;
		}
	}
</style>
