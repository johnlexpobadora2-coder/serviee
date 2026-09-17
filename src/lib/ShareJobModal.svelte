<script>
	import { 
		X, 
		Copy, 
		Check, 
		Share2, 
		MessageSquare, 
		Send, 
		Smartphone, 
		Tag, 
		MapPin, 
		Banknote 
	} from 'lucide-svelte';

	/**
	 * @type {{
	 *  isOpen?: boolean,
	 *  job?: any,
	 *  onClose?: () => void
	 * }}
	 */
	let {
		isOpen = false,
		job = null,
		onClose = () => {}
	} = $props();

	let copied = $state(false);
	let copyTimer = null;

	$effect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	});

	const canNativeShare = $derived(
		typeof navigator !== 'undefined' && !!navigator.share
	);

	function getJobUrl() {
		if (typeof window === 'undefined' || !job) return '';
		const baseUrl = window.location.origin;
		return `${baseUrl}/worker?search=${encodeURIComponent(job.title || '')}&jobId=${job.id}`;
	}

	function getShareText() {
		if (!job) return '';
		return `Tingnan mo 'tong sideline sa Serviee: "${job.title}" - ₱${Number(job.budget || 0).toLocaleString()} sa ${job.location || 'Pilipinas'}! ${getJobUrl()}`;
	}

	async function handleCopyLink() {
		const text = getJobUrl() || getShareText();
		try {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(text);
			} else {
				const input = document.createElement('textarea');
				input.value = text;
				document.body.appendChild(input);
				input.select();
				document.execCommand('copy');
				document.body.removeChild(input);
			}
			copied = true;
			if (copyTimer) clearTimeout(copyTimer);
			copyTimer = setTimeout(() => {
				copied = false;
			}, 2500);
		} catch (err) {
			console.error('Copy failed:', err);
		}
	}

	async function handleNativeShare() {
		if (!canNativeShare || !job) return;
		try {
			await navigator.share({
				title: `${job.title} | Serviee Sideline Job`,
				text: `Sideline job posting: ${job.title} (₱${Number(job.budget || 0).toLocaleString()})`,
				url: getJobUrl()
			});
		} catch (err) {
			if (err.name !== 'AbortError') {
				console.error('Native share failed:', err);
			}
		}
	}

	function shareViaMessenger() {
		const url = encodeURIComponent(getJobUrl());
		window.open(`https://www.facebook.com/dialog/send?link=${url}&app_id=291494419107518&redirect_uri=${url}`, '_blank', 'noopener,noreferrer');
	}

	function shareViaWhatsApp() {
		const text = encodeURIComponent(getShareText());
		window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
	}

	function shareViaSMS() {
		const text = encodeURIComponent(getShareText());
		window.location.href = `sms:?body=${text}`;
	}

	function shareViaTelegram() {
		const url = encodeURIComponent(getJobUrl());
		const text = encodeURIComponent(`Sideline Job: ${job?.title || ''} (₱${Number(job?.budget || 0).toLocaleString()})`);
		window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank', 'noopener,noreferrer');
	}

	function handleKeydown(e) {
		if (e.key === 'Escape' && isOpen) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && job}
	<div 
		class="fixed inset-0 bg-black/65 backdrop-blur-[6px] z-9999 flex items-center justify-center p-4 max-sm:items-end max-sm:p-0" 
		onclick={() => onClose()}
		role="presentation"
	>
		<div 
			class="bg-(--bg-card) border border-(--border-color) rounded-2xl max-sm:rounded-b-none max-sm:rounded-t-2xl w-full max-w-120 p-6 max-sm:p-5 max-sm:pb-8 shadow-2xl flex flex-col gap-5 outline-none" 
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			tabindex="-1"
			aria-labelledby="share-modal-title"
			aria-modal="true"
		>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-(--accent-light) text-(--accent) flex items-center justify-center">
						<Share2 size={18} />
					</div>
					<div>
						<h3 id="share-modal-title" class="text-[1.15rem] font-bold m-0 text-(--text-primary)">Share Sideline Job</h3>
						<p class="text-[0.8rem] m-0 text-(--text-muted)">Ipasa sa kapwa worker o kaibigan</p>
					</div>
				</div>
				<button 
					type="button" 
					class="bg-transparent border-none text-(--text-muted) hover:text-(--text-primary) hover:bg-white/10 cursor-pointer p-1.5 rounded-lg flex items-center justify-center transition-all duration-150" 
					onclick={() => onClose()}
					aria-label="Close share dialog"
				>
					<X size={18} />
				</button>
			</div>

			<!-- Job Summary Snippet -->
			<div class="bg-(--bg-input) border border-(--border-color) rounded-xl p-3.5 flex flex-col gap-1.5">
				<div class="inline-flex items-center gap-1.5 text-[0.72rem] text-(--accent) font-semibold uppercase tracking-wider">
					<Tag size={12} />
					<span>{job.category || 'General'}</span>
				</div>
				<h4 class="text-[0.95rem] font-semibold m-0 text-(--text-primary) leading-[1.35]">{job.title}</h4>
				<div class="flex flex-wrap items-center gap-3.5 mt-1 text-[0.82rem] text-(--text-secondary)">
					<span class="inline-flex items-center gap-1.5">
						<Banknote size={13} class="text-(--accent)" />
						<strong>₱{Number(job.budget || 0).toLocaleString()}</strong>
					</span>
					<span class="inline-flex items-center gap-1.5">
						<MapPin size={13} class="text-sky-400" />
						<span>{job.location}</span>
					</span>
				</div>
			</div>

			<!-- Copy link bar -->
			<div class="flex items-center gap-2 bg-(--bg-input) border border-(--border-color) rounded-xl p-1.5">
				<input 
					type="text" 
					readonly 
					value={getJobUrl()} 
					class="flex-1 bg-transparent border-none outline-none text-[0.82rem] text-(--text-secondary) px-2 whitespace-nowrap overflow-hidden text-ellipsis"
				/>
				<button 
					type="button" 
					class="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-white text-[0.8rem] font-semibold cursor-pointer whitespace-nowrap transition-all duration-200 {copied ? 'bg-emerald-500' : 'bg-(--accent) hover:bg-(--accent-hover)'}"
					onclick={handleCopyLink}
				>
					{#if copied}
						<Check size={15} />
						<span>Copied!</span>
					{:else}
						<Copy size={15} />
						<span>Copy Link</span>
					{/if}
				</button>
			</div>

			<!-- Social Share Buttons Grid -->
			<div class="grid grid-cols-4 max-[480px]:grid-cols-3 gap-2.5">
				{#if canNativeShare}
					<button 
						type="button" 
						class="flex flex-col items-center justify-center gap-2 p-3 bg-(--bg-input) border border-(--border-color) rounded-xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent) hover:bg-white/10 text-(--text-primary) group" 
						onclick={handleNativeShare}
					>
						<div class="w-10.5 h-10.5 rounded-full flex items-center justify-center text-white transition-transform duration-200 group-hover:scale-105 bg-linear-to-br from-indigo-500 to-purple-600">
							<Smartphone size={20} />
						</div>
						<span class="text-[0.75rem] font-medium text-(--text-secondary)">More Options</span>
					</button>
				{/if}

				<button 
					type="button" 
					class="flex flex-col items-center justify-center gap-2 p-3 bg-(--bg-input) border border-(--border-color) rounded-xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent) hover:bg-white/10 text-(--text-primary) group" 
					onclick={shareViaSMS}
				>
					<div class="w-10.5 h-10.5 rounded-full flex items-center justify-center text-white transition-transform duration-200 group-hover:scale-105 bg-linear-to-br from-sky-500 to-sky-700">
						<MessageSquare size={20} />
					</div>
					<span class="text-[0.75rem] font-medium text-(--text-secondary)">SMS / Text</span>
				</button>

				<button 
					type="button" 
					class="flex flex-col items-center justify-center gap-2 p-3 bg-(--bg-input) border border-(--border-color) rounded-xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent) hover:bg-white/10 text-(--text-primary) group" 
					onclick={shareViaWhatsApp}
				>
					<div class="w-10.5 h-10.5 rounded-full flex items-center justify-center text-white transition-transform duration-200 group-hover:scale-105 bg-linear-to-br from-green-500 to-green-700">
						<Send size={20} />
					</div>
					<span class="text-[0.75rem] font-medium text-(--text-secondary)">WhatsApp</span>
				</button>

				<button 
					type="button" 
					class="flex flex-col items-center justify-center gap-2 p-3 bg-(--bg-input) border border-(--border-color) rounded-xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent) hover:bg-white/10 text-(--text-primary) group" 
					onclick={shareViaTelegram}
				>
					<div class="w-10.5 h-10.5 rounded-full flex items-center justify-center text-white transition-transform duration-200 group-hover:scale-105 bg-linear-to-br from-[#0088cc] to-[#229ED9]">
						<Send size={20} />
					</div>
					<span class="text-[0.75rem] font-medium text-(--text-secondary)">Telegram</span>
				</button>

				<button 
					type="button" 
					class="flex flex-col items-center justify-center gap-2 p-3 bg-(--bg-input) border border-(--border-color) rounded-xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent) hover:bg-white/10 text-(--text-primary) group" 
					onclick={shareViaMessenger}
				>
					<div class="w-10.5 h-10.5 rounded-full flex items-center justify-center text-white transition-transform duration-200 group-hover:scale-105 bg-linear-to-br from-[#0099ff] to-[#a033ff]">
						<MessageSquare size={20} />
					</div>
					<span class="text-[0.75rem] font-medium text-(--text-secondary)">Messenger</span>
				</button>
			</div>
		</div>
	</div>
{/if}
