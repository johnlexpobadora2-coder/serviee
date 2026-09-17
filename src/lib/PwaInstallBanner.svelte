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
		if (typeof window !== 'undefined' && window['deferredPwaPrompt']) {
			deferredPrompt = window['deferredPwaPrompt'];
		}

		// Capture Android/Chrome beforeinstallprompt event
		const handleBeforeInstallPrompt = (e) => {
			e.preventDefault();
			deferredPrompt = e;
			window['deferredPwaPrompt'] = e;
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
		const promptToUse = deferredPrompt || (typeof window !== 'undefined' ? window['deferredPwaPrompt'] : null);
		if (promptToUse) {
			promptToUse.prompt();
			const { outcome } = await promptToUse.userChoice;
			if (outcome === 'accepted') {
				showInstallBanner = false;
			}
			deferredPrompt = null;
			if (typeof window !== 'undefined') window['deferredPwaPrompt'] = null;
		} else {
			showIosModal = true;
		}
	}

	export function triggerInstall() {
		const promptToUse = deferredPrompt || (typeof window !== 'undefined' ? window['deferredPwaPrompt'] : null);
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
	<div class="fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-120 bg-(--bg-card) backdrop-blur-md border border-(--border-color) rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xl z-9999" role="banner" aria-label="Install Serviee App">
		<div class="flex items-center gap-3 min-w-0">
			<img src="/ServieeLogo.png" alt="Serviee App Icon" class="w-10.5 h-10.5 rounded-[0.65rem] object-cover shrink-0 shadow" />
			<div class="flex flex-col min-w-0">
				<h4 class="text-[0.95rem] font-bold text-(--text-primary) m-0 leading-tight truncate">Install Serviee App</h4>
				<p class="text-[0.78rem] text-(--text-muted) m-0 leading-tight truncate">Install on your phone for faster and direct access!</p>
			</div>
		</div>
		<div class="flex items-center gap-2 shrink-0">
			<button type="button" class="inline-flex items-center gap-1.5 bg-linear-to-br from-(--accent) to-blue-600 hover:brightness-110 text-white text-[0.85rem] font-semibold py-2 px-3.5 rounded-[0.6rem] border-none cursor-pointer transition-all duration-200" onclick={handleInstallClick}>
				<Download size={16} />
				<span>Install</span>
			</button>
			<button type="button" class="bg-transparent border-none text-(--text-muted) hover:bg-white/10 hover:text-(--text-primary) p-1.5 rounded-lg cursor-pointer inline-flex items-center justify-center transition-colors duration-200" onclick={dismissBanner} aria-label="Dismiss banner">
				<X size={18} />
			</button>
		</div>
	</div>
{/if}

{#if showIosModal}
	<div 
		class="fixed inset-0 bg-black/65 backdrop-blur-[6px] z-10000 flex items-center justify-center p-5" 
		onclick={(e) => { if (e.target === e.currentTarget) closeIosModal(); }} 
		onkeydown={(e) => { if (e.key === 'Escape') closeIosModal(); }}
		role="dialog" 
		aria-modal="true" 
		aria-labelledby="ios-modal-title"
		tabindex="-1"
	>
		<div class="bg-(--bg-card) border border-(--border-color) rounded-[1.25rem] w-full max-w-110 overflow-hidden shadow-2xl" role="document">
			<div class="py-5 px-6 border-b border-(--border-color) flex items-center justify-between">
				<div class="flex items-center gap-2.5 text-(--text-primary)">
					<Smartphone size={24} />
					<h3 id="ios-modal-title" class="text-[1.1rem] font-bold m-0">{isIos ? 'Install Serviee on iPhone / iPad' : 'Install Serviee App'}</h3>
				</div>
				<button type="button" class="bg-transparent border-none text-(--text-muted) hover:text-(--text-primary) hover:bg-white/10 cursor-pointer p-1.5 rounded-lg transition-colors" onclick={closeIosModal}>
					<X size={20} />
				</button>
			</div>

			<div class="p-6">
				<p class="text-[0.9rem] text-(--text-secondary) mt-0 mb-5">Follow these steps to add Serviee to your Home Screen:</p>

				<ol class="list-none p-0 m-0 flex flex-col gap-4">
					{#if isIos}
						<li class="flex gap-3.5 items-start bg-white/5 border border-white/10 p-3.5 rounded-2xl">
							<div class="w-7 h-7 rounded-full bg-(--accent) text-white font-bold text-[0.85rem] flex items-center justify-center shrink-0 mt-0.5">1</div>
							<div class="flex flex-col gap-1.5">
								<p class="m-0 text-[0.88rem] text-(--text-primary) leading-snug">Tap the <strong>Share button</strong> at the bottom of Safari browser.</p>
								<div class="inline-flex items-center gap-1.5 bg-black/25 py-1 px-2.5 rounded-md text-[0.78rem] text-(--text-muted) w-fit">
									<Share size={20} class="text-blue-400" />
									<span>Share Icon</span>
								</div>
							</div>
						</li>
						<li class="flex gap-3.5 items-start bg-white/5 border border-white/10 p-3.5 rounded-2xl">
							<div class="w-7 h-7 rounded-full bg-(--accent) text-white font-bold text-[0.85rem] flex items-center justify-center shrink-0 mt-0.5">2</div>
							<div class="flex flex-col gap-1.5">
								<p class="m-0 text-[0.88rem] text-(--text-primary) leading-snug">Scroll down and tap <strong>"Add to Home Screen"</strong>.</p>
								<div class="inline-flex items-center gap-1.5 bg-black/25 py-1 px-2.5 rounded-md text-[0.78rem] text-(--text-muted) w-fit">
									<PlusSquare size={20} class="text-emerald-400" />
									<span>Add to Home Screen</span>
								</div>
							</div>
						</li>
						<li class="flex gap-3.5 items-start bg-white/5 border border-white/10 p-3.5 rounded-2xl">
							<div class="w-7 h-7 rounded-full bg-(--accent) text-white font-bold text-[0.85rem] flex items-center justify-center shrink-0 mt-0.5">3</div>
							<div class="flex flex-col gap-1.5">
								<p class="m-0 text-[0.88rem] text-(--text-primary) leading-snug">Tap <strong>"Add"</strong> at the top right corner. You're all set!</p>
								<div class="inline-flex items-center gap-1.5 bg-black/25 py-1 px-2.5 rounded-md text-[0.78rem] text-(--text-muted) w-fit">
									<CheckCircle size={20} class="text-amber-400" />
									<span>Tap Add</span>
								</div>
							</div>
						</li>
					{:else}
						<li class="flex gap-3.5 items-start bg-white/5 border border-white/10 p-3.5 rounded-2xl">
							<div class="w-7 h-7 rounded-full bg-(--accent) text-white font-bold text-[0.85rem] flex items-center justify-center shrink-0 mt-0.5">1</div>
							<div class="flex flex-col gap-1.5">
								<p class="m-0 text-[0.88rem] text-(--text-primary) leading-snug">Tap the browser <strong>Menu button (3 dots ⋮)</strong> at the top or bottom of the screen.</p>
								<div class="inline-flex items-center gap-1.5 bg-black/25 py-1 px-2.5 rounded-md text-[0.78rem] text-(--text-muted) w-fit">
									<Smartphone size={20} class="text-blue-400" />
									<span>Browser Menu</span>
								</div>
							</div>
						</li>
						<li class="flex gap-3.5 items-start bg-white/5 border border-white/10 p-3.5 rounded-2xl">
							<div class="w-7 h-7 rounded-full bg-(--accent) text-white font-bold text-[0.85rem] flex items-center justify-center shrink-0 mt-0.5">2</div>
							<div class="flex flex-col gap-1.5">
								<p class="m-0 text-[0.88rem] text-(--text-primary) leading-snug">Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</p>
								<div class="inline-flex items-center gap-1.5 bg-black/25 py-1 px-2.5 rounded-md text-[0.78rem] text-(--text-muted) w-fit">
									<PlusSquare size={20} class="text-emerald-400" />
									<span>Install App</span>
								</div>
							</div>
						</li>
						<li class="flex gap-3.5 items-start bg-white/5 border border-white/10 p-3.5 rounded-2xl">
							<div class="w-7 h-7 rounded-full bg-(--accent) text-white font-bold text-[0.85rem] flex items-center justify-center shrink-0 mt-0.5">3</div>
							<div class="flex flex-col gap-1.5">
								<p class="m-0 text-[0.88rem] text-(--text-primary) leading-snug">Confirm installation. The Serviee app icon will appear on your phone!</p>
								<div class="inline-flex items-center gap-1.5 bg-black/25 py-1 px-2.5 rounded-md text-[0.78rem] text-(--text-muted) w-fit">
									<CheckCircle size={20} class="text-amber-400" />
									<span>Installed</span>
								</div>
							</div>
						</li>
					{/if}
				</ol>
			</div>

			<div class="p-5 pt-4 border-t border-(--border-color) flex justify-end">
				<button type="button" class="w-full bg-(--accent) hover:brightness-110 text-white text-[0.95rem] font-semibold py-3 rounded-xl border-none cursor-pointer transition-all duration-200" onclick={closeIosModal}>
					Got it
				</button>
			</div>
		</div>
	</div>
{/if}
