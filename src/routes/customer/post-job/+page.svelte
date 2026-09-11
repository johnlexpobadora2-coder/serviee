<script>
	import { enhance } from '$app/forms';
	import { getCurrentCoordinates, reverseGeocode, getGoogleMapsUrl, getEmbedMapUrl } from '$lib/gpsUtils.js';
	import LocationPickerModal from '$lib/LocationPickerModal.svelte';
	import CityAutocomplete from '$lib/CityAutocomplete.svelte';
	import { MapPin, Navigation, ExternalLink, Check, AlertCircle, RefreshCw, Compass } from 'lucide-svelte';

	let { form } = $props();
	let loading = $state(false);
	let clientError = $state('');

	// GPS States
	let detectingGps = $state(false);
	let gpsError = $state('');
	// svelte-ignore state_referenced_locally
	let selectedLocation = $state(form?.location ?? '');
	let isLocationValid = $state(false);
	// svelte-ignore state_referenced_locally
	let latitude = $state(form?.latitude ?? '');
	// svelte-ignore state_referenced_locally
	let longitude = $state(form?.longitude ?? '');
	let gpsAccuracy = $state(null);
	let detectedAddressLabel = $state('');
	let showMapPreview = $state(false);
	let showPickerModal = $state(false);

	$effect(() => {
		if (form?.location) {
			selectedLocation = form.location;
			isLocationValid = true;
		}
	});

	async function handleDetectGps() {
		detectingGps = true;
		gpsError = '';
		clientError = '';
		try {
			const coords = await getCurrentCoordinates();
			latitude = coords.latitude.toFixed(6);
			longitude = coords.longitude.toFixed(6);
			gpsAccuracy = coords.accuracy ? Math.round(coords.accuracy) : null;

			// Reverse geocode to detect city / municipality automatically
			const geo = await reverseGeocode(coords.latitude, coords.longitude);
			if (geo.displayName) {
				detectedAddressLabel = geo.displayName;
			}

			if (geo.city) {
				selectedLocation = geo.city;
				isLocationValid = true;
			}
			showMapPreview = true;
		} catch (err) {
			gpsError = err.message || 'Could not get GPS location. Please check your browser permission.';
		} finally {
			detectingGps = false;
		}
	}

	function handleCustomLocationSaved(result) {
		latitude = result.latitude;
		longitude = result.longitude;
		detectedAddressLabel = result.address || `${result.latitude}, ${result.longitude}`;
		gpsAccuracy = null;
		clientError = '';
		if (result.city) {
			selectedLocation = result.city;
			isLocationValid = true;
		}
		showMapPreview = true;
	}

	function clearGps() {
		latitude = '';
		longitude = '';
		gpsAccuracy = null;
		detectedAddressLabel = '';
		showMapPreview = false;
	}
</script>

<svelte:head>
	<title>Post a New Job | Serviee</title>
</svelte:head>

