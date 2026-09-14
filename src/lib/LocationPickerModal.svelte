<script>
	import { onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { getCurrentCoordinates, reverseGeocode, forwardGeocode, getGoogleMapsUrl } from '$lib/gpsUtils.js';
	import { resolvePhilippineCity } from '$lib/philippinesLocations.js';
	import { MapPin, Search, Navigation, Check, X, ExternalLink, AlertCircle } from 'lucide-svelte';

	/**
	 * @type {{
	 *  show?: boolean,
	 *  initialLat?: string|number,
	 *  initialLng?: string|number,
	 *  initialAddress?: string,
	 *  title?: string,
	 *  onSave?: (loc: { latitude: string, longitude: string, address: string, city: string }) => void,
	 *  onClose?: () => void
	 * }}
	 */
	let { 
		show = $bindable(false), 
		initialLat = '', 
		initialLng = '', 
		initialAddress = '', 
		title = 'Pin Custom Location', 
		onSave = () => {}, 
		onClose = () => {} 
	} = $props();

	// Search and status state
	let searchQuery = $state('');
	let searching = $state(false);
	let searchResults = $state([]);
	let searchError = $state('');
	
	// Coordinates & address
	// svelte-ignore state_referenced_locally
	let lat = $state(initialLat ? String(initialLat) : '14.599512');
	// svelte-ignore state_referenced_locally
	let lng = $state(initialLng ? String(initialLng) : '120.984222');
	// svelte-ignore state_referenced_locally
	let addressLabel = $state(initialAddress || '');
	let selectedCity = $state('');
	let detectingGps = $state(false);

	$effect(() => {
		if (show) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	});

	// Leaflet map references
	let mapContainer = $state(null);
	let mapInstance = null;
	let markerInstance = null;
	let leafletLib = null;

	function createGreenPinIcon(L) {
		return L.divIcon({
			className: 'serviee-leaflet-green-pin',
			html: `
				<div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -100%);">
					<div style="
						width: 36px;
						height: 36px;
						background: #10b981;
						border: 2.5px solid #ffffff;
						border-radius: 50% 50% 50% 0;
						transform: rotate(-45deg);
						display: flex;
						align-items: center;
						justify-content: center;
						box-shadow: 0 4px 14px rgba(16, 185, 129, 0.6), 0 2px 6px rgba(0,0,0,0.35);
					">
						<svg style="transform: rotate(45deg); width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/>
							<circle cx="12" cy="10" r="3"/>
						</svg>
					</div>
					<div style="
						position: absolute;
						bottom: -3px;
						left: 50%;
						transform: translateX(-50%);
						width: 12px;
						height: 4px;
						background: rgba(0,0,0,0.4);
						border-radius: 50%;
						filter: blur(1px);
					"></div>
				</div>
			`,
			iconSize: [0, 0],
			iconAnchor: [0, 0]
		});
	}

	async function initOrUpdateMap() {
		if (!browser || !mapContainer) return;

		try {
			if (!leafletLib) {
				const mod = await import('leaflet');
				leafletLib = mod.default || mod;
			}
			const L = leafletLib;

			const currentLat = parseFloat(lat) || 14.599512;
			const currentLng = parseFloat(lng) || 120.984222;

			if (!mapInstance) {
				mapInstance = L.map(mapContainer, {
					center: [currentLat, currentLng],
					zoom: 15,
					zoomControl: false
				});

				L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					maxZoom: 19,
					attribution: '© OpenStreetMap contributors'
				}).addTo(mapInstance);

				const icon = createGreenPinIcon(L);
				markerInstance = L.marker([currentLat, currentLng], {
					icon,
					draggable: true,
					title: 'Drag me to place exact pin'
				}).addTo(mapInstance);

				// Marker Drag End Listener
				markerInstance.on('dragend', (e) => {
					const pos = e.target.getLatLng();
					updatePosition(pos.lat, pos.lng, false);
				});

				// Click Anywhere on Map Listener -> Moves Green Pin
				mapInstance.on('click', (e) => {
					const pos = e.latlng;
					if (markerInstance) {
						markerInstance.setLatLng(pos);
					}
					updatePosition(pos.lat, pos.lng, false);
				});
			} else {
				if (markerInstance) {
					markerInstance.setLatLng([currentLat, currentLng]);
				}
				mapInstance.setView([currentLat, currentLng], mapInstance.getZoom() || 15);
			}

			// Invalidate size to calculate correct dimensions inside modal
			setTimeout(() => {
				if (mapInstance) {
					mapInstance.invalidateSize();
				}
			}, 200);
		} catch (err) {
			console.error('Failed to initialize Leaflet map:', err);
		}
	}

	function destroyMap() {
		if (mapInstance) {
			mapInstance.remove();
			mapInstance = null;
			markerInstance = null;
		}
	}

	onDestroy(() => {
		destroyMap();
	});

	let prevShow = false;
	$effect(() => {
		if (show && !prevShow) {
			lat = initialLat ? String(initialLat) : (lat || '14.599512');
			lng = initialLng ? String(initialLng) : (lng || '120.984222');
			addressLabel = initialAddress || '';
			searchQuery = '';
			searchResults = [];
			searchError = '';

			setTimeout(() => {
				initOrUpdateMap();
			}, 50);
		} else if (!show && prevShow) {
			destroyMap();
		}
		prevShow = show;
	});

	async function updatePosition(newLat, newLng, fly = true) {
		lat = Number(newLat).toFixed(6);
		lng = Number(newLng).toFixed(6);

		if (markerInstance) {
			markerInstance.setLatLng([parseFloat(lat), parseFloat(lng)]);
		}

		if (fly && mapInstance) {
			mapInstance.flyTo([parseFloat(lat), parseFloat(lng)], 16, { duration: 1 });
		}

		try {
			const geo = await reverseGeocode(parseFloat(lat), parseFloat(lng));
			if (geo.displayName) addressLabel = geo.displayName;
			selectedCity = geo.city || '';
		} catch (e) {
			console.warn('Geocoding error:', e);
		}
	}

	async function handleSearch(e) {
		if (e) e.preventDefault();
		const trimmed = searchQuery.trim();
		if (!trimmed) return;

		searching = true;
		searchError = '';
		searchResults = [];
		try {
			const results = await forwardGeocode(trimmed);
			if (results.length === 0) {
				searchError = 'No locations found for this query. Try adding city or barangay.';
			} else {
				searchResults = results;
			}
		} catch (err) {
			searchError = err.message || 'Search failed. Please try again.';
		} finally {
			searching = false;
		}
	}

	function selectSearchResult(result) {
		searchResults = [];
		searchQuery = '';
		updatePosition(result.lat, result.lng, true);
		if (result.city) {
			selectedCity = result.city;
		}
	}

	async function handleDetectCurrentGps() {
		detectingGps = true;
		searchError = '';
		try {
			const coords = await getCurrentCoordinates();
			await updatePosition(coords.latitude, coords.longitude, true);
		} catch (err) {
			searchError = err.message || 'Failed to detect current GPS.';
		} finally {
			detectingGps = false;
		}
	}

	function handleManualCoordsChange() {
		const parsedLat = parseFloat(lat);
		const parsedLng = parseFloat(lng);
		if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
			updatePosition(parsedLat, parsedLng, true);
		}
	}

	function saveLocation(e) {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}

		const parsedLat = parseFloat(lat);
		const parsedLng = parseFloat(lng);
		if (isNaN(parsedLat) || isNaN(parsedLng)) {
			searchError = 'Please enter valid coordinates.';
			return;
		}

		let rawCityCandidate = selectedCity || addressLabel || '';
		let resolved = resolvePhilippineCity(rawCityCandidate);
		let cityToSave = resolved.isOfficial ? resolved.city : (selectedCity || addressLabel || '');

		const payload = {
			latitude: lat,
			longitude: lng,
			address: addressLabel || `${lat}, ${lng}`,
			city: cityToSave || ''
		};

		if (onSave) {
			onSave(payload);
		}
		
		show = false;
		if (onClose) {
			onClose();
		}
	}

	function handleClose() {
		show = false;
		if (onClose) {
			onClose();
		}
	}
