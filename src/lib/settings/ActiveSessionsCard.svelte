<script>
	import { Laptop, Smartphone, Tablet, ShieldAlert, LogOut, Globe, AlertCircle, Clock, Trash2 } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { fade, scale } from 'svelte/transition';

	let {
		currentSession = {
			deviceType: 'desktop',
			os: 'Windows 10/11',
			browser: 'Google Chrome',
			ip: 'Localhost (Dev)',
			lastActive: 'Active Now',
			isCurrent: true
		},
		activeSessions = []
	} = $props();

	let showConfirmModal = $state(false);
	let logoutType = $state('single'); // 'single' | 'all' | 'revoke'
	let selectedSession = $state(null);
	let isSubmitting = $state(false);

	function getDeviceIcon(type) {
		if (type === 'mobile') return Smartphone;
		if (type === 'tablet') return Tablet;
		return Laptop;
	}

	function formatLastActive(dateStr) {
		if (!dateStr || dateStr === 'Active Now') return 'Active Now';
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) return 'Active Now';
		const now = new Date();
		const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);
		if (diffSecs < 60) return 'Active just now';
		if (diffSecs < 3600) return `Active ${Math.floor(diffSecs / 60)}m ago`;
		if (diffSecs < 86400) return `Active ${Math.floor(diffSecs / 3600)}h ago`;
		return `Last seen ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
	}

	function openLogoutModal(type = 'single', session = null) {
		logoutType = type;
		selectedSession = session;
		showConfirmModal = true;
	}

	// Determine current device and other active devices
	const currentDevice = $derived(
		activeSessions.find(s => s.isCurrent) || currentSession
	);

	const otherDevices = $derived(
		activeSessions.filter(s => !s.isCurrent)
	);

	const CurrentDeviceIcon = $derived(getDeviceIcon(currentDevice?.deviceType));
</script>

<div class="bg-(--bg-card) border border-(--border-color) rounded-lg p-3.5 min-[380px]:p-5 sm:p-7 shadow-(--shadow-sm) flex flex-col gap-5 sm:gap-6">
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
		<div>
			<h3 class="text-[1.2rem] font-semibold text-(--text-primary) mb-1 flex items-center gap-2">
				<Globe size={20} class="text-(--accent)" />
				<span>Active Devices & Sessions</span>
			</h3>
			<p class="text-(--text-muted) text-[0.85rem] m-0">
				Manage and monitor devices where your Serviee account is currently signed in.
			</p>
		</div>
		<div class="self-start sm:self-auto">
			<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-(--accent-light) text-(--accent) border border-(--accent)/20">
				{activeSessions.length || 1} {activeSessions.length === 1 ? 'Device' : 'Devices'} Connected
			</span>
		</div>
	</div>

	<!-- Current Active Device -->
	<div class="flex flex-col gap-2.5">
		<span class="text-[0.75rem] font-semibold text-(--text-muted) uppercase tracking-wider">
			Current Active Device
		</span>

		<div class="p-3.5 sm:p-4 bg-(--bg-input) border border-(--border-color) rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 transition-all hover:border-(--text-muted)">
			<div class="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
				<div class="w-10 h-10 rounded-full bg-(--accent-light) text-(--accent) flex items-center justify-center shrink-0">
					<CurrentDeviceIcon size={20} />
				</div>
				<div class="flex flex-col min-w-0">
					<div class="flex items-center gap-2 flex-wrap">
						<span class="font-semibold text-[0.95rem] text-(--text-primary) truncate">
							{currentDevice?.browser || 'Web Browser'} on {currentDevice?.os || 'Device'}
						</span>
						<span class="text-xs text-emerald-500 font-medium">
							(this device)
						</span>
					</div>
					<div class="text-[0.8rem] text-(--text-secondary) mt-0.5 flex items-center gap-2 flex-wrap">
						<span>IP: <code class="text-xs bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded font-mono">{currentDevice?.ip || 'Unknown'}</code></span>
						<span>•</span>
						<span>Status: Active Now</span>
					</div>
				</div>
			</div>

			<!-- Current Device Logout Button -->
			<button
				type="button"
				class="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium text-red-500 bg-red-500/5 hover:bg-red-500 hover:text-white transition-all cursor-pointer shrink-0 border border-red-500/20 hover:border-red-500"
				onclick={() => openLogoutModal('single')}
				title="Log out from this device"
				id="btn-logout-current-device"
			>
				<LogOut size={14} />
				<span>Log out</span>
			</button>
		</div>
	</div>

	<!-- Other Connected Devices (if any) -->
	{#if otherDevices.length > 0}
		<div class="flex flex-col gap-2.5">
			<span class="text-[0.75rem] font-semibold text-(--text-muted) uppercase tracking-wider">
				Other Signed-In Devices ({otherDevices.length})
			</span>

			<div class="flex flex-col gap-2.5">
				{#each otherDevices as device (device.id || device.sessionId)}
					{@const Icon = getDeviceIcon(device.deviceType)}
					<div class="p-3.5 sm:p-4 bg-(--bg-input) border border-(--border-color) rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 transition-all hover:border-(--text-muted)">
						<div class="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
							<div class="w-10 h-10 rounded-full bg-gray-500/10 text-(--text-secondary) flex items-center justify-center shrink-0">
								<Icon size={20} />
							</div>
							<div class="flex flex-col min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<span class="font-semibold text-[0.95rem] text-(--text-primary) truncate">
										{device.browser || 'Web Browser'} on {device.os || 'Device'}
									</span>
								</div>
								<div class="text-[0.8rem] text-(--text-secondary) mt-0.5 flex items-center gap-2 flex-wrap">
									<span>IP: <code class="text-xs bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded font-mono">{device.ip || 'Unknown'}</code></span>
									<span>•</span>
									<span class="flex items-center gap-1">
										<Clock size={12} class="text-(--text-muted)" />
										{formatLastActive(device.lastActive)}
									</span>
								</div>
							</div>
						</div>

						<!-- Revoke Individual Device Button -->
						<button
							type="button"
							class="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium text-red-500 bg-red-500/5 hover:bg-red-500 hover:text-white transition-all cursor-pointer shrink-0 border border-red-500/20 hover:border-red-500"
							onclick={() => openLogoutModal('revoke', device)}
							title="Revoke session for this device"
						>
							<Trash2 size={13} />
							<span>Revoke Access</span>
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Security Notice Info Box -->
	<div class="p-3.5 bg-blue-500/5 dark:bg-blue-400/5 border border-blue-500/20 rounded-md flex items-start gap-2.5 text-xs text-(--text-secondary)">
		<AlertCircle size={16} class="text-blue-500 shrink-0 mt-0.5" />
		<div class="leading-relaxed">
			If you notice suspicious activity or logged in from a shared computer, click <strong>"Log Out from All Devices"</strong> below to immediately terminate all active sessions across all devices.
		</div>
	</div>

	<!-- Action Footer: Log Out All Devices -->
	<div class="pt-2 border-t border-(--border-color) flex justify-end">
		<button
			type="button"
			class="btn btn-outline border-red-500 text-red-500 hover:bg-red-500 hover:text-white inline-flex items-center gap-2 py-2 px-4 text-xs sm:text-sm font-medium transition-colors w-full sm:w-auto justify-center cursor-pointer"
			onclick={() => openLogoutModal('all')}
			id="btn-logout-all-devices"
		>
			<LogOut size={16} />
			<span>Log Out from All Devices</span>
		</button>
	</div>
</div>

<!-- Log Out & Revoke Confirmation Modal -->
{#if showConfirmModal}
	<div 
		class="fixed inset-0 bg-black/75 backdrop-blur-xs z-99999 flex items-center justify-center p-4 box-border" 
		onclick={(e) => { if (e.target === e.currentTarget && !isSubmitting) showConfirmModal = false; }} 
		onkeydown={(e) => { if (e.key === 'Escape' && !isSubmitting) showConfirmModal = false; }}
		role="dialog" 
		aria-modal="true"
		tabindex="-1"
		transition:fade={{ duration: 75 }}
	>
		<div 
			class="max-w-110 w-full border border-(--border-color) shadow-(--shadow-lg) p-6 sm:p-7 text-center rounded-lg bg-(--bg-card) box-border card flex flex-col gap-4" 
			role="document"
			transition:scale={{ duration: 75, start: 0.98 }}
		>
			<div class="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
				<ShieldAlert size={26} />
			</div>

			<div>
				<h3 class="text-[1.25rem] font-bold text-(--text-primary) mb-1.5">
					{#if logoutType === 'all'}
						Log Out of All Devices?
					{:else if logoutType === 'revoke'}
						Revoke Device Session?
					{:else}
						Log Out of this Device?
					{/if}
				</h3>
				<p class="text-[0.88rem] text-(--text-secondary) leading-relaxed m-0">
					{#if logoutType === 'all'}
						This will invalidate all active sessions and sign you out across all browsers, mobile phones, and computers. You will need to log in again on all devices.
					{:else if logoutType === 'revoke'}
						This will immediately terminate access for <strong>{selectedSession?.browser || 'Browser'} on {selectedSession?.os || 'Device'}</strong> (IP: {selectedSession?.ip || 'Unknown'}).
					{:else}
						Are you sure you want to log out of this device? You will need to enter your password to log in again.
					{/if}
				</p>
			</div>

			<form 
				method="POST" 
				action={logoutType === 'all' ? '?/logoutAllDevices' : logoutType === 'revoke' ? '?/revokeSession' : '/logout'} 
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						showConfirmModal = false;
						await update();
					};
				}}
				class="flex gap-3 justify-center mt-2 flex-wrap sm:flex-nowrap"
			>
				{#if logoutType === 'revoke' && selectedSession}
					<input type="hidden" name="sessionId" value={selectedSession.sessionId} />
				{/if}

				<button 
					type="button" 
					class="btn btn-secondary py-2 px-5 text-[0.9rem] flex-1 cursor-pointer" 
					onclick={() => showConfirmModal = false}
					disabled={isSubmitting}
				>
					Cancel
				</button>

				<button 
					type="submit" 
					class="btn bg-red-500 hover:bg-red-600 border-red-500 hover:border-red-600 text-white py-2 px-5 text-[0.9rem] inline-flex items-center justify-center gap-1.5 flex-1 font-semibold cursor-pointer" 
					disabled={isSubmitting}
				>
					{#if isSubmitting}
						<span class="spinner spinner-sm"></span>
						<span>Processing...</span>
					{:else}
						<LogOut size={16} />
						<span>
							{#if logoutType === 'all'}
								Log Out All Devices
							{:else if logoutType === 'revoke'}
								Revoke Session
							{:else}
								Confirm Log Out
							{/if}
						</span>
					{/if}
				</button>
			</form>
		</div>
	</div>
{/if}
