<script>
	import { enhance } from '$app/forms';
	import { AlertTriangle, MapPin, Navigation, Check, AlertCircle, Mail, ArrowLeft, RotateCw, CheckCircle2, ShieldCheck, X } from 'lucide-svelte';

	import { getCurrentCoordinates, reverseGeocode } from '$lib/gpsUtils.js';
	import LocationPickerModal from '$lib/LocationPickerModal.svelte';
	import CityAutocomplete from '$lib/CityAutocomplete.svelte';

	let { data, form } = $props();

	let loading = $state(false);
	let resendLoading = $state(false);
	let clientError = $state('');

	// Step tracking: 'form' | 'otp'
	// svelte-ignore state_referenced_locally
	let currentStep = $state(form?.step === 'otp' ? 'otp' : 'form');

	// Form field states
	// svelte-ignore state_referenced_locally
	let name = $state(form?.name ?? '');
	// svelte-ignore state_referenced_locally
	let email = $state(form?.email ?? '');
	// svelte-ignore state_referenced_locally
	let phone = $state(form?.phone ?? '');
	let password = $state('');
	let otpCode = $state('');

	let selectedRole = $derived(form?.role ?? data?.role ?? '');
	// svelte-ignore state_referenced_locally
	let selectedAddress = $state(form?.address ?? '');
	let isAddressValid = $state(false);

	// GPS States
	let detectingGps = $state(false);
	let gpsStatus = $state(null); // { type: 'success' | 'error', message: string }
	let showPickerModal = $state(false);

	// OTP Resend Cooldown
	let resendCooldown = $state(60);
	let timerInterval = null;

	function startCooldownTimer() {
		resendCooldown = 60;
		if (timerInterval) clearInterval(timerInterval);
		timerInterval = setInterval(() => {
			if (resendCooldown > 0) {
				resendCooldown -= 1;
			} else {
				clearInterval(timerInterval);
			}
		}, 1000);
	}

	$effect(() => {
		if (form?.step === 'otp') {
			currentStep = 'otp';
			startCooldownTimer();
		} else if (form?.step === 'form') {
			currentStep = 'form';
		}

		if (form?.address) {
			selectedAddress = form.address;
			isAddressValid = true;
		}
		if (form?.name) name = form.name;
		if (form?.email) email = form.email;
		if (form?.phone) phone = form.phone;
	});

	async function handleAutoGps() {
		detectingGps = true;
		gpsStatus = null;
		clientError = '';
		try {
			const coords = await getCurrentCoordinates();
			const geo = await reverseGeocode(coords.latitude, coords.longitude);
			
			const detectedCity = geo.city || geo.displayName || '';
			
			if (detectedCity) {
				selectedAddress = detectedCity;
				isAddressValid = true;
				gpsStatus = { type: 'success', message: `Location verified & detected: ${detectedCity}` };
			} else {
				gpsStatus = { type: 'error', message: 'Could not auto-detect city name. Please search and tap your municipality.' };
			}
		} catch (err) {
			gpsStatus = { type: 'error', message: err.message || 'Unable to access your location. Please check browser permissions.' };
		} finally {
			detectingGps = false;
		}
	}

	function handleCustomLocationSaved(result) {
		gpsStatus = null;
		clientError = '';
		const candidate = result.city || result.address || '';
		if (candidate) {
			selectedAddress = candidate;
			isAddressValid = true;
			gpsStatus = { type: 'success', message: `Pinned location verified: ${candidate}` };
		} else {
			gpsStatus = { type: 'error', message: 'Could not identify city from the pinned location. Please search and select from suggestions.' };
		}
		showPickerModal = false;
	}

	function handleBackToDetails() {
		currentStep = 'form';
		clientError = '';
	}
</script>

<svelte:head>
	<title>Register | Serviee</title>
</svelte:head>

