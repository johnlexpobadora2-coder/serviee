<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { 
		MapPin, 
		Navigation, 
		Layers, 
		ZoomIn, 
		ZoomOut, 
		MessageSquare, 
		Bookmark, 
		Share2, 
		Calendar, 
		User, 
		X, 
		Maximize2,
		AlertCircle
	} from 'lucide-svelte';
	import { savedJobs } from '$lib/savedJobs.svelte.js';
	import { getCurrentCoordinates } from '$lib/gpsUtils.js';

	let {
		jobs = [],
		applyingJobId = null,
		onopenchat = () => {},
		onopenviewprofile = () => {},
		onopenshare = () => {}
	} = $props();

	let mapContainer = $state(null);
	let mapInstance = null;
	let leafletLib = null;
	let markersLayerGroup = null;
	let userLocationMarker = null;
	let userAccuracyCircle = null;

	let selectedJob = $state(null);
	let currentLayer = $state('streets');
	let tileLayerInstance = null;
	let locatingUser = $state(false);
	let userCoords = $state(null);

	// Filter only jobs with valid coordinates
	const mappedJobs = $derived(
		(jobs || []).filter(
			(j) => j && j.latitude && j.longitude && !isNaN(parseFloat(j.latitude)) && !isNaN(parseFloat(j.longitude))
		)
	);

	const unmappedCount = $derived(
		Math.max(0, (jobs || []).length - mappedJobs.length)
	);

	function getCategoryColor(category) {
		switch (category) {
			case 'Plumbing / Tubero': return '#3b82f6';
			case 'Roofing / Ayos Yero': return '#ef4444';
			case 'Excavation / Hukay Lupa': return '#d97706';
			case 'Gardening': return '#10b981';
			case 'Carpentry': return '#8b5cf6';
			default: return '#6366f1';
		}
	}

	function getCategoryBadge(category) {
		switch (category) {
			case 'Plumbing / Tubero': return 'badge-plumbing';
			case 'Roofing / Ayos Yero': return 'badge-roofing';
			case 'Excavation / Hukay Lupa': return 'badge-excavation';
			case 'Gardening': return 'badge-gardening';
			case 'Carpentry': return 'badge-carpentry';
			default: return 'badge-general';
		}
	}

	function createJobPinIcon(L, job, isSelected = false) {
		const pinColor = isSelected ? '#6366f1' : '#10b981';
		const budgetFormatted = Number(job.budget || 0) >= 1000 
			? `₱${(Number(job.budget) / 1000).toFixed(Number(job.budget) % 1000 === 0 ? 0 : 1)}k`
			: `₱${job.budget || 0}`;

		return L.divIcon({
			className: 'serviee-job-feed-map-pin',
			html: `
				<div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
					<!-- Price Bubble -->
					<div style="
						background: ${isSelected ? '#6366f1' : '#10b981'};
						color: #ffffff;
						font-weight: 700;
						font-size: 11px;
						padding: 2px 8px;
						border-radius: 9999px;
						box-shadow: 0 2px 8px rgba(0,0,0,0.3);
						border: 2px solid #ffffff;
						white-space: nowrap;
						margin-bottom: 2px;
						letter-spacing: -0.01em;
						transition: all 0.2s ease;
						transform: ${isSelected ? 'scale(1.1)' : 'scale(1)'};
						z-index: 3;
					">
						${budgetFormatted}
					</div>

					<!-- Marker Pin Needle (Exact Match to MapViewer) -->
					<div style="
						position: relative;
						width: 36px;
						height: 36px;
						display: flex;
						align-items: center;
						justify-content: center;
					">
						<div style="
							width: 32px;
							height: 32px;
							background: ${pinColor};
							border: 3px solid #ffffff;
							border-radius: 50% 50% 50% 0;
							transform: rotate(-45deg);
							display: flex;
							align-items: center;
							justify-content: center;
							box-shadow: 0 2px 6px rgba(0,0,0,0.3);
							z-index: 2;
						">
							<svg style="transform: rotate(45deg); width: 17px; height: 17px;" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
								<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/>
								<circle cx="12" cy="10" r="3"/>
							</svg>
						</div>
						<div style="
							position: absolute;
							bottom: -3px;
							left: 50%;
							transform: translateX(-50%);
							width: 14px;
							height: 5px;
							background: rgba(0,0,0,0.35);
							border-radius: 50%;
						"></div>
					</div>
				</div>
			`,
			iconSize: [0, 0],
			iconAnchor: [0, 0]
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

			// Inject Leaflet CSS if not yet injected
			if (!document.getElementById('leaflet-css')) {
				const link = document.createElement('link');
				link.id = 'leaflet-css';
				link.rel = 'stylesheet';
				link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
				document.head.appendChild(link);
			}

			// Default center: Manila / Philippines coordinates
			const initialLat = 14.599512;
			const initialLng = 120.984222;

			mapInstance = L.map(mapContainer, {
				center: [initialLat, initialLng],
				zoom: 12,
				zoomControl: false,
				attributionControl: false
			});

			// Base street layer (CartoDB Dark Matter / Positron or OSM)
			setMapLayer(currentLayer);

			markersLayerGroup = L.layerGroup().addTo(mapInstance);

			// Render all job pins
			updateMarkers();

			// Auto try getting user GPS location in background to center or show nearby
			locateUser(false);
		} catch (err) {
			console.error('Error initializing JobFeedMapView:', err);
		}
	}

	function setMapLayer(layer) {
		if (!mapInstance || !leafletLib) return;
		const L = leafletLib;
		currentLayer = layer;

		if (tileLayerInstance) {
			mapInstance.removeLayer(tileLayerInstance);
		}

		if (layer === 'satellite') {
			tileLayerInstance = L.tileLayer(
				'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
				{
					maxZoom: 19,
					attribution: 'Esri World Imagery'
				}
			);
		} else {
			// Exact standard OpenStreetMap tile layer used in MapViewer.svelte
			tileLayerInstance = L.tileLayer(
				'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
				{
					maxZoom: 19,
					attribution: '&copy; OpenStreetMap contributors'
				}
			);
		}

		tileLayerInstance.addTo(mapInstance);
	}

	function toggleMapLayer() {
		setMapLayer(currentLayer === 'streets' ? 'satellite' : 'streets');
	}

	function updateMarkers() {
		if (!mapInstance || !leafletLib || !markersLayerGroup) return;
		const L = leafletLib;

		markersLayerGroup.clearLayers();

		const bounds = L.latLngBounds([]);

		mappedJobs.forEach((job) => {
			const lat = parseFloat(job.latitude);
			const lng = parseFloat(job.longitude);
			if (isNaN(lat) || isNaN(lng)) return;

			const isSelected = selectedJob && selectedJob.id === job.id;
			const icon = createJobPinIcon(L, job, isSelected);

			const marker = L.marker([lat, lng], { icon });

			marker.on('click', () => {
				selectedJob = job;
				mapInstance.panTo([lat, lng], { animate: true, duration: 0.5 });
				updateMarkers(); // Refresh selected highlight
			});

			markersLayerGroup.addLayer(marker);
			bounds.extend([lat, lng]);
		});

		if (mappedJobs.length > 0 && bounds.isValid()) {
			mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
		}
	}

	async function locateUser(pan = true) {
		if (!browser || !mapInstance || !leafletLib) return;
		const L = leafletLib;
		locatingUser = true;

		try {
			const coords = await getCurrentCoordinates();
			if (coords && coords.latitude && coords.longitude) {
				userCoords = coords;

				if (userLocationMarker) {
					mapInstance.removeLayer(userLocationMarker);
				}
				if (userAccuracyCircle) {
					mapInstance.removeLayer(userAccuracyCircle);
				}

				// Create My Location Pulse Icon
				const myLocIcon = L.divIcon({
					className: 'my-loc-pin',
					html: `
						<div style="position: relative; width: 22px; height: 22px; transform: translate(-50%, -50%);">
							<div style="
								position: absolute;
								inset: -6px;
								border-radius: 50%;
								background: rgba(59, 130, 246, 0.4);
								animation: pulseMarker 2s infinite;
							"></div>
							<div style="
								width: 22px;
								height: 22px;
								border-radius: 50%;
								background: #2563eb;
								border: 3px solid #ffffff;
								box-shadow: 0 2px 6px rgba(0,0,0,0.35);
							"></div>
						</div>
					`,
					iconSize: [0, 0],
					iconAnchor: [0, 0]
				});

				userLocationMarker = L.marker([coords.latitude, coords.longitude], { icon: myLocIcon }).addTo(mapInstance);

				if (pan) {
					mapInstance.setView([coords.latitude, coords.longitude], 14, { animate: true });
				}
			}
		} catch (err) {
			console.warn('Could not locate user:', err);
		} finally {
			locatingUser = false;
		}
	}

	function fitAllJobs() {
		if (!mapInstance || !leafletLib || mappedJobs.length === 0) return;
		const L = leafletLib;
		const bounds = L.latLngBounds([]);
		mappedJobs.forEach((job) => {
			const lat = parseFloat(job.latitude);
			const lng = parseFloat(job.longitude);
			if (!isNaN(lat) && !isNaN(lng)) bounds.extend([lat, lng]);
		});
		if (bounds.isValid()) {
			mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
		}
	}

	function zoomIn() {
		if (mapInstance) mapInstance.zoomIn();
	}

	function zoomOut() {
		if (mapInstance) mapInstance.zoomOut();
	}

	$effect(() => {
		// When mappedJobs changes, re-render markers
		if (mappedJobs && mapInstance) {
			updateMarkers();
		}
	});

	onMount(() => {
		initMap();
	});

	onDestroy(() => {
		if (mapInstance) {
			mapInstance.remove();
			mapInstance = null;
		}
	});
</script>

<div class="job-feed-map-wrapper">
	<!-- Leaflet Map Container -->
	<div bind:this={mapContainer} class="job-feed-map-canvas"></div>

	<!-- Top Info / Banner Status -->
	<div class="map-top-status-bar">
		<span class="badge map-status-badge">
			<MapPin size={12} style="color: var(--success, #10b981);" />
			<span><strong>{mappedJobs.length}</strong> Pinned Jobs</span>
		</span>

		{#if unmappedCount > 0}
			<span class="badge badge-warning map-status-badge" title="{unmappedCount} jobs without GPS coordinates">
				<AlertCircle size={12} />
				<span>{unmappedCount} Unpinned</span>
			</span>
		{/if}
	</div>

	<!-- Floating Controls (Right) -->
	<div class="map-controls-group">
		<button 
			type="button" 
			class="map-ctrl-btn {locatingUser ? 'active' : ''}" 
			onclick={() => locateUser(true)}
			title="Locate My Position"
		>
			<Navigation size={17} class={locatingUser ? 'animate-spin' : ''} />
		</button>

		<button 
			type="button" 
			class="map-ctrl-btn" 
			onclick={fitAllJobs}
			title="Fit All Jobs in View"
		>
			<Maximize2 size={17} />
		</button>

		<button 
			type="button" 
			class="map-ctrl-btn {currentLayer === 'satellite' ? 'active' : ''}" 
			onclick={toggleMapLayer}
			title="Toggle Satellite / Streets"
		>
			<Layers size={17} />
		</button>

		<div class="map-ctrl-divider"></div>

		<button 
			type="button" 
			class="map-ctrl-btn" 
			onclick={zoomIn}
			title="Zoom In"
		>
			<ZoomIn size={17} />
		</button>

		<button 
			type="button" 
			class="map-ctrl-btn" 
			onclick={zoomOut}
			title="Zoom Out"
		>
			<ZoomOut size={17} />
		</button>
	</div>

	<!-- Bottom Selected Job Card Popup -->
	{#if selectedJob}
		<div class="map-selected-job-card">
			<button 
				type="button" 
				class="map-card-close-btn"
				onclick={() => { selectedJob = null; updateMarkers(); }}
				aria-label="Close card"
			>
				<X size={16} />
			</button>

			<div class="map-card-header">
				<span class="badge {getCategoryBadge(selectedJob.category)}">{selectedJob.category}</span>
				<div class="map-card-budget">
					₱{Number(selectedJob.budget || 0).toLocaleString()}
				</div>
			</div>

			<h4 class="map-card-title">{selectedJob.title}</h4>
			<p class="map-card-desc">{selectedJob.description}</p>

			<div class="map-card-meta">
				<div class="map-card-meta-item">
					<MapPin size={13} style="color: #38bdf8;" />
					<span>{selectedJob.location}</span>
				</div>
				<div class="map-card-meta-item">
					<Calendar size={13} style="color: #a78bfa;" />
					<span>
						{new Date(selectedJob.target_date || selectedJob.created_at).toLocaleDateString('en-PH', {
							month: 'short',
							day: 'numeric'
						})}
					</span>
				</div>
			</div>

			<div class="map-card-actions">
				<button 
					type="button" 
					class="map-card-icon-action {savedJobs.isSaved(selectedJob.id) ? 'saved' : ''}"
					onclick={() => savedJobs.toggle(selectedJob)}
					title={savedJobs.isSaved(selectedJob.id) ? 'Saved' : 'Save Job'}
				>
					<Bookmark size={15} style={savedJobs.isSaved(selectedJob.id) ? 'fill: currentColor;' : ''} />
				</button>

				<button 
					type="button" 
					class="map-card-icon-action"
					onclick={() => onopenshare(selectedJob)}
					title="Share Job"
				>
					<Share2 size={15} />
				</button>

				<button 
					type="button" 
					class="btn btn-primary map-card-apply-btn"
					onclick={() => onopenchat(selectedJob.id, selectedJob.customer_id)}
				>
					<MessageSquare size={14} />
					<span>Apply / Chat Client</span>
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.job-feed-map-wrapper {
		position: relative;
		width: 100%;
		height: 620px;
		border-radius: var(--radius-lg, 16px);
		overflow: hidden;
		border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
		box-shadow: var(--shadow-md, 0 8px 24px rgba(0, 0, 0, 0.25));
		background: var(--bg-card, #0f172a);
	}

	@media (max-width: 640px) {
		.job-feed-map-wrapper {
			height: calc(100vh - 210px);
			min-height: 480px;
			border-radius: 12px;
		}
	}

	.job-feed-map-canvas {
		width: 100%;
		height: 100%;
		z-index: 1;
	}

	.map-top-status-bar {
		position: absolute;
		top: 14px;
		left: 14px;
		z-index: 990;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		pointer-events: none;
	}

	.map-status-badge {
		pointer-events: auto;
		background: var(--bg-card, #1e293b);
		border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
		border-radius: var(--radius-sm, 4px);
		padding: 0.35rem 0.65rem;
		font-size: 0.76rem;
		color: var(--text-primary, #ffffff);
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.3));
		text-transform: none;
		letter-spacing: normal;
		font-weight: 500;
	}

	.map-status-badge.badge-warning {
		background: var(--warning-light, rgba(245, 158, 11, 0.15));
		border-color: rgba(245, 158, 11, 0.4);
		color: var(--warning, #f59e0b);
	}

	.map-controls-group {
		position: absolute;
		top: 14px;
		right: 14px;
		z-index: 990;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		background: var(--bg-card, #1e293b);
		border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
		border-radius: var(--radius-md, 6px);
		padding: 0.35rem;
		box-shadow: var(--shadow-md, 0 4px 16px rgba(0, 0, 0, 0.35));
	}

	.map-ctrl-btn {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm, 4px);
		background: transparent;
		border: none;
		color: var(--text-secondary, #cbd5e1);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.map-ctrl-btn:hover {
		color: var(--accent, #6366f1);
		background: var(--accent-light, rgba(99, 102, 241, 0.12));
	}

	.map-ctrl-btn.active {
		background: var(--accent, #6366f1);
		color: #ffffff;
	}

	.map-ctrl-divider {
		height: 1px;
		background: var(--border-color, rgba(255, 255, 255, 0.1));
		margin: 0.15rem 0.3rem;
	}

	.map-selected-job-card {
		position: absolute;
		bottom: 16px;
		left: 16px;
		right: 16px;
		max-width: 440px;
		z-index: 995;
		background: var(--bg-card, #1e293b);
		border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
		border-radius: var(--radius-md, 6px);
		padding: 1.15rem;
		box-shadow: var(--shadow-lg, 0 16px 36px rgba(0, 0, 0, 0.5));
		animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	@keyframes slideUp {
		from { transform: translateY(15px); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}

	@keyframes pulseMarker {
		0% { transform: scale(0.95); opacity: 0.8; }
		50% { transform: scale(1.6); opacity: 0; }
		100% { transform: scale(0.95); opacity: 0; }
	}

	.map-card-close-btn {
		position: absolute;
		top: 10px;
		right: 10px;
		background: transparent;
		border: none;
		color: var(--text-muted, #94a3b8);
		cursor: pointer;
		padding: 0.3rem;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
	}

	.map-card-close-btn:hover {
		color: var(--text-primary, #ffffff);
		background: var(--bg-input, rgba(255, 255, 255, 0.1));
	}

	.map-card-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding-right: 1.5rem;
	}

	.map-card-budget {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text-primary, #ffffff);
		margin-left: auto;
	}

	.map-card-title {
		font-size: 0.98rem;
		font-weight: 600;
		margin: 0;
		color: var(--text-primary, #ffffff);
		line-height: 1.35;
	}

	.map-card-desc {
		font-size: 0.8rem;
		color: var(--text-secondary, #94a3b8);
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		line-height: 1.4;
	}

	.map-card-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		font-size: 0.76rem;
		color: var(--text-secondary, #94a3b8);
	}

	.map-card-meta-item {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}

	.map-card-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.4rem;
		padding-top: 0.6rem;
		border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
	}

	.map-card-icon-action {
		width: 34px;
		height: 34px;
		border-radius: 8px;
		background: var(--bg-input, rgba(255, 255, 255, 0.06));
		border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
		color: var(--text-secondary, #94a3b8);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.map-card-icon-action:hover {
		color: var(--accent, #6366f1);
		border-color: var(--accent, #6366f1);
		background: var(--accent-light, rgba(99, 102, 241, 0.12));
	}

	.map-card-icon-action.saved {
		background: var(--warning-light, hsla(38, 92%, 50%, 0.15));
		border-color: var(--warning, hsl(38, 92%, 50%));
		color: var(--warning, hsl(38, 92%, 50%));
	}

	.map-card-icon-action.saved:hover {
		background: var(--warning-light, hsla(38, 92%, 50%, 0.25));
		border-color: var(--warning, hsl(38, 92%, 50%));
		color: var(--warning, hsl(38, 92%, 50%));
	}

	.map-card-apply-btn {
		flex: 1;
		padding: 0.45rem 0.9rem;
		font-size: 0.82rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
	}
</style>
