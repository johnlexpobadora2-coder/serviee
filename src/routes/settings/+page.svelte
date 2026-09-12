<script>
	import { 
		User, 
		Lock, 
		Shield, 
		CheckCircle2, 
		AlertCircle, 
		Phone, 
		MapPin, 
		Mail, 
		ArrowLeft, 
		KeyRound, 
		Navigation, 
		Check, 
		Repeat, 
		Smartphone, 
		Trash2, 
		LogOut, 
		UserPlus,
		ShieldAlert
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { getCurrentCoordinates, reverseGeocode } from '$lib/gpsUtils.js';
	import LocationPickerModal from '$lib/LocationPickerModal.svelte';
	import CityAutocomplete from '$lib/CityAutocomplete.svelte';
	import DeleteAccountConfirmModal from '$lib/DeleteAccountConfirmModal.svelte';

	let { data, form } = $props();

	let activeTab = $state('profile'); // 'profile' | 'security' | 'roles'

	$effect(() => {
		if (form?.passwordError || form?.passwordSuccess || form?.sessionError || form?.sessionSuccess) {
			activeTab = 'security';
		} else if (form?.switchError || form?.createRoleError) {
			activeTab = 'roles';
		} else if (form?.profileError || form?.profileSuccess) {
			activeTab = 'profile';
		}
	});

	// Local form states initialized from loaded user data
	// svelte-ignore state_referenced_locally
	let name = $state(data.user?.name || '');
	// svelte-ignore state_referenced_locally
	let phone = $state(data.user?.phone || '');
	// svelte-ignore state_referenced_locally
	let address = $state(data.user?.address || '');
	// svelte-ignore state_referenced_locally
	let isAddressValid = $state(!!(data.user?.address));
	let clientProfileError = $state('');

	// GPS States
	let detectingGps = $state(false);
	let gpsStatus = $state(null); // { type: 'success' | 'error', message: string }
	let showPickerModal = $state(false);
	let showDeleteAccountModal = $state(false);

	$effect(() => {
		if (form?.profileSuccess) {
			const u = form.user || data.user;
			if (u) {
				name = u.name || '';
				phone = u.phone || '';
				address = u.address || '';
				isAddressValid = !!(u.address);
			}
		}
	});

	async function handleAutoGps() {
		detectingGps = true;
		gpsStatus = null;
		clientProfileError = '';
		try {
			const coords = await getCurrentCoordinates();
			const geo = await reverseGeocode(coords.latitude, coords.longitude);
			
			const detectedCity = geo.city || geo.displayName || '';
			
			if (detectedCity) {
				address = detectedCity;
				isAddressValid = true;
				gpsStatus = { type: 'success', message: `Location verified: ${detectedCity}` };
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
		clientProfileError = '';
		const candidate = result.city || result.address || '';
		if (candidate) {
			address = candidate;
			isAddressValid = true;
			gpsStatus = { type: 'success', message: `Pinned location verified: ${candidate}` };
		} else {
			gpsStatus = { type: 'error', message: 'Could not identify city from the pinned location. Please search and select from suggestions.' };
		}
		showPickerModal = false;
	}

	// Security states
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let sessionLogoutPassword = $state('');

	// Role Switcher states
	let switchPassword = $state('');
	let newRolePassword = $state('');
	// svelte-ignore state_referenced_locally
	let newRoleName = $state(data.user?.name || '');
	// svelte-ignore state_referenced_locally
	let newRolePhone = $state(data.user?.phone || '');
	// svelte-ignore state_referenced_locally
	let newRoleAddress = $state(data.user?.address || '');

	$effect(() => {
		if (form?.passwordSuccess) {
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		}
		if (form?.sessionSuccess) {
			sessionLogoutPassword = '';
		}
		if (form?.deleteError) {
			showDeleteAccountModal = true;
		}
	});

	let profileSubmitting = $state(false);
	let passwordSubmitting = $state(false);
	let sessionLogoutSubmitting = $state(false);
	let switchSubmitting = $state(false);
	let createRoleSubmitting = $state(false);
</script>

<svelte:head>
	<title>Account Settings | Serviee</title>
</svelte:head>

<div class="settings-page">
	<div class="settings-container">
		<!-- Navigation Breadcrumb / Back Link -->
		<div class="top-nav">
			<a href={data.user.role === 'customer' ? '/customer' : '/worker'} class="back-link">
				<ArrowLeft size={18} />
				Back to Dashboard
			</a>
		</div>

		<!-- User Hero Header Banner -->
		<div class="user-profile-card">
			<div class="avatar-circle">
				{data.user.name ? data.user.name.charAt(0).toUpperCase() : 'U'}
			</div>
			<div class="user-info">
				<div class="name-badge-row">
					<h2>{data.user.name}</h2>
					<span class="role-badge {data.user.role}">
						{data.user.role === 'customer' ? 'Client' : 'Worker'}
					</span>
				</div>
				<p class="user-email"><Mail size={14} /> {data.user.email}</p>
			</div>
		</div>

		<!-- Settings Tabs -->
		<div class="tabs-header settings-tabs" role="tablist">
			<button
				type="button"
				class="tab-btn"
				class:active={activeTab === 'profile'}
				onclick={() => (activeTab = 'profile')}
				role="tab"
				aria-selected={activeTab === 'profile'}
			>
				<User size={18} />
				<span class="tab-label">Profile</span>
			</button>
			<button
				type="button"
				class="tab-btn"
				class:active={activeTab === 'security'}
				onclick={() => (activeTab = 'security')}
				role="tab"
				aria-selected={activeTab === 'security'}
			>
				<Shield size={18} />
				<span class="tab-label">Security & Devices</span>
			</button>
			<button
				type="button"
				class="tab-btn"
				class:active={activeTab === 'roles'}
				onclick={() => (activeTab = 'roles')}
				role="tab"
				aria-selected={activeTab === 'roles'}
			>
				<Repeat size={18} />
				<span class="tab-label">Switch Role</span>
			</button>
		</div>

		<!-- Tab Content 1: Profile Customization -->
		{#if activeTab === 'profile'}
			<div class="tab-panel">
				<div class="panel-header">
					<h3>Profile Customization</h3>
					<p>Update your public profile details and contact information.</p>
				</div>

				{#if form?.profileSuccess}
					<div class="alert alert-success">
						<CheckCircle2 size={18} />
						<span>{form.profileSuccess}</span>
					</div>
				{/if}

				{#if form?.profileError || clientProfileError}
					<div class="alert alert-error">
						<AlertCircle size={18} />
						<span>{form?.profileError || clientProfileError}</span>
					</div>
				{/if}

				<form
					method="POST"
					action="?/updateProfile"
					class="settings-form"
					use:enhance={({ cancel }) => {
						clientProfileError = '';
						if (!address || !isAddressValid) {
							clientProfileError = 'Please search and select a valid City or Municipality from the suggestions.';
							cancel();
							return;
						}
						profileSubmitting = true;
						return async ({ update }) => {
							profileSubmitting = false;
							await update();
						};
					}}
				>
					<div class="form-group">
						<label for="name">Full Name</label>
						<div class="input-wrapper">
							<User size={18} class="input-icon" />
							<input
								type="text"
								id="name"
								name="name"
								bind:value={name}
								placeholder="Enter your full name"
								required
							/>
						</div>
					</div>

					<div class="form-group">
						<label for="email">Email Address</label>
						<div class="input-wrapper disabled">
							<Mail size={18} class="input-icon" />
							<input
								type="email"
								id="email"
								value={data.user.email}
								disabled
							/>
						</div>
						<small class="field-hint">Email address is tied to your account identity.</small>
					</div>

					<div class="form-group">
						<label for="phone">Phone Number</label>
						<div class="input-wrapper">
							<Phone size={18} class="input-icon" />
							<input
								type="tel"
								id="phone"
								name="phone"
								bind:value={phone}
								placeholder="e.g. 09171234567"
							/>
						</div>
					</div>

					<div class="form-group" style="margin-bottom: 1.25rem;">
						<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.5rem;">
							<label for="address" style="margin-bottom: 0;">City/Municipality</label>
							<div style="display: flex; gap: 0.4rem; align-items: center;">
								<button 
									type="button" 
									class="btn btn-outline" 
									style="padding: 0.25rem 0.6rem; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 0.3rem; border-color: var(--accent); color: var(--accent-hover); border-radius: var(--radius-sm);"
									onclick={() => showPickerModal = true}
									id="settings-btn-custom-gps"
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
									id="settings-btn-auto-gps"
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
							bind:value={address}
							bind:isValid={isAddressValid}
							name="address"
							id="address"
							placeholder="Search city/municipality (e.g. Davao City, Cebu City, Makati)..."
							required={true}
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

					<div class="form-actions">
						<button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 0.5rem;" disabled={profileSubmitting}>
							{#if profileSubmitting}
								<span class="spinner spinner-sm"></span>
								<span>Saving Changes...</span>
							{:else}
								Save Profile Changes
							{/if}
						</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- Tab Content 2: Security & Devices -->
		{#if activeTab === 'security'}
			<div class="space-y-6">
				<!-- Change Password Card -->
				<div class="tab-panel">
					<div class="panel-header">
						<h3>Change Password</h3>
						<p>Ensure your account remains safe with a strong, unique password.</p>
					</div>

					{#if form?.passwordSuccess}
						<div class="alert alert-success">
							<CheckCircle2 size={18} />
							<span>{form.passwordSuccess}</span>
						</div>
					{/if}

					{#if form?.passwordError}
						<div class="alert alert-error">
							<AlertCircle size={18} />
							<span>{form.passwordError}</span>
						</div>
					{/if}

					<form
						method="POST"
						action="?/updatePassword"
						class="settings-form"
						use:enhance={() => {
							passwordSubmitting = true;
							return async ({ update }) => {
								passwordSubmitting = false;
								await update();
							};
						}}
					>
						<div class="form-group">
							<label for="currentPassword">Current Password</label>
							<div class="input-wrapper">
								<KeyRound size={18} class="input-icon" />
								<input
									type="password"
									id="currentPassword"
									name="currentPassword"
									bind:value={currentPassword}
									placeholder="Enter your current password"
									required
								/>
							</div>
						</div>

						<div class="form-group">
							<label for="newPassword">New Password</label>
							<div class="input-wrapper">
								<Lock size={18} class="input-icon" />
								<input
									type="password"
									id="newPassword"
									name="newPassword"
									bind:value={newPassword}
									placeholder="At least 6 characters"
									required
									minlength="6"
								/>
							</div>
						</div>

						<div class="form-group">
							<label for="confirmPassword">Confirm New Password</label>
							<div class="input-wrapper">
								<Shield size={18} class="input-icon" />
								<input
									type="password"
									id="confirmPassword"
									name="confirmPassword"
									bind:value={confirmPassword}
									placeholder="Re-enter your new password"
									required
									minlength="6"
								/>
							</div>
						</div>

						<div class="form-actions">
							<button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 0.5rem;" disabled={passwordSubmitting}>
								{#if passwordSubmitting}
									<span class="spinner spinner-sm"></span>
									<span>Updating Password...</span>
								{:else}
									Update Password
								{/if}
							</button>
						</div>
					</form>
				</div>

				<!-- Active Sessions & Multi-Device Logout Card -->
				<div class="tab-panel">
					<div class="panel-header">
						<div style="display: flex; align-items: center; gap: 0.5rem;">
							<Smartphone size={20} class="text-accent" />
							<h3 style="margin: 0;">Active Devices & Sessions</h3>
						</div>
						<p>Logged in on a public computer or another device? Revoke all other active sessions here.</p>
					</div>

					{#if form?.sessionSuccess}
						<div class="alert alert-success">
							<CheckCircle2 size={18} />
							<span>{form.sessionSuccess}</span>
						</div>
					{/if}

					{#if form?.sessionError}
						<div class="alert alert-error">
							<AlertCircle size={18} />
							<span>{form.sessionError}</span>
						</div>
					{/if}

					<form 
						method="POST" 
						action="?/logoutAllDevices"
						class="settings-form"
						use:enhance={() => {
							sessionLogoutSubmitting = true;
							return async ({ update }) => {
								sessionLogoutSubmitting = false;
								await update();
							};
						}}
					>
						<div class="form-group">
							<label for="session-password">Confirm Password to Revoke Other Devices</label>
							<div class="input-wrapper">
								<KeyRound size={18} class="input-icon" />
								<input 
									type="password" 
									id="session-password" 
									name="password" 
									bind:value={sessionLogoutPassword}
									placeholder="Enter your account password" 
									required
								/>
							</div>
						</div>

						<div class="form-actions">
							<button 
								type="submit" 
								class="btn btn-outline" 
								style="display: inline-flex; align-items: center; gap: 0.5rem; border-color: var(--border-color); color: var(--text-primary);"
								disabled={sessionLogoutSubmitting || !sessionLogoutPassword}
							>
								{#if sessionLogoutSubmitting}
									<span class="spinner spinner-sm"></span>
									<span>Revoking sessions...</span>
								{:else}
									<LogOut size={16} />
									<span>Log Out From All Other Devices</span>
								{/if}
							</button>
						</div>
					</form>
				</div>

				<!-- Danger Zone Card -->
				<div class="tab-panel danger-zone-panel">
					<div class="panel-header">
						<div style="display: flex; align-items: center; gap: 0.5rem;">
							<ShieldAlert size={20} style="color: #ef4444;" />
							<h3 style="margin: 0; color: #ef4444;">Danger Zone</h3>
						</div>
						<p>Permanently delete your account and all associated data from the Serviee platform.</p>
					</div>

					<div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
						<div>
							<div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">Delete Account</div>
							<div style="font-size: 0.82rem; color: var(--text-secondary);">Once deleted, your profile, active job posts, and reviews cannot be recovered.</div>
						</div>

						<button 
							type="button" 
							class="btn btn-danger" 
							style="background-color: #ef4444; border-color: #ef4444; color: #ffffff; display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1.15rem; font-size: 0.88rem;"
							onclick={() => showDeleteAccountModal = true}
						>
							<Trash2 size={16} />
							<span>Delete My Account</span>
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Tab Content 3: Switch Role (Client ↔ Worker) -->
		{#if activeTab === 'roles'}
			<div class="tab-panel">
				{#if data.hasComplementaryAccount}
					<!-- Case A: Complementary Account already exists -->
					<div class="panel-header">
						<div style="display: flex; align-items: center; gap: 0.5rem;">
							<Repeat size={20} class="text-accent" />
							<h3 style="margin: 0;">Switch to {data.complementaryRole === 'customer' ? 'Client' : 'Worker'} Profile</h3>
						</div>
						<p>
							You already have a registered <strong>{data.complementaryRole === 'customer' ? 'Client' : 'Worker'}</strong> account ({data.complementaryAccountName || data.user.name}) under <code>{data.user.email}</code>.
						</p>
					</div>

					{#if form?.switchError}
						<div class="alert alert-error">
							<AlertCircle size={18} />
							<span>{form.switchError}</span>
						</div>
					{/if}

					<form 
						method="POST" 
						action="?/switchRole"
						class="settings-form"
						use:enhance={() => {
							switchSubmitting = true;
							return async ({ update }) => {
								switchSubmitting = false;
								await update();
							};
						}}
					>
						<input type="hidden" name="targetRole" value={data.complementaryRole} />

						<div class="form-group">
							<label for="switch-password">Password for your {data.complementaryRole === 'customer' ? 'Client' : 'Worker'} Account</label>
							<div class="input-wrapper">
								<KeyRound size={18} class="input-icon" />
								<input 
									type="password" 
									id="switch-password" 
									name="password" 
									bind:value={switchPassword}
									placeholder="Enter {data.complementaryRole === 'customer' ? 'Client' : 'Worker'} password" 
									required
								/>
							</div>
							<small class="field-hint">Enter the password for your other role to authenticate and switch dashboards.</small>
						</div>

						<div class="form-actions">
							<button 
								type="submit" 
								class="btn btn-primary" 
								style="display: inline-flex; align-items: center; gap: 0.5rem;"
								disabled={switchSubmitting || !switchPassword}
							>
								{#if switchSubmitting}
									<span class="spinner spinner-sm"></span>
									<span>Switching Dashboards...</span>
								{:else}
									<Repeat size={16} />
									<span>Switch to {data.complementaryRole === 'customer' ? 'Client' : 'Worker'} Dashboard</span>
								{/if}
							</button>
						</div>
					</form>
				{:else}
					<!-- Case B: Complementary Account does not exist yet -->
					<div class="panel-header">
						<div style="display: flex; align-items: center; gap: 0.5rem;">
							<UserPlus size={20} class="text-accent" />
							<h3 style="margin: 0;">Create a {data.complementaryRole === 'customer' ? 'Client' : 'Worker'} Profile</h3>
						</div>
						<p>
							Want to both {data.user.role === 'customer' ? 'hire and offer services as a Worker' : 'find sideline jobs and post jobs as a Client'}? Set up your {data.complementaryRole === 'customer' ? 'Client' : 'Worker'} profile below using your same email.
						</p>
					</div>

					{#if form?.createRoleError}
						<div class="alert alert-error">
							<AlertCircle size={18} />
							<span>{form.createRoleError}</span>
						</div>
					{/if}

					<form 
						method="POST" 
						action="?/createComplementaryRole"
						class="settings-form"
						use:enhance={() => {
							createRoleSubmitting = true;
							return async ({ update }) => {
								createRoleSubmitting = false;
								await update();
							};
						}}
					>
						<input type="hidden" name="role" value={data.complementaryRole} />
						<input type="hidden" name="name" value={newRoleName} />
						<input type="hidden" name="phone" value={newRolePhone} />
						<input type="hidden" name="address" value={newRoleAddress} />

						<div class="form-group">
							<label for="new-role-email">Registered Email</label>
							<div class="input-wrapper disabled">
								<Mail size={18} class="input-icon" />
								<input type="email" id="new-role-email" value={data.user.email} disabled />
							</div>
						</div>

						<div class="form-group">
							<label for="new-role-pass">Create Password for {data.complementaryRole === 'customer' ? 'Client' : 'Worker'} Profile</label>
							<div class="input-wrapper">
								<Lock size={18} class="input-icon" />
								<input 
									type="password" 
									id="new-role-pass" 
									name="password" 
									bind:value={newRolePassword}
									placeholder="At least 6 characters (must differ from your existing password)" 
									required
									minlength="6"
								/>
							</div>
							<small class="field-hint">For security, your Client and Worker accounts under the same email must have different passwords.</small>
						</div>

						<div class="form-actions">
							<button 
								type="submit" 
								class="btn btn-primary" 
								style="display: inline-flex; align-items: center; gap: 0.5rem;"
								disabled={createRoleSubmitting || newRolePassword.length < 6}
							>
								{#if createRoleSubmitting}
									<span class="spinner spinner-sm"></span>
									<span>Creating Account...</span>
								{:else}
									<UserPlus size={16} />
									<span>Create & Switch to {data.complementaryRole === 'customer' ? 'Client' : 'Worker'} Profile</span>
								{/if}
							</button>
						</div>
					</form>
				{/if}
			</div>
		{/if}
	</div>
</div>

<LocationPickerModal 
	bind:show={showPickerModal}
	title="Pin Location / Select City"
	onSave={handleCustomLocationSaved}
/>

<DeleteAccountConfirmModal 
	bind:show={showDeleteAccountModal}
	deleteError={form?.deleteError || ''}
/>

<style>
	.settings-page {
		max-width: 800px;
		margin: 2rem auto;
		padding: 0 1rem;
	}

	.settings-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.top-nav {
		display: flex;
		align-items: center;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-secondary);
		font-size: 0.9rem;
		font-weight: 500;
		transition: color var(--transition-fast);
	}

	.back-link:hover {
		color: var(--accent);
	}

	.user-profile-card {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		box-shadow: var(--shadow-md);
	}

	.avatar-circle {
		width: 64px;
		height: 64px;
		border-radius: var(--radius-full);
		background: linear-gradient(135deg, var(--accent), hsl(280, 80%, 60%));
		color: #ffffff;
		font-size: 1.8rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.user-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.name-badge-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.name-badge-row h2 {
		margin: 0;
		font-size: 1.4rem;
	}

	.role-badge {
		padding: 0.3rem 0.85rem;
		border-radius: var(--radius-full);
		font-size: 0.8rem;
		font-weight: 500;
		text-transform: capitalize;
		border: none !important;
		line-height: 1.25;
	}

	.role-badge.customer {
		background: hsla(330, 85%, 65%, 0.2);
		color: #f472b6;
	}

	.role-badge.worker {
		background: hsla(142, 70%, 50%, 0.2);
		color: #4ade80;
	}

	:global(html.light) .role-badge.customer {
		background: #fce7f3;
		color: #be185d;
	}

	:global(html.light) .role-badge.worker {
		background: #bbf7d0;
		color: #15803d;
	}

	.user-email {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.tabs-header.settings-tabs {
		display: grid !important;
		grid-template-columns: repeat(3, 1fr) !important;
		gap: 0.5rem !important;
		margin-bottom: 0 !important;
		overflow-x: visible !important;
		white-space: normal !important;
		width: 100% !important;
	}

	.settings-tabs .tab-btn {
		display: inline-flex !important;
		align-items: center !important;
		justify-content: center !important;
		gap: 0.5rem !important;
		width: 100% !important;
		padding: 0.75rem 0.5rem !important;
		text-align: center !important;
		flex-shrink: 1 !important;
		white-space: normal !important;
		font-size: 0.9rem !important;
	}

	.tab-panel {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 1.75rem;
		box-shadow: var(--shadow-md);
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.danger-zone-panel {
		border: 1px solid var(--border-color);
		background: var(--bg-card);
	}

	.panel-header h3 {
		font-size: 1.2rem;
		margin-bottom: 0.25rem;
	}

	.panel-header p {
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.alert {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.85rem 1rem;
		border-radius: var(--radius-md);
		font-size: 0.9rem;
		font-weight: 500;
	}

	.alert-success {
		background: var(--success-light);
		color: var(--success);
		border: 1px solid var(--success);
	}

	.alert-error {
		background: var(--error-light);
		color: var(--error);
		border: 1px solid var(--error);
	}

	.settings-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.form-group label {
		font-weight: 500;
		font-size: 0.88rem;
		color: var(--text-secondary);
	}

	.input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.input-wrapper :global(.input-icon) {
		position: absolute;
		left: 0.85rem;
		color: var(--text-muted);
		pointer-events: none;
	}

	.input-wrapper input {
		width: 100%;
		padding: 0.7rem 0.85rem 0.7rem 2.6rem;
		background-color: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		color: var(--text-primary);
		font-family: inherit;
		font-size: 0.9rem;
		transition: border-color var(--transition-fast);
	}

	.input-wrapper input:focus {
		outline: none;
		border-color: var(--border-focus);
		box-shadow: 0 0 0 2px var(--accent-light);
	}

	.input-wrapper.disabled input {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.field-hint {
		font-size: 0.78rem;
		color: var(--text-muted);
	}

	.form-actions {
		margin-top: 0.5rem;
		display: flex;
		justify-content: flex-end;
	}

	@media (max-width: 600px) {
		.settings-tabs .tab-btn {
			padding: 0.65rem 0.25rem !important;
			font-size: 0.78rem !important;
			gap: 0.3rem !important;
		}

		.tab-label {
			line-height: 1.25;
			display: inline-block;
		}

		.user-profile-card {
			flex-direction: column;
			text-align: center;
		}

		.name-badge-row {
			justify-content: center;
		}

		.form-actions {
			justify-content: stretch;
		}

		.form-actions button {
			width: 100%;
		}
	}

	@media (max-width: 380px) {
		.settings-tabs .tab-btn {
			font-size: 0.72rem !important;
			padding: 0.5rem 0.15rem !important;
			gap: 0.2rem !important;
		}
	}
</style>