<div style="max-width: 580px; margin: 2.5rem auto; width: 100%; padding: 0 1rem;">
	<div class="card" style="padding: 2.5rem 2rem; position: relative;">

		<!-- Top Exit Button -->
		<a 
			href="/login" 
			style="position: absolute; right: 1.25rem; top: 1.25rem; background: var(--bg-base); border: 1px solid var(--border-color); color: var(--text-muted); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-decoration: none; cursor: pointer; transition: all 0.2s;"
			title="Exit and Return to Log In"
			id="register-top-exit-btn"
			onmouseenter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
			onmouseleave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
		>
			<X size={18} />
		</a>

		{#if currentStep === 'form'}
			<h2 style="font-size: 2.25rem; margin-bottom: 0.6rem; text-align: center;">Create an Account</h2>
			<p style="color: var(--text-secondary); text-align: center; margin-bottom: 2.25rem; font-size: 1.05rem;">
				Sign up to request services or find sideline work.
			</p>

			{#if form?.error || clientError}
				<div style="background-color: var(--error-light); border: 1px solid var(--error); color: var(--text-primary); padding: 1rem 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.75rem; font-size: 0.98rem; display: flex; align-items: center; gap: 0.65rem;">
					<AlertTriangle size={20} style="color: var(--error); flex-shrink: 0;" />
					<span>{form?.error || clientError}</span>
				</div>
			{/if}

			<form method="POST" action="?/sendOtp" use:enhance={({ cancel }) => {
				clientError = '';
				if (!selectedAddress || !isAddressValid) {
					clientError = 'Please search and select a valid City or Municipality from the suggestions, or use Auto GPS / Custom Pin.';
					cancel();
					return;
				}
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}>
				<div class="form-group" style="margin-bottom: 1.25rem;">
					<label for="name" style="font-size: 0.95rem; margin-bottom: 0.4rem;">Full Name</label>
					<input 
						type="text" 
						id="name" 
						name="name" 
						placeholder="Juan Dela Cruz" 
						bind:value={name} 
						required 
						style="padding: 0.75rem 1rem; font-size: 1rem;"
					/>
				</div>

				<div class="form-group" style="margin-bottom: 1.25rem;">
					<label for="email" style="font-size: 0.95rem; margin-bottom: 0.4rem;">Email Address</label>
					<input 
						type="email" 
						id="email" 
						name="email" 
						placeholder="juan@example.com" 
						bind:value={email} 
						required 
						style="padding: 0.75rem 1rem; font-size: 1rem;"
					/>
				</div>

				<div class="form-group" style="margin-bottom: 1.25rem;">
					<label for="phone" style="font-size: 0.95rem; margin-bottom: 0.4rem;">Contact Number</label>
					<input 
						type="tel" 
						id="phone" 
						name="phone" 
						placeholder="09123456789" 
						bind:value={phone} 
						required 
						style="padding: 0.75rem 1rem; font-size: 1rem;"
					/>
				</div>

				<div class="form-group" style="margin-bottom: 1.25rem;">
					<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.5rem;">
						<label for="address" style="font-size: 0.95rem; margin-bottom: 0;">City/Municipality</label>
						<div style="display: flex; gap: 0.4rem; align-items: center;">
							<button 
								type="button" 
								class="btn btn-outline" 
								style="padding: 0.25rem 0.6rem; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 0.3rem; border-color: var(--accent); color: var(--accent-hover); border-radius: var(--radius-sm);"
								onclick={() => showPickerModal = true}
								id="register-btn-custom-gps"
								title="Pin custom location on map"
							>
								<MapPin size={13} /> Custom GPS
							</button>
							<button 
								type="button" 
								class="btn btn-primary" 
								style="padding: 0.25rem 0.7rem; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 0.3rem; border-radius: var(--radius-sm);"
								onclick={handleAutoGps}
								disabled={detectingGps}
								id="register-btn-auto-gps"
								title="Auto-detect location from GPS"
							>
								{#if detectingGps}
									<span class="spinner spinner-sm" style="width: 12px; height: 12px; border-width: 2px;"></span>
									<span>Detecting...</span>
								{:else}
									<Navigation size={13} /> Auto GPS
								{/if}
							</button>
						</div>
					</div>

					<CityAutocomplete 
						bind:value={selectedAddress}
						name="address"
						id="address"
						placeholder="Search municipality or city (e.g. Davao City, Cebu City, Makati)..."
						required={true}
						bind:isValid={isAddressValid}
						onselect={(item) => {
							gpsStatus = { type: 'success', message: `Selected: ${item.displayName}` };
						}}
					/>

					{#if gpsStatus}
						<div style="margin-top: 0.45rem; font-size: 0.82rem; display: flex; align-items: center; gap: 0.35rem; {gpsStatus.type === 'success' ? 'color: var(--success);' : 'color: var(--error);'}">
							{#if gpsStatus.type === 'success'}
								<Check size={14} style="flex-shrink: 0;" />
							{:else}
								<AlertCircle size={14} style="flex-shrink: 0;" />
							{/if}
							<span>{gpsStatus.message}</span>
						</div>
					{/if}
				</div>

				<div class="form-group" style="margin-bottom: 1.25rem;">
					<label for="role" style="font-size: 0.95rem; margin-bottom: 0.4rem;">What is your role?</label>
					<select id="role" name="role" required value={selectedRole} style="padding: 0.75rem 1rem; font-size: 1rem;">
						<option value="" disabled selected={!selectedRole}>Select your role...</option>
						<option value="customer">Looking for Services (Client / Customer)</option>
						<option value="worker">Looking for Work (Worker / Provider)</option>
					</select>
				</div>

				<div class="form-group" style="margin-bottom: 2.25rem;">
					<label for="password" style="font-size: 0.95rem; margin-bottom: 0.4rem;">Password</label>
					<input 
						type="password" 
						id="password" 
						name="password" 
						placeholder="At least 6 characters" 
						bind:value={password}
						required 
						style="padding: 0.75rem 1rem; font-size: 1rem;"
					/>
				</div>

				<button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.85rem 1.25rem; font-size: 1.05rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;" disabled={loading} id="register-submit-btn">
					{#if loading}
						<span class="spinner spinner-sm"></span>
						<span>Sending Verification Code...</span>
					{:else}
						<ShieldCheck size={18} />
						<span>Continue & Verify Email</span>
					{/if}
				</button>
			</form>

			<div style="margin-top: 1.75rem; text-align: center; font-size: 1rem; color: var(--text-secondary);">
				Already have an account? <a href="/login" style="font-weight: 600;" id="register-login-link">Log In here</a>
			</div>
		{:else}
			<!-- STEP 2: OTP VERIFICATION -->
			<div style="text-align: center; margin-bottom: 1.75rem;">
				<div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 50%; background: var(--accent-light, rgba(114, 97, 239, 0.15)); color: var(--accent); margin-bottom: 1rem;">
					<Mail size={32} />
				</div>
				<h2 style="font-size: 1.85rem; margin-bottom: 0.5rem; color: var(--text-primary);">Verify Your Email</h2>
				<p style="color: var(--text-secondary); font-size: 0.98rem; line-height: 1.5; max-width: 440px; margin: 0 auto;">
					We sent a 6-digit verification code to <strong style="color: var(--text-primary);">{email || form?.email}</strong>. Please enter the code below to complete your registration.
				</p>
			</div>

			{#if form?.resendSuccess}
				<div style="background-color: var(--success-light); border: 1px solid var(--success); color: var(--text-primary); padding: 0.85rem 1.15rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.92rem; display: flex; align-items: center; gap: 0.5rem;">
					<CheckCircle2 size={18} style="color: var(--success); flex-shrink: 0;" />
					<span>{form.resendSuccess}</span>
				</div>
			{/if}

			{#if form?.error || clientError}
				<div style="background-color: var(--error-light); border: 1px solid var(--error); color: var(--text-primary); padding: 1rem 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.98rem; display: flex; align-items: center; gap: 0.65rem;">
					<AlertTriangle size={20} style="color: var(--error); flex-shrink: 0;" />
					<span>{form?.error || clientError}</span>
				</div>
			{/if}

			<form method="POST" action="?/verifyOtp" use:enhance={() => {
				loading = true;
				clientError = '';
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}>
				<!-- Hidden fields carrying form data -->
				<input type="hidden" name="name" value={name || form?.name || ''} />
				<input type="hidden" name="email" value={email || form?.email || ''} />
				<input type="hidden" name="phone" value={phone || form?.phone || ''} />
				<input type="hidden" name="role" value={selectedRole} />
				<input type="hidden" name="address" value={selectedAddress || form?.address || ''} />
				<input type="hidden" name="password" value={password} />

				<div class="form-group" style="margin-bottom: 1.75rem;">
					<label for="otp-input" style="font-size: 0.95rem; margin-bottom: 0.6rem; text-align: center; display: block; font-weight: 600;">
						Enter 6-Digit OTP Code
					</label>
					<input 
						type="text" 
						id="otp-input" 
						name="otp" 
						bind:value={otpCode}
						placeholder="••••••" 
						required 
						maxlength="6"
						pattern="[0-9]*"
						inputmode="numeric"
						autocomplete="one-time-code"
						style="padding: 0.85rem 1rem; font-size: 1.75rem; text-align: center; letter-spacing: 10px; font-weight: 700; font-family: monospace; border-radius: var(--radius-md);"
					/>
					<span style="display: block; text-align: center; font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.4rem;">
						Code expires in 10 minutes.
					</span>
				</div>

				<button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.85rem 1.25rem; font-size: 1.05rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 1rem;" disabled={loading || otpCode.length < 6} id="register-verify-btn">
					{#if loading}
						<span class="spinner spinner-sm"></span>
						<span>Verifying & Creating Account...</span>
					{:else}
						<CheckCircle2 size={18} />
						<span>Verify & Register</span>
					{/if}
				</button>
			</form>

			<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border-color, #e2e8f0); font-size: 0.9rem;">
				<button 
					type="button" 
					onclick={handleBackToDetails}
					class="btn btn-outline" 
					style="padding: 0.45rem 0.85rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.4rem;"
				>
					<ArrowLeft size={14} /> Back / Edit Info
				</button>

				<form method="POST" action="?/resendOtp" use:enhance={() => {
					resendLoading = true;
					return async ({ update }) => {
						resendLoading = false;
						await update();
						startCooldownTimer();
					};
				}} style="display: inline;">
					<input type="hidden" name="name" value={name || form?.name || ''} />
					<input type="hidden" name="email" value={email || form?.email || ''} />
					<input type="hidden" name="phone" value={phone || form?.phone || ''} />
					<input type="hidden" name="role" value={selectedRole} />
					<input type="hidden" name="address" value={selectedAddress || form?.address || ''} />
					<input type="hidden" name="password" value={password} />

					<button 
						type="submit" 
						class="btn btn-outline" 
						disabled={resendCooldown > 0 || resendLoading}
						style="padding: 0.45rem 0.85rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.4rem;"
					>
						{#if resendLoading}
							<span class="spinner spinner-sm" style="width: 12px; height: 12px;"></span>
							<span>Sending...</span>
						{:else if resendCooldown > 0}
							<span>Resend Code ({resendCooldown}s)</span>
						{:else}
							<RotateCw size={13} />
							<span>Resend Code</span>
						{/if}
					</button>
				</form>
			</div>
		{/if}

	</div>
</div>

<LocationPickerModal 
	bind:show={showPickerModal}
	title="Pin Location / Select City"
	onSave={handleCustomLocationSaved}
/>
