<script>
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	import { Download, X, Share, PlusSquare, Smartphone, CheckCircle } from 'lucide-svelte';

	let deferredPrompt = $state(null);
	let showInstallBanner = $state(false);
	let showIosModal = $state(false);
	let isIos = $state(false);
	let isStandalone = $state(false);

	onMount(() => {
		// Check if already running in standalone (installed PWA) mode
		const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
			('standalone' in window.navigator && /** @type {any} */ (window.navigator).standalone === true);
		
		if (isStandaloneMode) {
			isStandalone = true;
			return;
		}

		// Detect iOS Safari
		const ua = window.navigator.userAgent;
		const isIosDevice = /iPhone|iPad|iPod/.test(ua) && !('MSStream' in window);
		const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
		
		if (isIosDevice && isSafari) {
			isIos = true;
		}

		// Check if user dismissed prompt recently
		const dismissed = localStorage.getItem('serviee_pwa_dismissed');
		const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
		const now = Date.now();
		// Show prompt again after 3 days if dismissed
		const isDismissedRecently = (now - dismissedTime) < (3 * 24 * 60 * 60 * 1000);

		// Check if prompt was captured early
		if (typeof window !== 'undefined' && window.deferredPwaPrompt) {
			deferredPrompt = window.deferredPwaPrompt;
		}

		// Capture Android/Chrome beforeinstallprompt event
		const handleBeforeInstallPrompt = (e) => {
			e.preventDefault();
			deferredPrompt = e;
			window.deferredPwaPrompt = e;
			if (!isDismissedRecently) {
				showInstallBanner = true;
			}
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

		// Show iOS banner if on iOS Safari and not dismissed recently
		if (isIos && !isDismissedRecently) {
			showInstallBanner = true;
		}

		// Register Service Worker (dev-sw.js in Vite dev mode, service-worker.js in production)
		if ('serviceWorker' in navigator) {
			const swScript = dev ? '/dev-sw.js' : '/service-worker.js';
			navigator.serviceWorker.register(swScript, { scope: '/' })
				.catch((err) => console.log('Service Worker registration:', err));
		}

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		};
	});

	async function handleInstallClick() {
		const promptToUse = deferredPrompt || (typeof window !== 'undefined' ? window.deferredPwaPrompt : null);
		if (promptToUse) {
			promptToUse.prompt();
			const { outcome } = await promptToUse.userChoice;
			if (outcome === 'accepted') {
				showInstallBanner = false;
			}
			deferredPrompt = null;
			if (typeof window !== 'undefined') window.deferredPwaPrompt = null;
		} else {
			showIosModal = true;
		}
	}

	export function triggerInstall() {
		const promptToUse = deferredPrompt || (typeof window !== 'undefined' ? window.deferredPwaPrompt : null);
		if (promptToUse) {
			handleInstallClick();
		} else {
			showIosModal = true;
		}
	}

	export function getIsStandalone() {
		return isStandalone;
	}

	function dismissBanner() {
		showInstallBanner = false;
		localStorage.setItem('serviee_pwa_dismissed', Date.now().toString());
	}

	function closeIosModal() {
		showIosModal = false;
	}
</script>

