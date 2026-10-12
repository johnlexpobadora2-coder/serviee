<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
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
		applyingJobId = $bindable(null),
		userRole = 'worker',
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

			// Render all job pins on init
			updateMarkers(true);

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

	function updateMarkers(fit = false) {
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
				updateMarkers(false); // Refresh selected highlight without moving or panning map
			});

			markersLayerGroup.addLayer(marker);
			bounds.extend([lat, lng]);
		});

		if (fit && mappedJobs.length > 0 && bounds.isValid()) {
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

<div class="relative w-full h-155 max-sm:h-[calc(100vh-210px)] max-sm:min-h-120 rounded-2xl max-sm:rounded-xl overflow-hidden border border-(--border-color) shadow-(--shadow-sm) bg-(--bg-card)">
	<!-- Leaflet Map Container -->
	<div bind:this={mapContainer} class="w-full h-full z-1"></div>

	<!-- Top Info / Banner Status -->
	<div class="absolute top-3.5 left-3.5 z-990 flex items-center gap-2 flex-wrap pointer-events-none">
		<span class="pointer-events-auto bg-(--bg-card) border border-(--border-color) rounded-sm py-1.5 px-2.5 text-[0.76rem] text-(--text-primary) inline-flex items-center gap-1.5 shadow-(--shadow-sm) font-medium normal-case tracking-normal">
			<MapPin size={12} class="text-(--success)" />
			<span><strong>{mappedJobs.length}</strong> Pinned Jobs</span>
		</span>

		{#if unmappedCount > 0}
			<span class="pointer-events-auto bg-(--warning-light) border border-amber-500/40 rounded-sm py-1.5 px-2.5 text-[0.76rem] text-(--warning) inline-flex items-center gap-1.5 shadow-(--shadow-sm) font-medium normal-case tracking-normal" title="{unmappedCount} jobs without GPS coordinates">
				<AlertCircle size={12} />
				<span>{unmappedCount} Unpinned</span>
			</span>
		{/if}
	</div>

	<!-- Floating Controls (Right) -->
	<div class="absolute top-3.5 right-3.5 z-990 flex flex-col gap-1.5 bg-(--bg-card) border border-(--border-color) rounded-md p-1.5 shadow-(--shadow-sm)">
		<button 
			type="button" 
			class="w-8 h-8 rounded-sm flex items-center justify-center cursor-pointer transition-all duration-150 {locatingUser ? 'bg-(--accent) text-white' : 'bg-transparent text-(--text-secondary) hover:text-(--accent) hover:bg-(--accent-light)'}" 
			onclick={() => locateUser(true)}
			title="Locate My Position"
		>
			<Navigation size={17} class={locatingUser ? 'animate-spin' : ''} />
		</button>

		<button 
			type="button" 
			class="w-8 h-8 rounded-sm bg-transparent text-(--text-secondary) hover:text-(--accent) hover:bg-(--accent-light) flex items-center justify-center cursor-pointer transition-all duration-150" 
			onclick={fitAllJobs}
			title="Fit All Jobs in View"
		>
			<Maximize2 size={17} />
		</button>

		<button 
			type="button" 
			class="w-8 h-8 rounded-sm flex items-center justify-center cursor-pointer transition-all duration-150 {currentLayer === 'satellite' ? 'bg-(--accent) text-white' : 'bg-transparent text-(--text-secondary) hover:text-(--accent) hover:bg-(--accent-light)'}" 
			onclick={toggleMapLayer}
			title="Toggle Satellite / Streets"
		>
			<Layers size={17} />
		</button>

		<div class="h-px bg-(--border-color) my-0.5 mx-1"></div>

		<button 
			type="button" 
			class="w-8 h-8 rounded-sm bg-transparent text-(--text-secondary) hover:text-(--accent) hover:bg-(--accent-light) flex items-center justify-center cursor-pointer transition-all duration-150" 
			onclick={zoomIn}
			title="Zoom In"
		>
			<ZoomIn size={17} />
		</button>

		<button 
			type="button" 
			class="w-8 h-8 rounded-sm bg-transparent text-(--text-secondary) hover:text-(--accent) hover:bg-(--accent-light) flex items-center justify-center cursor-pointer transition-all duration-150" 
			onclick={zoomOut}
			title="Zoom Out"
		>
			<ZoomOut size={17} />
		</button>
	</div>

	<!-- Bottom Selected Job Card Popup -->
	{#if selectedJob}
		<div class="absolute bottom-4 left-4 right-4 max-w-110 z-995 bg-(--bg-card) border border-(--border-color) rounded-md p-[1.15rem] shadow-(--shadow-lg) flex flex-col gap-2 animate-[slideUp_0.25s_cubic-bezier(0.16,1,0.3,1)]">
			<button 
				type="button" 
				class="absolute top-2.5 right-2.5 bg-transparent border-none text-(--text-muted) cursor-pointer p-1.5 rounded-md flex items-center justify-center transition-all duration-150 hover:text-(--text-primary) hover:bg-(--bg-input)"
				onclick={() => { selectedJob = null; updateMarkers(); }}
				aria-label="Close card"
			>
				<X size={16} />
			</button>

			<div class="flex items-center gap-2 pr-6">
				<span class="badge {getCategoryBadge(selectedJob.category)}">{selectedJob.category}</span>
				<div class="text-[1.1rem] font-bold text-(--text-primary) ml-auto">
					₱{Number(selectedJob.budget || 0).toLocaleString()}
				</div>
			</div>

			<h4 class="text-[0.98rem] font-semibold m-0 text-(--text-primary) leading-[1.35]">{selectedJob.title}</h4>
			<p class="text-[0.8rem] text-(--text-secondary) m-0 line-clamp-2 leading-[1.4]">{selectedJob.description}</p>

			<div class="flex flex-wrap gap-3 text-[0.76rem] text-(--text-secondary)">
				<div class="inline-flex items-center gap-1.5">
					<MapPin size={13} class="text-sky-400" />
					<span>{selectedJob.location}</span>
				</div>
				<div class="inline-flex items-center gap-1.5">
					<Calendar size={13} class="text-violet-400" />
					<span>
						{new Date(selectedJob.target_date || selectedJob.created_at).toLocaleDateString('en-PH', {
							month: 'short',
							day: 'numeric'
						})}
					</span>
				</div>
			</div>

			<div class="flex items-center gap-2 mt-1.5 pt-2.5 border-t border-(--border-color)">
				<button 
					type="button" 
					class="w-8.5 h-8.5 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 border {savedJobs.isSaved(selectedJob.id) ? 'bg-(--accent-light) border-(--accent) text-(--accent) hover:bg-(--accent)/25' : 'bg-(--bg-input) border-(--border-color) text-(--text-secondary) hover:text-(--accent) hover:border-(--accent) hover:bg-(--accent-light)'}"
					onclick={() => savedJobs.toggle(selectedJob)}
					title={savedJobs.isSaved(selectedJob.id) ? 'Saved' : 'Save Job'}
				>
					<Bookmark size={15} style={savedJobs.isSaved(selectedJob.id) ? 'fill: currentColor;' : ''} />
				</button>

				<button 
					type="button" 
					class="w-8.5 h-8.5 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 border bg-(--bg-input) border-(--border-color) text-(--text-secondary) hover:text-(--accent) hover:border-(--accent) hover:bg-(--accent-light)"
					onclick={() => onopenshare(selectedJob)}
					title="Share Job"
				>
					<Share2 size={15} />
				</button>

				{#if userRole === 'worker'}
					{#if (jobs.find(j => j.id === selectedJob.id)?.hasApplied || selectedJob.hasApplied)}
						<button
							type="button"
							class="btn btn-outline flex-1 py-2 px-3.5 text-[0.82rem] border-(--accent) text-(--accent-hover) inline-flex items-center justify-center gap-1.5"
							onclick={() => onopenchat(selectedJob.id, selectedJob.customer_id)}
						>
							<MessageSquare size={14} />
							<span>Open Chat</span>
						</button>
					{:else}
						<form
							method="POST"
							action="?/inquireJob"
							use:enhance={() => {
								applyingJobId = selectedJob.id;
								const initMsg = `Hello! Inquiring po ako sa sideline job na ito: ${selectedJob.title}.`;
								return async ({ update, result }) => {
									applyingJobId = null;
									await update();
									const sentMessage = result?.type === 'success' && result?.data ? result.data.sentMessage : null;
									onopenchat(selectedJob.id, selectedJob.customer_id, {
										initialMessage: initMsg,
										sentMessage,
										jobTitle: selectedJob.title,
										customerName: selectedJob.customerName
									});
								};
							}}
							class="inline-flex flex-1"
						>
							<input type="hidden" name="jobId" value={selectedJob.id} />
							<input type="hidden" name="customerId" value={selectedJob.customer_id} />
							<input type="hidden" name="initialMessage" value="Hello! Inquiring po ako sa sideline job na ito: {selectedJob.title}." />
							<button
								type="submit"
								class="btn btn-primary flex-1 w-full py-2 px-3.5 text-[0.82rem] inline-flex items-center justify-center gap-1.5"
								disabled={applyingJobId === selectedJob.id}
								id="map-inquire-btn-{selectedJob.id}"
							>
								{#if applyingJobId === selectedJob.id}
									<span class="spinner spinner-sm"></span>
									<span>Connecting...</span>
								{:else}
									<MessageSquare size={14} />
									<span>Apply / Chat Client</span>
								{/if}
							</button>
						</form>
					{/if}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	@keyframes slideUp {
		from { transform: translateY(15px); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}

	@keyframes pulseMarker {
		0% { transform: scale(0.95); opacity: 0.8; }
		50% { transform: scale(1.6); opacity: 0; }
		100% { transform: scale(0.95); opacity: 0; }
	}
</style>
