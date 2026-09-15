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
		Maximize,
		Loader2
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
						background: #10b981;
						border: 3px solid #ffffff;
						border-radius: 50% 50% 50% 0;
						transform: rotate(-45deg);
						display: flex;
						align-items: center;
						justify-content: center;
						box-shadow: 0 4px 10px rgba(0,0,0,0.35);
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

	function createUserLocationPin(L) {
		return L.divIcon({
			className: 'serviee-user-gps-pin',
			html: `
				<div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%);">
					<div style="
						position: absolute;
						inset: -6px;
						border-radius: 50%;
						background: rgba(59, 130, 246, 0.35);
						animation: pulseUserMarker 2s cubic-bezier(0, 0.2, 0.8, 1) infinite;
					"></div>
					<div style="
						width: 20px;
						height: 20px;
						border-radius: 50%;
						background: #2563eb;
						border: 3.5px solid #ffffff;
						box-shadow: 0 3px 8px rgba(0,0,0,0.4);
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
			<div style="font-family: inherit; font-size: 0.85rem; color: #1e293b; padding: 4px; min-width: 190px;">
				<div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">${title || 'Pinned Location'}</div>
				${address ? `<div style="font-size: 0.75rem; color: #64748b; margin-bottom: 6px;">${address}</div>` : ''}
				<div style="font-size: 0.72rem; color: #10b981; font-weight: 600; margin-bottom: 8px;">
					${numLat.toFixed(6)}, ${numLng.toFixed(6)}${distText}
				</div>
				<a 
					href="${directionsUrl}" 
					target="_blank" 
					rel="noopener noreferrer"
					style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; width: 100%; background: #10b981; color: #ffffff; text-decoration: none; padding: 6px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;"
				>
					${userCoords ? 'Directions in Google Maps ↗' : 'Open Google Maps ↗'}
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
							color: '#3b82f6',
							weight: 1,
							fillColor: '#3b82f6',
							fillOpacity: 0.12
						}).addTo(mapInstance);
					}

					// Blue User GPS Pin
					const userPin = createUserLocationPin(L);
					userMarkerInstance = L.marker([coords.latitude, coords.longitude], {
						icon: userPin,
						zIndexOffset: 1000
					}).addTo(mapInstance);

					const userPopupContent = `
						<div style="font-family: inherit; font-size: 0.85rem; color: #1e293b; padding: 4px; min-width: 170px;">
							<div style="display: flex; align-items: center; gap: 4px; font-weight: 700; color: #2563eb; margin-bottom: 2px;">
								<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#2563eb;"></span>
								Your GPS Location
							</div>
							<div style="font-size: 0.72rem; color: #64748b; margin-bottom: 6px;">
								${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}
							</div>
							${distanceInfo ? `<div style="font-size: 0.75rem; font-weight: 600; color: #0f172a; margin-bottom: 6px;">📍 ${distanceInfo.text} to job</div>` : ''}
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

<div class="serviee-map-viewer-wrapper relative w-full h-full min-h-[100dvh] bg-slate-900 overflow-hidden select-none {fullscreen ? 'fixed inset-0 w-full h-[100dvh] z-[999]' : ''}">
	<!-- Map Target Container -->
	<div bind:this={mapContainer} class="w-full h-full min-h-[100dvh] z-[1]"></div>

	<!-- Top Floating Header Bar (avoiding <header> HTML tag collision with global layout css) -->
	<div role="banner" class="map-viewer-floating-header absolute top-4 left-4 right-4 max-sm:top-3 max-sm:left-3 max-sm:right-3 z-[1000] flex items-center justify-between gap-3 p-2.5 max-sm:p-2 bg-slate-900/90 backdrop-blur-md border border-white/15 rounded-2xl shadow-2xl text-white">
		<button 
			type="button" 
			class="inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 active:bg-white/10 border border-white/15 text-white py-2 px-3.5 max-sm:p-2 rounded-xl text-[0.85rem] font-medium cursor-pointer transition-all duration-200" 
			onclick={handleBack} 
			title="Go back"
			aria-label="Go back"
		>
			<ArrowLeft size={18} />
			<span class="max-sm:hidden">Back</span>
		</button>

		<div class="flex-1 min-w-0 text-center px-2">
			<div class="flex items-center justify-center gap-1.5">
				<MapPin size={15} class="text-emerald-500 shrink-0" />
				<h1 class="text-[0.95rem] max-sm:text-[0.85rem] font-bold text-white m-0 truncate">{title || 'Pinned Location'}</h1>
			</div>
			{#if distanceInfo}
				<p class="text-[0.72rem] text-emerald-400 font-semibold mt-0.5 truncate flex items-center justify-center gap-1">
					<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
					{distanceInfo.text} from your GPS location
				</p>
			{:else if address}
				<p class="text-[0.72rem] text-white/70 mt-0.5 truncate">{address}</p>
			{/if}
		</div>

		<div class="flex items-center gap-1.5">
			<button 
				type="button" 
				class="inline-flex items-center justify-center p-2 bg-white/10 hover:bg-white/20 active:bg-white/10 border border-white/15 text-white rounded-xl text-[0.85rem] font-medium cursor-pointer transition-all duration-200" 
				onclick={toggleLayer} 
				title="Switch between Street and Satellite view"
				aria-label="Switch map layer"
			>
				<Layers size={17} />
			</button>

			<button 
				type="button" 
				class="inline-flex items-center justify-center p-2 bg-white/10 hover:bg-white/20 active:bg-white/10 border border-white/15 text-white rounded-xl text-[0.85rem] font-medium cursor-pointer transition-all duration-200" 
				onclick={shareLocation} 
				title="Share location"
				aria-label="Share location"
			>
				<Share2 size={17} />
			</button>
		</div>
	</div>

	<!-- Right Floating Map Controls -->
	<div class="absolute right-4 top-[5.5rem] max-sm:right-3 max-sm:top-[4.8rem] z-[1000] flex flex-col gap-2.5">
		<!-- Fit Both Button (Only visible if user GPS is loaded) -->
		{#if userCoords}
			<button 
				type="button" 
				class="w-10 h-10 flex items-center justify-center bg-slate-900/90 backdrop-blur-md border border-white/15 text-emerald-400 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/20 hover:border-emerald-400/50 shadow-lg" 
				onclick={fitBothInView} 
				title="Fit Both (Job + My GPS) in view"
				aria-label="Fit both locations in view"
			>
				<Maximize size={17} />
			</button>
		{/if}

		<!-- Recenter Job Pin Button -->
		<button 
			type="button" 
			class="w-10 h-10 flex items-center justify-center bg-slate-900/90 backdrop-blur-md border border-white/15 text-emerald-500 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/20 hover:border-white/30 shadow-lg" 
			onclick={recenterJob} 
			title="Focus Job Pin"
			aria-label="Focus Job Pin"
		>
			<MapPin size={18} />
		</button>

		<!-- My GPS Location Button -->
		<button 
			type="button" 
			class="w-10 h-10 flex items-center justify-center bg-slate-900/90 backdrop-blur-md border border-white/15 {userCoords ? 'text-blue-400' : 'text-white/80'} rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/20 hover:border-blue-400/50 shadow-lg relative" 
			onclick={recenterUser} 
			title={userCoords ? 'Focus My GPS Location' : 'Locate My GPS'}
			aria-label="Locate My GPS"
		>
			{#if isLocating}
				<Loader2 size={18} class="animate-spin text-blue-400" />
			{:else}
				<Navigation size={18} />
			{/if}
			{#if userCoords}
				<span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-slate-900"></span>
			{/if}
		</button>

		<!-- Zoom In / Zoom Out Controls -->
		<div class="flex flex-col bg-slate-900/90 backdrop-blur-md border border-white/15 rounded-xl overflow-hidden shadow-lg">
			<button 
				type="button" 
				class="w-10 h-10 flex items-center justify-center bg-transparent border-none border-b border-white/10 text-white cursor-pointer transition-all duration-200 hover:bg-white/20" 
				onclick={zoomIn} 
				title="Zoom in"
				aria-label="Zoom in"
			>
				<ZoomIn size={18} />
			</button>
			<button 
				type="button" 
				class="w-10 h-10 flex items-center justify-center bg-transparent border-none text-white cursor-pointer transition-all duration-200 hover:bg-white/20" 
				onclick={zoomOut} 
				title="Zoom out"
				aria-label="Zoom out"
			>
				<ZoomOut size={18} />
			</button>
		</div>
	</div>

	<!-- Bottom Info & Navigation Launch Card -->
	<div class="absolute bottom-5 left-4 right-4 max-sm:bottom-4 max-sm:left-3 max-sm:right-3 z-[1000] max-w-[600px] mx-auto">
		<div class="flex flex-col gap-3 bg-slate-900/90 backdrop-blur-md border border-white/15 rounded-2xl p-4 max-sm:p-3.5 shadow-2xl">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<div class="inline-flex items-center gap-2 bg-white/5 border border-white/10 py-1 px-2.5 rounded-full text-[0.75rem] text-white/90">
					<span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
					<span class="font-mono text-[0.75rem] text-white">{numLat.toFixed(6)}, {numLng.toFixed(6)}</span>
					<button 
						type="button" 
						class="bg-transparent border-none inline-flex items-center gap-1 text-[0.7rem] text-white/70 hover:text-white hover:bg-white/10 cursor-pointer py-0.5 px-1.5 rounded transition-all duration-150" 
						onclick={copyCoordinates} 
						title="Copy coordinates"
					>
						{#if copied}
							<Check size={13} class="text-emerald-400" />
							<span class="text-emerald-400">Copied</span>
						{:else}
							<Copy size={13} />
							<span>Copy</span>
						{/if}
					</button>
				</div>

				{#if distanceInfo}
					<div class="inline-flex items-center gap-1.5 bg-blue-500/15 border border-blue-500/30 text-blue-300 py-1 px-2.5 rounded-full text-[0.75rem] font-semibold">
						<Navigation size={12} class="text-blue-400 shrink-0" />
						<span>{distanceInfo.text} away from you</span>
					</div>
				{:else if isLocating}
					<div class="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 text-white/60 py-1 px-2.5 rounded-full text-[0.72rem]">
						<Loader2 size={12} class="animate-spin text-blue-400" />
						<span>Acquiring your GPS...</span>
					</div>
				{/if}
			</div>

			{#if address}
				<div class="text-[0.8rem] text-white/90 leading-relaxed">{address}</div>
			{/if}

			<div class="flex gap-2">
				{#if userCoords}
					<button
						type="button"
						onclick={fitBothInView}
						class="inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 active:bg-white/10 border border-white/15 text-white py-3 px-4 max-sm:py-2.5 max-sm:px-3 rounded-xl text-[0.85rem] font-medium cursor-pointer transition-all duration-150"
						title="Show Both on Map"
					>
						<Maximize size={16} />
						<span class="max-sm:hidden">Fit Both</span>
					</button>
				{/if}

				<a 
					href={directionsUrl} 
					target="_blank" 
					rel="noopener noreferrer" 
					class="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white py-3 px-5 max-sm:py-2.5 max-sm:px-4 max-sm:text-[0.85rem] rounded-xl text-[0.9rem] font-semibold transition-colors duration-150 no-underline shadow-lg"
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
		background: #0f172a !important;
		font-family: inherit !important;
	}
	.serviee-map-viewer-wrapper {
		width: 100%;
		height: 100%;
		min-height: 100dvh;
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