<div class="post-job-container" style="max-width: 680px; margin: 1.5rem auto; width: 100%;">
	<div style="margin-bottom: 1rem;">
		<a href="/customer" class="btn btn-outline" style="display: inline-flex; align-items: center; gap: 0.35rem; width: auto; font-size: 0.85rem; padding: 0.4rem 0.85rem;">
			&larr; Back to Dashboard
		</a>
	</div>

	<div class="card post-job-card" style="padding: 1.5rem;">
		<h2 class="post-job-heading" style="font-size: 1.45rem; margin-bottom: 0.25rem;">Post a New Job</h2>
		<p class="post-job-subtext" style="color: var(--text-secondary); margin-bottom: 1.25rem; font-size: 0.85rem;">
			Describe the service you need with accurate location & GPS coordinates so nearby workers can locate you easily.
		</p>

		{#if form?.error || clientError}
			<div style="background-color: var(--error-light); border: 1px solid var(--error); color: var(--text-primary); padding: 0.75rem 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; font-size: 0.85rem;">
				{form?.error || clientError}
			</div>
		{/if}

		<form method="POST" use:enhance={({ cancel }) => {
			clientError = '';
			if (!selectedLocation || !isLocationValid) {
				clientError = 'Please search and select a valid City or Municipality from the suggestions, or use Auto GPS / Pin Location.';
				cancel();
				return;
			}
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update();
			};
		}}>
			<!-- Hidden GPS Coordinates inputs -->
			<input type="hidden" name="latitude" value={latitude} />
			<input type="hidden" name="longitude" value={longitude} />

			<div class="form-group">
				<label for="title">Job Title</label>
				<input 
					type="text" 
					id="title" 
					name="title" 
					placeholder="E.g. Leaking Bathroom Pipe Repair" 
					value={form?.title ?? ''} 
					required 
				/>
			</div>

			<div class="form-grid-2">
				<div class="form-group">
					<label for="category">Category</label>
					<select id="category" name="category" required value={form?.category ?? ''}>
						<option value="" disabled selected>Select category...</option>
						<option value="Plumbing / Tubero">Plumbing / Tubero</option>
						<option value="Roofing / Ayos Yero">Roofing / Ayos Yero</option>
						<option value="Excavation / Hukay Lupa">Excavation / Hukay Lupa</option>
						<option value="Gardening">Gardening / Landscape</option>
						<option value="Carpentry">Carpentry / Karpintero</option>
						<option value="General Manual Labor">General Manual Labor</option>
						<option value="Others">Others</option>
					</select>
				</div>

				<div class="form-group">
					<label for="location">City / Municipality</label>
					<CityAutocomplete 
						bind:value={selectedLocation}
						bind:isValid={isLocationValid}
						name="location"
						id="location"
						placeholder="Search city/municipality (e.g. Davao City, Cebu City, Makati)..."
						required={true}
					/>
				</div>
			</div>

			<!-- GPS & Google Maps Location Picker Section -->
			<div class="gps-picker-box" style="margin-bottom: 1.25rem; padding: 1rem; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
				<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
					<div style="display: flex; align-items: center; gap: 0.4rem; font-weight: 600; font-size: 0.9rem; color: var(--text-primary);">
						<MapPin size={16} color="var(--accent)" />
						GPS Coordinates & Google Maps
						<span style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;">(Optional but Recommended)</span>
					</div>

					<div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
						{#if latitude && longitude}
							<button 
								type="button" 
								class="btn btn-outline" 
								style="padding: 0.3rem 0.6rem; font-size: 0.75rem; border-color: var(--border-color);"
								onclick={clearGps}
							>
								Clear
							</button>
						{/if}
						<button 
							type="button" 
							class="btn btn-outline" 
							style="padding: 0.35rem 0.75rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.35rem; border-color: var(--accent); color: var(--accent-hover);"
							onclick={() => showPickerModal = true}
							id="btn-custom-pin"
						>
							<MapPin size={14} /> Pin / Custom Location
						</button>
						<button 
							type="button" 
							class="btn btn-primary" 
							style="padding: 0.35rem 0.85rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.35rem;"
							onclick={handleDetectGps}
							disabled={detectingGps}
							id="btn-detect-gps"
						>
							{#if detectingGps}
								<span class="spinner spinner-sm"></span> Detecting...
							{:else}
								<Navigation size={13} /> Auto GPS
							{/if}
						</button>
					</div>
				</div>

				{#if gpsError}
					<div style="display: flex; align-items: center; gap: 0.4rem; color: var(--error); font-size: 0.8rem; margin-top: 0.5rem;">
						<AlertCircle size={14} />
						<span>{gpsError}</span>
					</div>
				{/if}

				{#if latitude && longitude}
					<div style="margin-top: 0.75rem; background: var(--bg-card); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid hsla(142, 70%, 45%, 0.3);">
						<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
							<div style="display: flex; align-items: center; gap: 0.4rem; color: var(--success); font-weight: 600; font-size: 0.85rem;">
								<Check size={16} /> GPS Attached: {latitude}, {longitude}
								{#if gpsAccuracy}
									<span style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;">(&plusmn;{gpsAccuracy}m)</span>
								{/if}
							</div>
							<a 
								href={getGoogleMapsUrl(latitude, longitude)} 
								class="btn btn-outline" 
								style="padding: 0.25rem 0.6rem; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.3rem; border-color: var(--accent); color: var(--accent-hover);"
							>
								<ExternalLink size={12} /> Open in Google Maps
							</a>
						</div>

						{#if detectedAddressLabel}
							<div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.4rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
								📍 {detectedAddressLabel}
							</div>
						{/if}

						{#if showMapPreview}
							<div class="feed-job-map-iframe-container" style="margin-top: 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
								<iframe 
									title="Pinned GPS Map Location"
									src={getEmbedMapUrl(latitude, longitude)}
								></iframe>
							</div>
						{/if}
					</div>
				{:else}
					<p style="font-size: 0.78rem; color: var(--text-muted); margin: 0.25rem 0 0 0;">
						Click <strong>Use Current GPS Location</strong> to automatically attach exact coordinates and generate Google Maps directions for workers.
					</p>
				{/if}
			</div>

			<div class="form-grid-2">
				<div class="form-group">
					<label for="budget">Budget (₱)</label>
					<input 
						type="number" 
						id="budget" 
						name="budget" 
						placeholder="E.g. 1000" 
						min="1" 
						value={form?.budget ?? ''}
						required 
					/>
				</div>

				<div class="form-group">
					<label for="target_date">Target Date & Time</label>
					<input 
						type="datetime-local" 
						id="target_date" 
						name="target_date" 
						value={form?.target_date ?? ''}
						min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
						required 
					/>
				</div>
			</div>

			<div class="form-group" style="margin-bottom: 1.25rem;">
				<label for="description">Detailed Description & Landmarks</label>
				<textarea 
					id="description" 
					name="description" 
					placeholder="Share details like required tools, landmark instructions, or specific notes..." 
					style="min-height: 80px;"
					required
				>{form?.description ?? ''}</textarea>
			</div>

			<div class="post-job-actions" style="display: flex; gap: 0.75rem; justify-content: flex-end;">
				<a href="/customer" class="btn btn-secondary">Cancel</a>
				<button type="submit" class="btn btn-primary" disabled={loading}>
					{loading ? 'Posting...' : 'Post Job'}
				</button>
			</div>
		</form>
	</div>
</div>

<LocationPickerModal 
	bind:show={showPickerModal}
	initialLat={latitude}
	initialLng={longitude}
	initialAddress={detectedAddressLabel}
	title="Pin Custom Job Location"
	onSave={handleCustomLocationSaved}
/>
