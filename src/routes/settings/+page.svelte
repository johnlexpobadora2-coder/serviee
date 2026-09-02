<script>
	import { User, Lock, Shield, CheckCircle2, AlertCircle, Phone, MapPin, Mail, ArrowLeft, KeyRound } from 'lucide-svelte';
	import { CITIES_MUNICIPALITIES } from '$lib/locations.js';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let activeTab = $state('profile'); // 'profile' | 'password'

	$effect(() => {
		if (form?.passwordError || form?.passwordSuccess) {
			activeTab = 'password';
		} else if (form?.profileError || form?.profileSuccess) {
			activeTab = 'profile';
		}
	});

	// Local form states initialized from loaded user data
	let name = $state('');
	let phone = $state('');
	let address = $state('');

	$effect(() => {
		name = data.user?.name || '';
		phone = data.user?.phone || '';
		address = data.user?.address || '';
	});

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');

	$effect(() => {
		if (form?.passwordSuccess) {
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		}
	});

	let profileSubmitting = $state(false);
	let passwordSubmitting = $state(false);
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
		<div class="tabs-header" role="tablist">
			<button
				type="button"
				class="tab-btn"
				class:active={activeTab === 'profile'}
				onclick={() => (activeTab = 'profile')}
				role="tab"
				aria-selected={activeTab === 'profile'}
			>
				<User size={18} />
				Profile Customization
			</button>
			<button
				type="button"
				class="tab-btn"
				class:active={activeTab === 'password'}
				onclick={() => (activeTab = 'password')}
				role="tab"
				aria-selected={activeTab === 'password'}
			>
				<Lock size={18} />
				Change Password
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

				{#if form?.profileError}
					<div class="alert alert-error">
						<AlertCircle size={18} />
						<span>{form.profileError}</span>
					</div>
				{/if}

				<form
					method="POST"
					action="?/updateProfile"
					class="settings-form"
					use:enhance={() => {
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
						<small class="field-hint">Email address cannot be changed for account security.</small>
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

					<div class="form-group">
						<label for="address">City/Municipality</label>
						<div class="input-wrapper">
							<MapPin size={18} class="input-icon" />
							<select
								id="address"
								name="address"
								bind:value={address}
							>
								<option value="" disabled selected={!address}>Select City / Municipality...</option>
								{#each CITIES_MUNICIPALITIES as city}
									<option value={city}>{city}</option>
								{/each}
							</select>
						</div>
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

		<!-- Tab Content 2: Change Password -->
		{#if activeTab === 'password'}
			<div class="tab-panel">
				<div class="panel-header">
					<h3>Security & Password</h3>
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
		{/if}
	</div>
</div>

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
		box-shadow: var(--glow);
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
		padding: 0.25rem 0.6rem;
		border-radius: var(--radius-full);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.role-badge.customer {
		background: hsla(215, 80%, 55%, 0.15);
		color: hsl(215, 80%, 65%);
		border: 1px solid hsla(215, 80%, 55%, 0.3);
	}

	.role-badge.worker {
		background: hsla(142, 70%, 45%, 0.15);
		color: hsl(142, 70%, 55%);
		border: 1px solid hsla(142, 70%, 45%, 0.3);
	}

	.user-email {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.tabs-header {
		margin-bottom: 0;
	}

	.tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
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

	.input-wrapper input,
	.input-wrapper select {
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

	.input-wrapper select {
		cursor: pointer;
		appearance: auto;
	}

	.input-wrapper input:focus,
	.input-wrapper select:focus {
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
		.user-profile-card {
			flex-direction: column;
			text-align: center;
		}

		.name-badge-row {
			justify-content: center;
		}

		.tab-buttons {
			flex-direction: column;
		}

		.tab-btn {
			width: 100%;
			justify-content: center;
		}

		.form-actions {
			justify-content: stretch;
		}

		.form-actions button {
			width: 100%;
		}
	}
</style>
