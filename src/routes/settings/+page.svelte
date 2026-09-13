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
		ShieldAlert,
		Wrench,
		Plus,
		X,
		FileText,
		CheckCheck,
		Sparkles,
		Activity
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { getCurrentCoordinates, reverseGeocode } from '$lib/gpsUtils.js';
	import LocationPickerModal from '$lib/LocationPickerModal.svelte';
	import CityAutocomplete from '$lib/CityAutocomplete.svelte';
	import DeleteAccountConfirmModal from '$lib/DeleteAccountConfirmModal.svelte';
	import { toast } from '$lib/toast.svelte.js';

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
	let bio = $state(data.user?.bio || '');
	// svelte-ignore state_referenced_locally
	let availability_status = $state(data.user?.availability_status || 'available');
	// svelte-ignore state_referenced_locally
	let skills = $state(Array.isArray(data.user?.skills) ? [...data.user.skills] : []);
	let newSkillInput = $state('');
	// svelte-ignore state_referenced_locally
	let isAddressValid = $state(!!(data.user?.address));
	let clientProfileError = $state('');

	const POPULAR_SKILLS = [
		'Plumbing / Tubero',
		'Electrical / House Wiring',
		'Carpentry / Karpintero',
		'Appliance Repair',
		'House Cleaning / Deep Clean',
		'Painting / Pintura',
		'Masonry / Mason',
		'Roofing / Ayos Yero',
		'Gardening & Landscaping',
		'Excavation / Hukay Lupa',
		'Welding & Steel Work',
		'Aircon Cleaning & Repair',
		'General Handyman / Labor',
		'Pest Control'
	];

	function toggleSkill(skill) {
		if (skills.includes(skill)) {
			skills = skills.filter(s => s !== skill);
		} else {
			skills = [...skills, skill];
		}
	}

	function addCustomSkill() {
		const trimmed = newSkillInput.trim();
		if (trimmed && !skills.includes(trimmed)) {
			skills = [...skills, trimmed];
			newSkillInput = '';
		}
	}

	function removeSkill(skill) {
		skills = skills.filter(s => s !== skill);
	}

	// GPS States
	let detectingGps = $state(false);
	let gpsStatus = $state(null); // { type: 'success' | 'error', message: string }
	let showPickerModal = $state(false);
	let showDeleteAccountModal = $state(false);

	let lastHandledProfileSuccess = null;
	let lastHandledProfileError = null;
	let lastHandledPasswordSuccess = null;
	let lastHandledPasswordError = null;
	let lastHandledSessionSuccess = null;
	let lastHandledSessionError = null;
	let lastHandledSwitchError = null;
	let lastHandledCreateRoleError = null;
	let lastHandledDeleteError = null;

	$effect(() => {
		if (form?.profileSuccess && form.profileSuccess !== lastHandledProfileSuccess) {
			lastHandledProfileSuccess = form.profileSuccess;
			toast.success(form.profileSuccess);
			const u = form.user || data.user;
			if (u) {
				name = u.name || '';
				phone = u.phone || '';
				address = u.address || '';
				bio = u.bio || '';
				availability_status = u.availability_status || 'available';
				skills = Array.isArray(u.skills) ? [...u.skills] : [];
				isAddressValid = !!(u.address);
			}
		}
		if (form?.profileError && form.profileError !== lastHandledProfileError) {
			lastHandledProfileError = form.profileError;
			toast.error(form.profileError);
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
		if (form?.passwordSuccess && form.passwordSuccess !== lastHandledPasswordSuccess) {
			lastHandledPasswordSuccess = form.passwordSuccess;
			toast.success(form.passwordSuccess);
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		}
		if (form?.passwordError && form.passwordError !== lastHandledPasswordError) {
			lastHandledPasswordError = form.passwordError;
			toast.error(form.passwordError);
		}
		if (form?.sessionSuccess && form.sessionSuccess !== lastHandledSessionSuccess) {
			lastHandledSessionSuccess = form.sessionSuccess;
			toast.success(form.sessionSuccess);
			sessionLogoutPassword = '';
		}
		if (form?.sessionError && form.sessionError !== lastHandledSessionError) {
			lastHandledSessionError = form.sessionError;
			toast.error(form.sessionError);
		}
		if (form?.switchError && form.switchError !== lastHandledSwitchError) {
			lastHandledSwitchError = form.switchError;
			toast.error(form.switchError);
		}
		if (form?.createRoleError && form.createRoleError !== lastHandledCreateRoleError) {
			lastHandledCreateRoleError = form.createRoleError;
			toast.error(form.createRoleError);
		}
		if (form?.deleteError && form.deleteError !== lastHandledDeleteError) {
			lastHandledDeleteError = form.deleteError;
			toast.error(form.deleteError);
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

				<form
					method="POST"
					action="?/updateProfile"
					class="settings-form"
					use:enhance={({ cancel }) => {
						clientProfileError = '';
						if (!address || !isAddressValid) {
							const msg = 'Please search and select a valid City or Municipality from the suggestions.';
							clientProfileError = msg;
							toast.error(msg);
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

					<!-- Bio / About Me -->
					<div class="form-group">
						<div class="bio-label-header">
							<label for="bio" class="bio-label">
								<FileText size={16} class="bio-icon" />
								<span class="bio-title">Bio / About Me</span>
							</label>
							<span class="bio-char-count">
								{bio.length}/500
							</span>
						</div>
						<div class="textarea-wrapper">
							<textarea
								id="bio"
								name="bio"
								bind:value={bio}
								rows="3"
								maxlength="500"
								placeholder={data.user.role === 'worker' 
									? "e.g. 5+ years experience in plumbing and electrical works. Reliable, equipped with complete tools and quality service."
									: "e.g. Homeowner in Davao City looking for reliable plumbers and electricians for regular home maintenance."}
								class="custom-textarea"
							></textarea>
						</div>
						<small class="field-hint">
							{data.user.role === 'worker' 
								? 'Brief description visible to clients on your profile.' 
								: 'Brief introduction visible to workers on your profile.'}
						</small>
					</div>

					{#if data.user.role === 'worker'}
						<!-- Availability Status Toggle (For Workers) -->
						<div class="form-group availability-section">
							<label style="display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.35rem;">
								<Activity size={16} style="color: {availability_status === 'available' ? 'var(--success)' : '#f59e0b'};" />
								Availability Status
							</label>
							<div class="availability-cards-grid">
								<button
									type="button"
									class="availability-select-card {availability_status === 'available' ? 'selected-available' : ''}"
									onclick={() => (availability_status = 'available')}
								>
									<div class="status-pulse-dot available-pulse"></div>
									<div class="availability-card-info">
										<strong>Available for Jobs</strong>
										<span>Accepting job requests • Visible for hire</span>
									</div>
									{#if availability_status === 'available'}
										<div class="check-badge available-badge">
											<Check size={14} />
										</div>
									{/if}
								</button>

								<button
									type="button"
									class="availability-select-card {availability_status === 'busy' ? 'selected-busy' : ''}"
									onclick={() => (availability_status = 'busy')}
								>
									<div class="status-pulse-dot busy-pulse"></div>
									<div class="availability-card-info">
										<strong>Busy / On Leave</strong>
										<span>Temporarily not accepting new jobs</span>
									</div>
									{#if availability_status === 'busy'}
										<div class="check-badge busy-badge">
											<Check size={14} />
										</div>
									{/if}
								</button>
							</div>
							<input type="hidden" name="availability_status" value={availability_status} />
						</div>

						<!-- Skills / Services Offered (For Workers) -->
						<div class="form-group skills-section">
							<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.25rem;">
								<label style="display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0;">
									<Wrench size={16} style="color: var(--accent);" />
									Skills & Services Offered
								</label>
								<span class="skills-counter-badge">
									{skills.length} {skills.length === 1 ? 'skill' : 'skills'} selected
								</span>
							</div>
							<small class="field-hint" style="margin-bottom: 0.5rem; display: block;">
								Click tags or type custom skills to help clients find your services easily.
							</small>

							<!-- Popular Preset Chips -->
							<div class="skills-chips-flow">
								{#each POPULAR_SKILLS as presetSkill}
									{@const isSelected = skills.includes(presetSkill)}
									<button
										type="button"
										class="skill-chip-btn {isSelected ? 'chip-active' : ''}"
										onclick={() => toggleSkill(presetSkill)}
									>
										{#if isSelected}
											<Check size={13} class="chip-icon" />
										{:else}
											<Plus size={13} class="chip-icon" />
										{/if}
										<span>{presetSkill}</span>
									</button>
								{/each}
							</div>

							<!-- Custom Skill Adder Box -->
							<div class="custom-skill-input-row">
								<input
									type="text"
									placeholder="Add a custom skill (e.g. CCTV Setup, Tile Work)..."
									bind:value={newSkillInput}
									onkeydown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											addCustomSkill();
										}
									}}
								/>
								<button
									type="button"
									class="btn btn-secondary btn-sm add-skill-btn"
									onclick={addCustomSkill}
									disabled={!newSkillInput.trim()}
								>
									<Plus size={14} /> Add Skill
								</button>
							</div>

							<!-- Active Selected Skills Box -->
							{#if skills.length > 0}
								<div class="active-skills-container">
									<span class="active-skills-label">Your Active Skills on Profile:</span>
									<div class="active-skills-tags">
										{#each skills as skill}
											<span class="active-skill-pill">
												<span>{skill}</span>
												<button
													type="button"
													class="remove-skill-tag-btn"
													onclick={() => removeSkill(skill)}
													aria-label={`Remove ${skill}`}
													title="Remove skill"
												>
													<X size={12} />
												</button>
											</span>
										{/each}
									</div>
								</div>
							{/if}

							<input type="hidden" name="skills" value={JSON.stringify(skills)} />
						</div>
					{/if}

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
									placeholder="Enter current password"
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
									placeholder="Minimum 6 characters"
									minlength="6"
									required
								/>
							</div>
						</div>

						<div class="form-group">
							<label for="confirmPassword">Confirm New Password</label>
							<div class="input-wrapper">
								<Lock size={18} class="input-icon" />
								<input
									type="password"
									id="confirmPassword"
									name="confirmPassword"
									bind:value={confirmPassword}
									placeholder="Re-type new password"
									minlength="6"
									required
								/>
							</div>
						</div>

						<div class="form-actions">
							<button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 0.5rem;" disabled={passwordSubmitting || !currentPassword || !newPassword || !confirmPassword}>
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

	.custom-textarea {
		width: 100%;
		padding: 0.75rem 0.85rem;
		background-color: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		color: var(--text-primary);
		font-family: inherit;
		font-size: 0.9rem;
		line-height: 1.5;
		resize: vertical;
		min-height: 80px;
		transition: border-color var(--transition-fast);
	}

	.custom-textarea:focus {
		outline: none;
		border-color: var(--border-focus);
		box-shadow: 0 0 0 2px var(--accent-light);
	}

	/* Availability Cards */
	.availability-section {
		padding: 1rem;
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
	}

	.availability-cards-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin-top: 0.35rem;
	}

	.availability-select-card {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.85rem;
		border-radius: var(--radius-md);
		border: 1.5px solid var(--border-color);
		background: var(--bg-card);
		cursor: pointer;
		text-align: left;
		transition: all var(--transition-fast);
	}

	.availability-select-card:hover {
		border-color: var(--text-muted);
		transform: translateY(-1px);
	}

	.availability-select-card.selected-available {
		border-color: var(--success);
		background: var(--success-light);
		box-shadow: 0 0 0 1px var(--success);
	}

	.availability-select-card.selected-busy {
		border-color: #f59e0b;
		background: rgba(245, 158, 11, 0.12);
		box-shadow: 0 0 0 1px #f59e0b;
	}

	.status-pulse-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.available-pulse {
		background: var(--success);
		box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
	}

	.busy-pulse {
		background: #f59e0b;
		box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.25);
	}

	.availability-card-info {
		flex: 1;
		min-width: 0;
	}

	.availability-card-info strong {
		font-size: 0.88rem;
		display: block;
		margin-bottom: 0.15rem;
		color: var(--text-primary);
	}

	.availability-card-info span {
		font-size: 0.74rem;
		color: var(--text-muted);
		display: block;
		line-height: 1.25;
	}

	.check-badge {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.available-badge {
		background: var(--success);
		color: #ffffff;
	}

	.busy-badge {
		background: #f59e0b;
		color: #ffffff;
	}

	/* Skills Section */
	.skills-section {
		padding: 1rem;
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
	}

	.skills-counter-badge {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.15rem 0.55rem;
		background: var(--accent-light);
		color: var(--accent-hover);
		border-radius: var(--radius-full);
	}

	.skills-chips-flow {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		margin-bottom: 0.85rem;
	}

	.skill-chip-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.7rem;
		font-size: 0.8rem;
		border-radius: var(--radius-full);
		border: 1px solid var(--border-color);
		background: var(--bg-card);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all var(--transition-fast);
		user-select: none;
	}

	.skill-chip-btn:hover {
		border-color: var(--accent);
		color: var(--accent-hover);
		background: var(--bg-card-hover);
	}

	.skill-chip-btn.chip-active {
		background: var(--accent);
		color: #ffffff;
		border-color: var(--accent);
		font-weight: 500;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
	}

	.custom-skill-input-row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 0.85rem;
	}

	.custom-skill-input-row input {
		flex: 1;
		padding: 0.55rem 0.8rem;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		color: var(--text-primary);
		font-size: 0.85rem;
		font-family: inherit;
	}

	.custom-skill-input-row input:focus {
		outline: none;
		border-color: var(--border-focus);
	}

	.active-skills-container {
		margin-top: 0.5rem;
		padding: 0.75rem;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
	}

	.active-skills-label {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		display: block;
		margin-bottom: 0.4rem;
	}

	.active-skills-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.active-skill-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.6rem;
		font-size: 0.8rem;
		background: var(--accent-light);
		color: var(--accent-hover);
		border-radius: var(--radius-full);
		font-weight: 500;
		border: 1px solid rgba(0, 0, 0, 0.05);
	}

	.remove-skill-tag-btn {
		background: none;
		border: none;
		color: var(--accent-hover);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.1rem;
		border-radius: 50%;
		opacity: 0.75;
		transition: opacity var(--transition-fast);
	}

	.remove-skill-tag-btn:hover {
		opacity: 1;
		background: rgba(0, 0, 0, 0.1);
	}

	.bio-label-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.35rem;
	}

	.bio-label {
		display: inline-flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-bottom: 0;
		font-weight: 600;
		font-size: 0.88rem;
		color: var(--text-primary);
		cursor: pointer;
	}

	.bio-icon {
		color: var(--accent);
		flex-shrink: 0;
	}

	.bio-subtitle {
		font-weight: normal;
		color: var(--text-muted);
		font-size: 0.8rem;
	}

	.bio-char-count {
		font-size: 0.75rem;
		color: var(--text-muted);
		font-weight: 500;
		flex-shrink: 0;
	}

	@media (max-width: 600px) {
		.availability-cards-grid {
			grid-template-columns: 1fr;
		}

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

		.bio-label {
			font-size: 0.84rem;
		}

		.bio-subtitle {
			font-size: 0.76rem;
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

		.bio-subtitle {
			font-size: 0.72rem;
		}
	}
</style>