</script>

{#if show}
	<div 
		class="modal-backdrop" 
		style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px); z-index: 999999; display: flex; align-items: center; justify-content: center; padding: 1rem;"
		role="dialog"
		aria-modal="true"
		onclick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
		onkeydown={(e) => { if (e.key === 'Escape') handleClose(); }}
		tabindex="-1"
	>
		<div 
			class="card modal-content" 
			style="width: 100%; max-width: 620px; max-height: 90vh; overflow-y: auto; position: relative; padding: 1.5rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);"
		>
			<!-- Header -->
			<div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.85rem; margin-bottom: 1.25rem;">
				<div style="display: flex; align-items: center; gap: 0.5rem;">
					<div style="background: hsla(142, 70%, 45%, 0.2); padding: 0.4rem; border-radius: var(--radius-md); color: var(--success);">
						<MapPin size={20} />
					</div>
					<div>
						<h3 style="font-size: 1.2rem; margin: 0; color: var(--text-primary);">{title}</h3>
						<span style="font-size: 0.78rem; color: var(--text-muted);">Click anywhere on map or drag the green pin to set location</span>
					</div>
				</div>

				<button 
					type="button" 
					class="btn btn-outline" 
					style="padding: 0.35rem 0.6rem; border: none; color: var(--text-muted);"
					onclick={handleClose}
					aria-label="Close modal"
				>
					<X size={18} />
				</button>
			</div>

			<!-- Search Bar -->
			<div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem;">
				<form onsubmit={handleSearch} style="display: flex; gap: 0.5rem;">
					<div style="position: relative; flex: 1;">
						<input 
							type="text" 
							placeholder="Search place, landmark, subdivision or street (e.g. SM Megamall, BF Homes, Novaliches)..." 
							bind:value={searchQuery}
							style="width: 100%; padding: 0.65rem 1rem 0.65rem 2.2rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary); font-size: 0.85rem;"
						/>
						<Search size={14} style="position: absolute; left: 0.8rem; top: 50%; transform: translateY(-50%); color: var(--text-muted);" />
					</div>
					<button 
						type="submit" 
						class="btn btn-primary" 
						style="padding: 0.65rem 1.2rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;"
						disabled={searching || !searchQuery.trim()}
					>
						{#if searching}
							<span class="spinner spinner-sm"></span>
						{:else}
							Search
						{/if}
					</button>
				</form>

				{#if searchError}
					<div style="display: flex; align-items: center; gap: 0.4rem; color: var(--error); font-size: 0.8rem; background: var(--error-light); padding: 0.4rem 0.75rem; border-radius: var(--radius-sm);">
						<AlertCircle size={14} />
						<span>{searchError}</span>
					</div>
				{/if}

				{#if searchResults.length > 0}
					<div style="background: var(--bg-base); border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; max-height: 180px; overflow-y: auto;">
						<div style="padding: 0.4rem 0.75rem; font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; background: var(--bg-card);">
							Search Results (Click to pin)
						</div>
						{#each searchResults as item}
							<button 
								type="button" 
								style="width: 100%; text-align: left; padding: 0.5rem 0.75rem; border: none; border-bottom: 1px solid var(--border-color); background: transparent; color: var(--text-primary); cursor: pointer; display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.82rem;"
								onclick={() => selectSearchResult(item)}
								onmouseenter={(e) => e.currentTarget.style.background = 'hsla(252, 78%, 62%, 0.1)'}
								onmouseleave={(e) => e.currentTarget.style.background = 'transparent'}
							>
								<MapPin size={14} color="var(--accent)" style="flex-shrink: 0; margin-top: 0.15rem;" />
								<div>
									<div style="font-weight: 500;">{item.displayName}</div>
									<div style="font-size: 0.7rem; color: var(--text-muted);">({item.lat.toFixed(5)}, {item.lng.toFixed(5)})</div>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Interactive Leaflet Map Container -->
			<div style="margin-bottom: 1rem; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border-color); background: #0c0f17; position: relative;">
				<!-- Top Bar with Coordinates & Google Maps link -->
				<div style="display: flex; align-items: center; justify-content: space-between; padding: 0.45rem 0.75rem; background: var(--bg-card); border-bottom: 1px solid var(--border-color); font-size: 0.78rem;">
					<div style="display: flex; align-items: center; gap: 0.4rem; color: var(--success); font-weight: 600;">
						<MapPin size={14} /> Pinned Pin: {lat}, {lng}
					</div>
					<a 
						href={getGoogleMapsUrl(lat, lng)} 
						class="btn btn-outline" 
						style="padding: 0.15rem 0.5rem; font-size: 0.72rem; border-color: var(--accent); color: var(--accent-hover);"
					>
						<ExternalLink size={11} /> Google Maps
					</a>
				</div>

				<!-- Map Div & Floating Instruction Badge -->
				<div style="position: relative; width: 100%; height: 280px; overflow: hidden; background: #e5e7eb;">
					<!-- Leaflet Map Mount Node -->
					<div 
						bind:this={mapContainer} 
						style="width: 100%; height: 100%; z-index: 1;"
					></div>

					<!-- Floating Interaction Instruction Pill -->
					<div class="map-floating-hint">
						<MapPin size={13} color="#10b981" style="flex-shrink: 0;" />
						<span>Click map or drag green pin to move location</span>
					</div>

					<!-- Floating "Detect My Location" button -->
					<div style="position: absolute; bottom: 12px; right: 12px; z-index: 999;">
						<button 
							type="button" 
							class="btn btn-secondary" 
							style="padding: 0.4rem 0.85rem; font-size: 0.78rem; font-weight: 600; background: rgba(15, 23, 42, 0.9); color: #fff; border: 1px solid rgba(255, 255, 255, 0.2); backdrop-filter: blur(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: inline-flex; align-items: center; gap: 0.4rem; border-radius: var(--radius-full);"
							onclick={handleDetectCurrentGps}
							disabled={detectingGps}
							title="Detect my current location"
						>
							{#if detectingGps}
								<span class="spinner spinner-sm"></span>
								<span>Detecting...</span>
							{:else}
								<Navigation size={13} color="var(--accent, #6366f1)" />
								<span>Detect my location</span>
							{/if}
						</button>
					</div>
				</div>
			</div>

			<!-- Coordinate & Landmark Form Inputs -->
			<div class="form-grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
				<div class="form-group" style="margin-bottom: 0;">
					<label for="custom-pin-lat" style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.2rem; display: block;">Latitude</label>
					<input 
						type="text" 
						id="custom-pin-lat"
						bind:value={lat} 
						onblur={handleManualCoordsChange}
						placeholder="14.599512" 
						style="width: 100%; padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary); font-size: 0.85rem;"
					/>
				</div>
				<div class="form-group" style="margin-bottom: 0;">
					<label for="custom-pin-lng" style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.2rem; display: block;">Longitude</label>
					<input 
						type="text" 
						id="custom-pin-lng"
						bind:value={lng} 
						onblur={handleManualCoordsChange}
						placeholder="120.984222" 
						style="width: 100%; padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary); font-size: 0.85rem;"
					/>
				</div>
			</div>

			<div class="form-group" style="margin-bottom: 1.25rem;">
				<label for="custom-pin-label" style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.2rem; display: block;">Location / Friend's Place Name / Address</label>
				<input 
					type="text" 
					id="custom-pin-label"
					bind:value={addressLabel} 
					placeholder="E.g. Friend's House (Phase 2, Blk 4 Lot 10, Greenwoods Exec. Village)" 
					style="width: 100%; padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary); font-size: 0.85rem;"
				/>
			</div>

			<!-- Footer Actions -->
			<div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
				<button type="button" class="btn btn-secondary" onclick={handleClose} style="padding: 0.55rem 1.2rem; font-size: 0.85rem;">
					Cancel
				</button>
				<button 
					type="button" 
					class="btn btn-primary" 
					onclick={saveLocation} 
					style="padding: 0.55rem 1.25rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.4rem;"
				>
					<Check size={16} /> Confirm
				</button>
			</div>
		</div>
	</div>
{/if}
