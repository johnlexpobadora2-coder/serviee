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
				}, 50);
				setTimeout(() => {
					if (mapInstance) mapInstance.invalidateSize();
				}, 250);
				setTimeout(() => {
					if (mapInstance) mapInstance.invalidateSize();
				}, 600);
			} else {
				mapInstance.setView([numLat, numLng], 16);
				if (markerInstance) {
					markerInstance.setLatLng([numLat, numLng]);
				}
				mapInstance.invalidateSize();
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
			{#if address}
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
		<button 
			type="button" 
			class="w-10 h-10 flex items-center justify-center bg-slate-900/90 backdrop-blur-md border border-white/15 text-white rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/20 hover:border-white/30" 
			onclick={recenterMap} 
			title="Recenter location"
			aria-label="Recenter map"
		>
			<Navigation size={18} />
		</button>
		<div class="flex flex-col bg-slate-900/90 backdrop-blur-md border border-white/15 rounded-xl overflow-hidden">
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

	<!-- Bottom Info & Google Maps Launch Card -->
	<div class="absolute bottom-5 left-4 right-4 max-sm:bottom-4 max-sm:left-3 max-sm:right-3 z-[1000] max-w-[600px] mx-auto">
		<div class="flex flex-col gap-3 bg-slate-900/90 backdrop-blur-md border border-white/15 rounded-2xl p-4 max-sm:p-3.5 shadow-2xl">
			<div>
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
				{#if address}
					<div class="text-[0.8rem] text-white/90 mt-1.5 leading-relaxed">{address}</div>
				{/if}
			</div>

			<div class="flex gap-2">
				<a 
					href={googleMapsUrl} 
					target="_blank" 
					rel="noopener noreferrer" 
					class="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white py-3 px-5 max-sm:py-2.5 max-sm:px-4 max-sm:text-[0.85rem] rounded-xl text-[0.9rem] font-semibold transition-colors duration-150 no-underline"
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
</style>
