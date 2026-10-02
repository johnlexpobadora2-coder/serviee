<script>
	import { 
		User, 
		Lock, 
		Shield, 
		AlertCircle, 
		Phone, 
		MapPin, 
		Mail, 
		ArrowLeft, 
		KeyRound, 
		Navigation, 
		Check, 
		Repeat, 
		Trash2, 
		UserPlus,
		ShieldAlert,
		Wrench,
		Plus,
		X,
		FileText,
		Activity
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { getCurrentCoordinates, reverseGeocode } from '$lib/gpsUtils.js';
	import LocationPickerModal from '$lib/LocationPickerModal.svelte';
	import CityAutocomplete from '$lib/CityAutocomplete.svelte';
	import DeleteAccountConfirmModal from '$lib/DeleteAccountConfirmModal.svelte';
	import PasswordStrengthMeter from '$lib/PasswordStrengthMeter.svelte';
	import { validatePassword, validatePhone } from '$lib/validation.js';
	import { toast } from '$lib/toast.svelte.js';

	let { data, form } = $props();

	let activeTab = $state('profile'); // 'profile' | 'security' | 'roles'

	// Form states initialized from user data
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

	// GPS & Modal States
	let detectingGps = $state(false);
	let gpsStatus = $state(null); // { type: 'success' | 'error', message: string }
	let showPickerModal = $state(false);
	let showDeleteAccountModal = $state(false);

	// Security & Role states
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let switchPassword = $state('');
	let newRolePassword = $state('');
	// svelte-ignore state_referenced_locally
	let newRoleName = $state(data.user?.name || '');
	// svelte-ignore state_referenced_locally
	let newRolePhone = $state(data.user?.phone || '');
	// svelte-ignore state_referenced_locally
	let newRoleAddress = $state(data.user?.address || '');

	// Submission loaders
	let profileSubmitting = $state(false);
	let passwordSubmitting = $state(false);
	let switchSubmitting = $state(false);
	let createRoleSubmitting = $state(false);

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

	// Unified Toast & Form Response Handler
	let lastFormId = null;
	$effect(() => {
		if (!form || form === lastFormId) return;
		lastFormId = form;

		if ('profileSuccess' in form && form.profileSuccess) {
			activeTab = 'profile';
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
		} else if ('profileError' in form && form.profileError) {
			activeTab = 'profile';
			toast.error(form.profileError);
		} else if ('passwordSuccess' in form && form.passwordSuccess) {
			activeTab = 'security';
			toast.success(form.passwordSuccess);
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		} else if ('passwordError' in form && form.passwordError) {
			activeTab = 'security';
			toast.error(form.passwordError);
		} else if ('switchError' in form && form.switchError) {
			activeTab = 'roles';
			toast.error(form.switchError);
		} else if ('createRoleError' in form && form.createRoleError) {
			activeTab = 'roles';
			toast.error(form.createRoleError);
		} else if ('deleteError' in form && form.deleteError) {
			activeTab = 'security';
			toast.error(form.deleteError);
			showDeleteAccountModal = true;
		}
	});
</script>

<svelte:head>
	<title>Account Settings | Serviee</title>
</svelte:head>

<div class="max-w-200 mx-auto my-4 sm:my-8 px-2.5 min-[380px]:px-3.5 sm:px-4">
	<div class="flex flex-col gap-5 sm:gap-6">
		<!-- Navigation Breadcrumb / Back Link -->
		<div class="flex items-center">
			<a 
				href={data.user.role === 'customer' ? '/customer' : '/worker'} 
				class="inline-flex items-center gap-2 text-(--text-secondary) text-[0.9rem] font-medium transition-colors hover:text-(--accent)"
			>
				<ArrowLeft size={18} />
				Back to Dashboard
			</a>
		</div>

		<!-- User Hero Header Banner -->
		<div class="flex flex-col sm:flex-row items-center text-center sm:text-left gap-3.5 sm:gap-5 bg-(--bg-card) border border-(--border-color) rounded-lg p-3.5 min-[380px]:p-4.5 sm:p-6 shadow-(--shadow-md)">
			<div class="w-16 h-16 rounded-full bg-linear-to-br from-(--accent) to-[hsl(280,80%,60%)] text-white text-[1.8rem] font-bold flex items-center justify-center shrink-0">
				{data.user.name ? data.user.name.charAt(0).toUpperCase() : 'U'}
			</div>
			<div class="flex flex-col gap-1">
				<div class="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
					<h2 class="m-0 text-[1.4rem] font-semibold text-(--text-primary)">{data.user.name}</h2>
					<span class="px-3.5 py-1 rounded-full text-[0.8rem] font-medium capitalize leading-tight border-0 {data.user.role === 'customer' ? 'bg-[hsla(330,85%,65%,0.2)] text-[#f472b6] [html.light_&]:bg-[#fce7f3] [html.light_&]:text-[#be185d]' : 'bg-[hsla(142,70%,50%,0.2)] text-[#4ade80] [html.light_&]:bg-[#bbf7d0] [html.light_&]:text-[#15803d]'}">
						{data.user.role === 'customer' ? 'Client' : 'Worker'}
					</span>
				</div>
				<p class="flex items-center justify-center sm:justify-start gap-1.5 text-(--text-muted) text-[0.85rem] m-0"><Mail size={14} /> {data.user.email}</p>
			</div>
		</div>

		<!-- Settings Tabs -->
		<div class="grid grid-cols-3 gap-1.5 sm:gap-2 mb-0 w-full" role="tablist">
			<button
				type="button"
				class="tab-btn inline-flex! items-center! justify-center! gap-1 min-[380px]:gap-1.5 sm:gap-2 w-full px-1 min-[380px]:px-1.5 sm:px-3 py-2.5 sm:py-3 text-center shrink text-[0.76rem] min-[380px]:text-[0.82rem] sm:text-[0.9rem]"
				class:active={activeTab === 'profile'}
				onclick={() => (activeTab = 'profile')}
				role="tab"
				aria-selected={activeTab === 'profile'}
			>
				<User size={18} />
				<span class="leading-tight inline-block">Profile</span>
			</button>
			<button
				type="button"
				class="tab-btn inline-flex! items-center! justify-center! gap-1 min-[380px]:gap-1.5 sm:gap-2 w-full px-1 min-[380px]:px-1.5 sm:px-3 py-2.5 sm:py-3 text-center shrink text-[0.76rem] min-[380px]:text-[0.82rem] sm:text-[0.9rem]"
				class:active={activeTab === 'security'}
				onclick={() => (activeTab = 'security')}
				role="tab"
				aria-selected={activeTab === 'security'}
			>
				<Shield size={18} />
				<span class="leading-tight inline-block">Security</span>
			</button>
			<button
				type="button"
				class="tab-btn inline-flex! items-center! justify-center! gap-1 min-[380px]:gap-1.5 sm:gap-2 w-full px-1 min-[380px]:px-1.5 sm:px-3 py-2.5 sm:py-3 text-center shrink text-[0.76rem] min-[380px]:text-[0.82rem] sm:text-[0.9rem]"
				class:active={activeTab === 'roles'}
				onclick={() => (activeTab = 'roles')}
				role="tab"
				aria-selected={activeTab === 'roles'}
			>
				<Repeat size={18} />
				<span class="leading-tight inline-block">Switch Role</span>
			</button>
		</div>

		<!-- Tab Content 1: Profile Customization -->
		{#if activeTab === 'profile'}
			<div class="bg-(--bg-card) border border-(--border-color) rounded-lg p-3.5 min-[380px]:p-5 sm:p-7 shadow-(--shadow-md) flex flex-col gap-5 sm:gap-6">
				<div>
					<h3 class="text-[1.2rem] font-semibold text-(--text-primary) mb-1">Profile Customization</h3>
					<p class="text-(--text-muted) text-[0.85rem] m-0">Update your public profile details and contact information.</p>
				</div>

				<form
					method="POST"
					action="?/updateProfile"
					class="flex flex-col gap-5"
					use:enhance={({ cancel }) => {
						clientProfileError = '';
						if (phone) {
							const phoneCheck = validatePhone(phone);
							if (!phoneCheck.isValid) {
								toast.error(phoneCheck.error);
								cancel();
								return;
							}
						}
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
					<div class="flex flex-col gap-1.5">
						<label for="name" class="font-medium text-[0.88rem] text-(--text-secondary)">Full Name</label>
						<div class="relative flex items-center">
							<User size={18} class="absolute left-3.5 text-(--text-muted) pointer-events-none" />
							<input
								type="text"
								id="name"
								name="name"
								bind:value={name}
								placeholder="Enter your full name"
								required
								class="w-full py-2.5 pr-3.5 pl-10.5 bg-(--bg-input) border border-(--border-color) rounded-md text-(--text-primary) text-[0.9rem] font-sans transition-colors focus:outline-none focus:border-(--border-focus) focus:ring-2 focus:ring-(--accent-light)"
							/>
						</div>
					</div>

					<div class="flex flex-col gap-1.5">
						<label for="email" class="font-medium text-[0.88rem] text-(--text-secondary)">Email Address</label>
						<div class="relative flex items-center">
							<Mail size={18} class="absolute left-3.5 text-(--text-muted) pointer-events-none" />
							<input
								type="email"
								id="email"
								value={data.user.email}
								disabled
								class="w-full py-2.5 pr-3.5 pl-10.5 bg-(--bg-input) border border-(--border-color) rounded-md text-(--text-primary) text-[0.9rem] font-sans opacity-60 cursor-not-allowed"
							/>
						</div>
						<small class="text-[0.78rem] text-(--text-muted)">Email address is tied to your account identity.</small>
					</div>

					<div class="flex flex-col gap-1.5">
						<label for="phone" class="font-medium text-[0.88rem] text-(--text-secondary)">Phone Number</label>
						<div class="relative flex items-center">
							<Phone size={18} class="absolute left-3.5 text-(--text-muted) pointer-events-none" />
							<input
								type="tel"
								id="phone"
								name="phone"
								bind:value={phone}
								placeholder="e.g. 09171234567"
								class="w-full py-2.5 pr-3.5 pl-10.5 bg-(--bg-input) border border-(--border-color) rounded-md text-(--text-primary) text-[0.9rem] font-sans transition-colors focus:outline-none focus:border-(--border-focus) focus:ring-2 focus:ring-(--accent-light)"
							/>
						</div>
					</div>

					<div class="flex flex-col gap-1.5 mb-5">
						<div class="flex justify-between items-center mb-1.5 flex-wrap gap-2">
							<label for="address" class="font-medium text-[0.88rem] text-(--text-secondary) mb-0">City/Municipality</label>
							<div class="flex gap-1.5 items-center">
								<button 
									type="button" 
									class="btn btn-outline py-1 px-2.5 text-xs inline-flex items-center gap-1 border-(--accent) text-(--accent-hover) hover:opacity-90 rounded"
									onclick={() => showPickerModal = true}
									id="settings-btn-custom-gps"
									title="Pin custom location on map"
								>
									<MapPin size={13} /> Custom GPS
								</button>
								<button 
									type="button" 
									class="btn btn-primary py-1 px-3 text-xs inline-flex items-center gap-1 rounded"
									onclick={handleAutoGps}
									disabled={detectingGps}
									id="settings-btn-auto-gps"
									title="Auto-detect location from GPS"
								>
									{#if detectingGps}
										<span class="spinner spinner-sm w-3 h-3 border-2"></span>
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
							<div class="mt-1.5 text-xs flex items-center gap-1.5 {gpsStatus.type === 'success' ? 'text-(--success)' : 'text-(--error)'}">
								{#if gpsStatus.type === 'success'}
									<Check size={14} class="shrink-0" />
								{:else}
									<AlertCircle size={14} class="shrink-0" />
								{/if}
								<span>{gpsStatus.message}</span>
							</div>
						{/if}
					</div>

					<!-- Bio / About Me -->
					<div class="flex flex-col gap-1.5">
						<div class="flex justify-between items-center flex-wrap gap-1.5 mb-1">
							<label for="bio" class="inline-flex items-center flex-wrap gap-1.5 mb-0 font-semibold text-[0.88rem] text-(--text-primary) cursor-pointer">
								<FileText size={16} class="text-(--accent) shrink-0" />
								<span>Bio / About Me</span>
							</label>
							<span class="text-xs text-(--text-muted) font-medium shrink-0">
								{bio.length}/500
							</span>
						</div>
						<div>
							<textarea
								id="bio"
								name="bio"
								bind:value={bio}
								rows="3"
								maxlength="500"
								placeholder={data.user.role === 'worker' 
									? "e.g. 5+ years experience in plumbing and electrical works. Reliable, equipped with complete tools and quality service."
									: "e.g. Homeowner in Davao City looking for reliable plumbers and electricians for regular home maintenance."}
								class="w-full p-3 bg-(--bg-input) border border-(--border-color) rounded-md text-(--text-primary) text-[0.9rem] leading-relaxed resize-y min-h-20 font-sans transition-colors focus:outline-none focus:border-(--border-focus) focus:ring-2 focus:ring-(--accent-light)"
							></textarea>
						</div>
						<small class="text-[0.78rem] text-(--text-muted)">
							{data.user.role === 'worker' 
								? 'Brief description visible to clients on your profile.' 
								: 'Brief introduction visible to workers on your profile.'}
						</small>
					</div>

					{#if data.user.role === 'worker'}
						<!-- Availability Status Toggle (For Workers) -->
						<div class="p-3.5 sm:p-4 bg-(--bg-input) border border-(--border-color) rounded-md flex flex-col gap-1.5">
							<label class="flex items-center gap-1.5 mb-1 text-[0.88rem] font-medium text-(--text-secondary)">
								<Activity size={16} style="color: {availability_status === 'available' ? 'var(--success)' : '#f59e0b'};" />
								Availability Status
							</label>
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mt-1">
								<button
									type="button"
									class="flex items-center gap-2.5 p-3.5 rounded-md border-[1.5px] cursor-pointer text-left transition-all hover:border-(--text-muted) hover:-translate-y-0.5 {availability_status === 'available' ? 'border-(--success) bg-(--success-light) ring-1 ring-(--success)' : 'border-(--border-color) bg-(--bg-card)'}"
									onclick={() => (availability_status = 'available')}
								>
									<div class="w-3 h-3 rounded-full shrink-0 bg-(--success) shadow-[0_0_0_3px_rgba(16,185,129,0.25)]"></div>
									<div class="flex-1 min-w-0">
										<strong class="text-[0.88rem] block mb-0.5 text-(--text-primary)">Available for Jobs</strong>
										<span class="text-[0.74rem] text-(--text-muted) block leading-tight">Accepting job requests • Visible for hire</span>
									</div>
									{#if availability_status === 'available'}
										<div class="w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 bg-(--success) text-white">
											<Check size={14} />
										</div>
									{/if}
								</button>

								<button
									type="button"
									class="flex items-center gap-2.5 p-3.5 rounded-md border-[1.5px] cursor-pointer text-left transition-all hover:border-(--text-muted) hover:-translate-y-0.5 {availability_status === 'busy' ? 'border-[#f59e0b] bg-[rgba(245,158,11,0.12)] ring-1 ring-[#f59e0b]' : 'border-(--border-color) bg-(--bg-card)'}"
									onclick={() => (availability_status = 'busy')}
								>
									<div class="w-3 h-3 rounded-full shrink-0 bg-[#f59e0b] shadow-[0_0_0_3px_rgba(245,158,11,0.25)]"></div>
									<div class="flex-1 min-w-0">
										<strong class="text-[0.88rem] block mb-0.5 text-(--text-primary)">Busy / On Leave</strong>
										<span class="text-[0.74rem] text-(--text-muted) block leading-tight">Temporarily not accepting new jobs</span>
									</div>
									{#if availability_status === 'busy'}
										<div class="w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 bg-[#f59e0b] text-white">
											<Check size={14} />
										</div>
									{/if}
								</button>
							</div>
							<input type="hidden" name="availability_status" value={availability_status} />
						</div>

						<!-- Skills / Services Offered (For Workers) -->
						<div class="p-3.5 sm:p-4 bg-(--bg-input) border border-(--border-color) rounded-md flex flex-col gap-1.5">
							<div class="flex justify-between items-center flex-wrap gap-2 mb-1">
								<label class="flex items-center gap-1.5 mb-0 text-[0.88rem] font-medium text-(--text-secondary)">
									<Wrench size={16} class="text-(--accent)" />
									Skills & Services Offered
								</label>
								<span class="text-xs font-semibold py-0.5 px-2 bg-(--accent-light) text-(--accent-hover) rounded-full">
									{skills.length} {skills.length === 1 ? 'skill' : 'skills'} selected
								</span>
							</div>
							<small class="text-[0.78rem] text-(--text-muted) mb-2 block">
								Click tags or type custom skills to help clients find your services easily.
							</small>

							<!-- Popular Preset Chips -->
							<div class="flex flex-wrap gap-2 mb-3.5">
								{#each POPULAR_SKILLS as presetSkill}
									{@const isSelected = skills.includes(presetSkill)}
									<button
										type="button"
										class="inline-flex items-center gap-1.5 py-1.5 px-3 text-xs sm:text-[0.8rem] rounded-full border transition-all cursor-pointer select-none {isSelected ? 'bg-(--accent) text-white border-(--accent) font-medium shadow-xs' : 'border-(--border-color) bg-(--bg-card) text-(--text-secondary) hover:border-(--accent) hover:text-(--accent-hover)'}"
										onclick={() => toggleSkill(presetSkill)}
									>
										{#if isSelected}
											<Check size={13} />
										{:else}
											<Plus size={13} />
										{/if}
										<span>{presetSkill}</span>
									</button>
								{/each}
							</div>

							<!-- Custom Skill Adder Box -->
							<div class="flex gap-2 items-center mb-3.5">
								<input
									type="text"
									placeholder="Add a custom skill (e.g. CCTV Setup, Tile Work)..."
									bind:value={newSkillInput}
									class="flex-1 py-2 px-3 bg-(--bg-card) border border-(--border-color) rounded-md text-(--text-primary) text-[0.85rem] font-sans focus:outline-none focus:border-(--border-focus)"
									onkeydown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											addCustomSkill();
										}
									}}
								/>
								<button
									type="button"
									class="btn btn-secondary btn-sm py-1.5 px-3 text-xs inline-flex items-center gap-1 shrink-0"
									onclick={addCustomSkill}
									disabled={!newSkillInput.trim()}
								>
									<Plus size={14} /> Add Skill
								</button>
							</div>

							<!-- Active Selected Skills Box -->
							{#if skills.length > 0}
								<div class="mt-2 p-3 bg-(--bg-card) border border-(--border-color) rounded-md">
									<span class="text-[0.72rem] font-semibold text-(--text-muted) uppercase tracking-wider block mb-1.5">Your Active Skills on Profile:</span>
									<div class="flex flex-wrap gap-1.5">
										{#each skills as skill}
											<span class="inline-flex items-center gap-1.5 py-1 px-2.5 text-[0.8rem] bg-(--accent-light) text-(--accent-hover) rounded-full font-medium border border-black/5">
												<span>{skill}</span>
												<button
													type="button"
													class="bg-transparent border-0 text-(--accent-hover) cursor-pointer inline-flex items-center justify-center p-0.5 rounded-full opacity-75 transition-opacity hover:opacity-100 hover:bg-black/10"
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

					<div class="mt-2 flex justify-stretch sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
						<button type="submit" class="btn btn-primary inline-flex items-center justify-center gap-2" disabled={profileSubmitting}>
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

		<!-- Tab Content 2: Security -->
		{#if activeTab === 'security'}
			<div class="flex flex-col gap-6">
				<!-- Change Password Card -->
				<div class="bg-(--bg-card) border border-(--border-color) rounded-lg p-3.5 min-[380px]:p-5 sm:p-7 shadow-(--shadow-md) flex flex-col gap-5 sm:gap-6">
					<div>
						<h3 class="text-[1.2rem] font-semibold text-(--text-primary) mb-1">Change Password</h3>
						<p class="text-(--text-muted) text-[0.85rem] m-0">Ensure your account remains safe with a strong, unique password.</p>
					</div>

					<form
						method="POST"
						action="?/updatePassword"
						class="flex flex-col gap-5"
						use:enhance={({ cancel }) => {
							if (!currentPassword) {
								toast.error('Please enter your current password.');
								cancel();
								return;
							}
							const newPassCheck = validatePassword(newPassword);
							if (!newPassCheck.isValid) {
								toast.error(newPassCheck.error);
								cancel();
								return;
							}
							if (newPassword !== confirmPassword) {
								toast.error('New password and confirmation do not match.');
								cancel();
								return;
							}
							passwordSubmitting = true;
							return async ({ update }) => {
								passwordSubmitting = false;
								await update();
							};
						}}
					>
						<div class="flex flex-col gap-1.5">
							<label for="currentPassword" class="font-medium text-[0.88rem] text-(--text-secondary)">Current Password</label>
							<div class="relative flex items-center">
								<KeyRound size={18} class="absolute left-3.5 text-(--text-muted) pointer-events-none" />
								<input
									type="password"
									id="currentPassword"
									name="currentPassword"
									bind:value={currentPassword}
									placeholder="Enter current password"
									required
									class="w-full py-2.5 pr-3.5 pl-10.5 bg-(--bg-input) border border-(--border-color) rounded-md text-(--text-primary) text-[0.9rem] font-sans transition-colors focus:outline-none focus:border-(--border-focus) focus:ring-2 focus:ring-(--accent-light)"
								/>
							</div>
						</div>

						<div class="flex flex-col gap-1.5">
							<label for="newPassword" class="font-medium text-[0.88rem] text-(--text-secondary)">New Password</label>
							<div class="relative flex items-center">
								<Lock size={18} class="absolute left-3.5 text-(--text-muted) pointer-events-none" />
								<input
									type="password"
									id="newPassword"
									name="newPassword"
									bind:value={newPassword}
									placeholder="e.g. Pass@123"
									required
									class="w-full py-2.5 pr-3.5 pl-10.5 bg-(--bg-input) border border-(--border-color) rounded-md text-(--text-primary) text-[0.9rem] font-sans transition-colors focus:outline-none focus:border-(--border-focus) focus:ring-2 focus:ring-(--accent-light)"
								/>
							</div>
							<PasswordStrengthMeter password={newPassword} />
						</div>

						<div class="flex flex-col gap-1.5">
							<label for="confirmPassword" class="font-medium text-[0.88rem] text-(--text-secondary)">Confirm New Password</label>
							<div class="relative flex items-center">
								<Lock size={18} class="absolute left-3.5 text-(--text-muted) pointer-events-none" />
								<input
									type="password"
									id="confirmPassword"
									name="confirmPassword"
									bind:value={confirmPassword}
									placeholder="e.g. Pass@123"
									required
									class="w-full py-2.5 pr-3.5 pl-10.5 bg-(--bg-input) border border-(--border-color) rounded-md text-(--text-primary) text-[0.9rem] font-sans transition-colors focus:outline-none focus:border-(--border-focus) focus:ring-2 focus:ring-(--accent-light)"
								/>
							</div>
							{#if confirmPassword && newPassword !== confirmPassword}
								<small class="text-(--error) text-xs mt-1.5 flex items-center gap-1">
									<AlertCircle size={13} /> Passwords do not match
								</small>
							{:else if confirmPassword && newPassword === confirmPassword}
								<small class="text-(--success) text-xs mt-1.5 flex items-center gap-1">
									<Check size={13} /> Passwords match
								</small>
							{/if}
						</div>

						<div class="mt-2 flex justify-stretch sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
							<button type="submit" class="btn btn-primary inline-flex items-center justify-center gap-2" disabled={passwordSubmitting || !currentPassword || !validatePassword(newPassword).isValid || newPassword !== confirmPassword}>
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

				<!-- Danger Zone Card -->
				<div class="bg-(--bg-card) border border-(--border-color) rounded-lg p-3.5 min-[380px]:p-5 sm:p-7 shadow-(--shadow-md) flex flex-col gap-5 sm:gap-6">
					<div>
						<div class="flex items-center gap-2">
							<ShieldAlert size={20} class="text-red-500" />
							<h3 class="m-0 text-red-500 text-[1.2rem] font-semibold">Danger Zone</h3>
						</div>
						<p class="text-(--text-muted) text-[0.85rem] mt-1 mb-0">Permanently delete your account and all associated data from the Serviee platform.</p>
					</div>

					<div class="flex justify-between items-center gap-4 flex-wrap">
						<div>
							<div class="font-semibold text-sm text-(--text-primary)">Delete Account</div>
							<div class="text-xs text-(--text-secondary)">Once deleted, your profile, active job posts, and reviews cannot be recovered.</div>
						</div>

						<button 
							type="button" 
							class="btn btn-danger bg-red-500 border-red-500 text-white inline-flex items-center gap-1.5 py-2 px-4.5 text-sm w-full sm:w-auto justify-center"
							onclick={() => showDeleteAccountModal = true}
						>
							<Trash2 size={16} />
							<span>Delete My Account</span>
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Tab Content 3: Switch Role (Client <-> Worker) -->
		{#if activeTab === 'roles'}
			<div class="bg-(--bg-card) border border-(--border-color) rounded-lg p-3.5 min-[380px]:p-5 sm:p-7 shadow-(--shadow-md) flex flex-col gap-5 sm:gap-6">
				{#if data.hasComplementaryAccount}
					<!-- Case A: Complementary Account already exists -->
					<div>
						<div class="flex items-center gap-2">
							<Repeat size={20} class="text-(--accent)" />
							<h3 class="m-0 text-[1.2rem] font-semibold text-(--text-primary)">Switch to {data.complementaryRole === 'customer' ? 'Client' : 'Worker'} Profile</h3>
						</div>
						<p class="text-(--text-muted) text-[0.85rem] mt-1 mb-0">
							You already have a registered <strong>{data.complementaryRole === 'customer' ? 'Client' : 'Worker'}</strong> account ({data.complementaryAccountName || data.user.name}) under <code>{data.user.email}</code>.
						</p>
					</div>

					<form 
						method="POST" 
						action="?/switchRole"
						class="flex flex-col gap-5"
						use:enhance={() => {
							switchSubmitting = true;
							return async ({ update }) => {
								switchSubmitting = false;
								await update();
							};
						}}
					>
						<input type="hidden" name="targetRole" value={data.complementaryRole} />

						<div class="flex flex-col gap-1.5">
							<label for="switch-password" class="font-medium text-[0.88rem] text-(--text-secondary)">Password for your {data.complementaryRole === 'customer' ? 'Client' : 'Worker'} Account</label>
							<div class="relative flex items-center">
								<KeyRound size={18} class="absolute left-3.5 text-(--text-muted) pointer-events-none" />
								<input 
									type="password" 
									id="switch-password" 
									name="password" 
									bind:value={switchPassword}
									placeholder="Enter {data.complementaryRole === 'customer' ? 'Client' : 'Worker'} password" 
									required
									class="w-full py-2.5 pr-3.5 pl-10.5 bg-(--bg-input) border border-(--border-color) rounded-md text-(--text-primary) text-[0.9rem] font-sans transition-colors focus:outline-none focus:border-(--border-focus) focus:ring-2 focus:ring-(--accent-light)"
								/>
							</div>
							<small class="text-[0.78rem] text-(--text-muted)">Enter the password for your other role to authenticate and switch dashboards.</small>
						</div>

						<div class="mt-2 flex justify-stretch sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
							<button 
								type="submit" 
								class="btn btn-primary inline-flex items-center justify-center gap-2"
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
					<div>
						<div class="flex items-center gap-2">
							<UserPlus size={20} class="text-(--accent)" />
							<h3 class="m-0 text-[1.2rem] font-semibold text-(--text-primary)">Create a {data.complementaryRole === 'customer' ? 'Client' : 'Worker'} Profile</h3>
						</div>
						<p class="text-(--text-muted) text-[0.85rem] mt-1 mb-0">
							Want to both {data.user.role === 'customer' ? 'hire and offer services as a Worker' : 'find sideline jobs and post jobs as a Client'}? Set up your {data.complementaryRole === 'customer' ? 'Client' : 'Worker'} profile below using your same email.
						</p>
					</div>

					<form 
						method="POST" 
						action="?/createComplementaryRole"
						class="flex flex-col gap-5"
						use:enhance={({ cancel }) => {
							const passCheck = validatePassword(newRolePassword);
							if (!passCheck.isValid) {
								toast.error(passCheck.error);
								cancel();
								return;
							}
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

						<div class="flex flex-col gap-1.5">
							<label for="new-role-email" class="font-medium text-[0.88rem] text-(--text-secondary)">Registered Email</label>
							<div class="relative flex items-center">
								<Mail size={18} class="absolute left-3.5 text-(--text-muted) pointer-events-none" />
								<input type="email" id="new-role-email" value={data.user.email} disabled class="w-full py-2.5 pr-3.5 pl-10.5 bg-(--bg-input) border border-(--border-color) rounded-md text-(--text-primary) text-[0.9rem] font-sans opacity-60 cursor-not-allowed" />
							</div>
						</div>

						<div class="flex flex-col gap-1.5">
							<label for="new-role-pass" class="font-medium text-[0.88rem] text-(--text-secondary)">Create Password for {data.complementaryRole === 'customer' ? 'Client' : 'Worker'} Profile</label>
							<div class="relative flex items-center">
								<Lock size={18} class="absolute left-3.5 text-(--text-muted) pointer-events-none" />
								<input 
									type="password" 
									id="new-role-pass" 
									name="password" 
									bind:value={newRolePassword}
									placeholder="e.g. Pass@123" 
									required
									class="w-full py-2.5 pr-3.5 pl-10.5 bg-(--bg-input) border border-(--border-color) rounded-md text-(--text-primary) text-[0.9rem] font-sans transition-colors focus:outline-none focus:border-(--border-focus) focus:ring-2 focus:ring-(--accent-light)"
								/>
							</div>
							<PasswordStrengthMeter password={newRolePassword} />
							<small class="text-[0.78rem] text-(--text-muted)">For security, your Client and Worker accounts under the same email must have different passwords.</small>
						</div>

						<div class="mt-2 flex justify-stretch sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
							<button 
								type="submit" 
								class="btn btn-primary inline-flex items-center justify-center gap-2"
								disabled={createRoleSubmitting || !validatePassword(newRolePassword).isValid}
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