{#if showInstallBanner && !isStandalone}
	<div class="pwa-install-banner" role="banner" aria-label="Install Serviee App">
		<div class="pwa-banner-content">
			<img src="/ServieeLogo.png" alt="Serviee App Icon" class="pwa-app-icon" />
			<div class="pwa-app-info">
				<h4 class="pwa-app-title">Install Serviee App</h4>
				<p class="pwa-app-desc">Install on your phone for faster and direct access!</p>
			</div>
		</div>
		<div class="pwa-banner-actions">
			<button type="button" class="btn-pwa-install" onclick={handleInstallClick}>
				<Download size={16} />
				<span>Install</span>
			</button>
			<button type="button" class="btn-pwa-close" onclick={dismissBanner} aria-label="Dismiss banner">
				<X size={18} />
			</button>
		</div>
	</div>
{/if}

{#if showIosModal}
	<div class="ios-modal-backdrop" onclick={closeIosModal} role="presentation">
		<div class="ios-modal-card" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ios-modal-title">
			<div class="ios-modal-header">
				<div class="ios-modal-header-title">
					<Smartphone class="ios-modal-icon" size={24} />
					<h3 id="ios-modal-title">{isIos ? 'Install Serviee on iPhone / iPad' : 'Install Serviee App'}</h3>
				</div>
				<button type="button" class="btn-modal-close" onclick={closeIosModal}>
					<X size={20} />
				</button>
			</div>

			<div class="ios-modal-body">
				<p class="ios-intro-text">Follow these steps to add Serviee to your Home Screen:</p>

				<ol class="ios-steps-list">
					{#if isIos}
						<li class="ios-step-item">
							<div class="step-num">1</div>
							<div class="step-content">
								<p>Tap the <strong>Share button</strong> at the bottom of Safari browser.</p>
								<div class="step-icon-badge">
									<Share size={20} class="text-blue-400" />
									<span>Share Icon</span>
								</div>
							</div>
						</li>
						<li class="ios-step-item">
							<div class="step-num">2</div>
							<div class="step-content">
								<p>Scroll down and tap <strong>"Add to Home Screen"</strong>.</p>
								<div class="step-icon-badge">
									<PlusSquare size={20} class="text-emerald-400" />
									<span>Add to Home Screen</span>
								</div>
							</div>
						</li>
						<li class="ios-step-item">
							<div class="step-num">3</div>
							<div class="step-content">
								<p>Tap <strong>"Add"</strong> at the top right corner. You're all set!</p>
								<div class="step-icon-badge">
									<CheckCircle size={20} class="text-amber-400" />
									<span>Tap Add</span>
								</div>
							</div>
						</li>
					{:else}
						<li class="ios-step-item">
							<div class="step-num">1</div>
							<div class="step-content">
								<p>Tap the browser <strong>Menu button (3 dots ⋮)</strong> at the top or bottom of the screen.</p>
								<div class="step-icon-badge">
									<Smartphone size={20} class="text-blue-400" />
									<span>Browser Menu</span>
								</div>
							</div>
						</li>
						<li class="ios-step-item">
							<div class="step-num">2</div>
							<div class="step-content">
								<p>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</p>
								<div class="step-icon-badge">
									<PlusSquare size={20} class="text-emerald-400" />
									<span>Install App</span>
								</div>
							</div>
						</li>
						<li class="ios-step-item">
							<div class="step-num">3</div>
							<div class="step-content">
								<p>Confirm installation. The Serviee app icon will appear on your phone!</p>
								<div class="step-icon-badge">
									<CheckCircle size={20} class="text-amber-400" />
									<span>Installed</span>
								</div>
							</div>
						</li>
					{/if}
				</ol>
			</div>

			<div class="ios-modal-footer">
				<button type="button" class="btn-ios-done" onclick={closeIosModal}>
					Got it
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* PWA Floating Bottom Banner */
	.pwa-install-banner {
		position: fixed;
		bottom: 1.25rem;
		left: 50%;
		transform: translateX(-50%);
		width: calc(100% - 2.5rem);
		max-width: 480px;
		background: var(--bg-card, rgba(15, 23, 42, 0.95));
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
		border-radius: 1rem;
		padding: 0.85rem 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
		z-index: 9999;
		animation: pwaSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes pwaSlideUp {
		from {
			opacity: 0;
			transform: translate(-50%, 1.5rem);
		}
		to {
			opacity: 1;
			transform: translate(-50%, 0);
		}
	}

	.pwa-banner-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}

	.pwa-app-icon {
		width: 42px;
		height: 42px;
		border-radius: 0.65rem;
		object-fit: cover;
		flex-shrink: 0;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.pwa-app-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.pwa-app-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--text-primary, #f8fafc);
		margin: 0;
		line-height: 1.25;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.pwa-app-desc {
		font-size: 0.78rem;
		color: var(--text-muted, #94a3b8);
		margin: 0;
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.pwa-banner-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.btn-pwa-install {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		background: linear-gradient(135deg, var(--accent, #3b82f6), #2563eb);
		color: #ffffff;
		font-size: 0.85rem;
		font-weight: 600;
		padding: 0.5rem 0.9rem;
		border-radius: 0.6rem;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
	}

	.btn-pwa-install:hover {
		transform: translateY(-1px);
		filter: brightness(1.1);
	}

	.btn-pwa-close {
		background: transparent;
		border: none;
		color: var(--text-muted, #94a3b8);
		padding: 0.4rem;
		border-radius: 0.5rem;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}

	.btn-pwa-close:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-primary, #f8fafc);
	}

	/* iOS Safari Instruction Modal */
	.ios-modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.25rem;
		animation: fadeIn 0.2s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.ios-modal-card {
		background: var(--bg-card, #0f172a);
		border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
		border-radius: 1.25rem;
		width: 100%;
		max-width: 440px;
		overflow: hidden;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes popIn {
		from { opacity: 0; transform: scale(0.95); }
		to { opacity: 1; transform: scale(1); }
	}

	.ios-modal-header {
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.ios-modal-header-title {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		color: var(--text-primary, #f8fafc);
	}

	.ios-modal-header-title h3 {
		font-size: 1.1rem;
		font-weight: 700;
		margin: 0;
	}

	.btn-modal-close {
		background: transparent;
		border: none;
		color: var(--text-muted, #94a3b8);
		cursor: pointer;
		padding: 0.3rem;
		border-radius: 0.5rem;
	}

	.ios-modal-body {
		padding: 1.5rem;
	}

	.ios-intro-text {
		font-size: 0.9rem;
		color: var(--text-secondary, #cbd5e1);
		margin-top: 0;
		margin-bottom: 1.25rem;
	}

	.ios-steps-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.ios-step-item {
		display: flex;
		gap: 0.85rem;
		align-items: flex-start;
		background: var(--bg-hover, rgba(255, 255, 255, 0.04));
		border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
		padding: 0.85rem 1rem;
		border-radius: 0.85rem;
	}

	.step-num {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--accent, #3b82f6);
		color: #ffffff;
		font-weight: 700;
		font-size: 0.85rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-top: 0.1rem;
	}

	.step-content {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.step-content p {
		margin: 0;
		font-size: 0.88rem;
		color: var(--text-primary, #f8fafc);
		line-height: 1.35;
	}

	.step-icon-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: rgba(0, 0, 0, 0.25);
		padding: 0.25rem 0.6rem;
		border-radius: 0.4rem;
		font-size: 0.78rem;
		color: var(--text-muted, #94a3b8);
		width: fit-content;
	}

	.ios-modal-footer {
		padding: 1rem 1.5rem 1.25rem;
		border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
		display: flex;
		justify-content: flex-end;
	}

	.btn-ios-done {
		width: 100%;
		background: var(--accent, #3b82f6);
		color: #ffffff;
		font-size: 0.95rem;
		font-weight: 600;
		padding: 0.7rem;
		border-radius: 0.65rem;
		border: none;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-ios-done:hover {
		filter: brightness(1.1);
	}
</style>
