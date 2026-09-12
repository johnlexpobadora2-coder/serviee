<script>
	import { 
		X, 
		Copy, 
		Check, 
		Share2, 
		MessageSquare, 
		Send, 
		Smartphone, 
		ExternalLink,
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
		class="share-modal-backdrop" 
		onclick={() => onClose()}
		role="presentation"
	>
		<div 
			class="share-modal-card" 
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			tabindex="-1"
			aria-labelledby="share-modal-title"
			aria-modal="true"
		>
			<div class="share-modal-header">
				<div class="share-modal-title-wrap">
					<div class="share-modal-icon-badge">
						<Share2 size={18} />
					</div>
					<div>
						<h3 id="share-modal-title" class="share-modal-title">Share Sideline Job</h3>
						<p class="share-modal-subtitle">Ipasa sa kapwa worker o kaibigan</p>
					</div>
				</div>
				<button 
					type="button" 
					class="share-modal-close-btn" 
					onclick={() => onClose()}
					aria-label="Close share dialog"
				>
					<X size={18} />
				</button>
			</div>

			<!-- Job Summary Snippet -->
			<div class="share-job-preview">
				<div class="share-job-preview-category">
					<Tag size={12} />
					<span>{job.category || 'General'}</span>
				</div>
				<h4 class="share-job-preview-title">{job.title}</h4>
				<div class="share-job-preview-meta">
					<span class="share-job-preview-meta-item">
						<Banknote size={13} style="color: var(--accent);" />
						<strong>₱{Number(job.budget || 0).toLocaleString()}</strong>
					</span>
					<span class="share-job-preview-meta-item">
						<MapPin size={13} style="color: #38bdf8;" />
						<span>{job.location}</span>
					</span>
				</div>
			</div>

			<!-- Copy link bar -->
			<div class="share-copy-bar">
				<input 
					type="text" 
					readonly 
					value={getJobUrl()} 
					class="share-copy-input"
				/>
				<button 
					type="button" 
					class="share-copy-btn {copied ? 'copied' : ''}"
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
			<div class="share-actions-grid">
				{#if canNativeShare}
					<button 
						type="button" 
						class="share-channel-btn share-native" 
						onclick={handleNativeShare}
					>
						<div class="share-channel-icon">
							<Smartphone size={20} />
						</div>
						<span class="share-channel-name">More Options</span>
					</button>
				{/if}

				<button 
					type="button" 
					class="share-channel-btn share-sms" 
					onclick={shareViaSMS}
				>
					<div class="share-channel-icon">
						<MessageSquare size={20} />
					</div>
					<span class="share-channel-name">SMS / Text</span>
				</button>

				<button 
					type="button" 
					class="share-channel-btn share-whatsapp" 
					onclick={shareViaWhatsApp}
				>
					<div class="share-channel-icon">
						<Send size={20} />
					</div>
					<span class="share-channel-name">WhatsApp</span>
				</button>

				<button 
					type="button" 
					class="share-channel-btn share-telegram" 
					onclick={shareViaTelegram}
				>
					<div class="share-channel-icon">
						<Send size={20} />
					</div>
					<span class="share-channel-name">Telegram</span>
				</button>

				<button 
					type="button" 
					class="share-channel-btn share-messenger" 
					onclick={shareViaMessenger}
				>
					<div class="share-channel-icon">
						<MessageSquare size={20} />
					</div>
					<span class="share-channel-name">Messenger</span>
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.share-modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.share-modal-card {
		background: var(--bg-card, #1e293b);
		border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
		border-radius: var(--radius-lg, 16px);
		width: 100%;
		max-width: 480px;
		padding: 1.5rem;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
		animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
		outline: none;
	}

	@media (max-width: 640px) {
		.share-modal-backdrop {
			align-items: flex-end;
			padding: 0;
		}
		.share-modal-card {
			border-bottom-left-radius: 0;
			border-bottom-right-radius: 0;
			max-width: 100%;
			padding: 1.25rem 1.25rem 2rem 1.25rem;
		}
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes slideUp {
		from { transform: translateY(20px) scale(0.98); opacity: 0; }
		to { transform: translateY(0) scale(1); opacity: 1; }
	}

	.share-modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.share-modal-title-wrap {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.share-modal-icon-badge {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: var(--accent-light, rgba(99, 102, 241, 0.15));
		color: var(--accent, #6366f1);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.share-modal-title {
		font-size: 1.15rem;
		font-weight: 700;
		margin: 0;
		color: var(--text-primary, #ffffff);
	}

	.share-modal-subtitle {
		font-size: 0.8rem;
		margin: 0;
		color: var(--text-muted, #94a3b8);
	}

	.share-modal-close-btn {
		background: transparent;
		border: none;
		color: var(--text-muted, #94a3b8);
		cursor: pointer;
		padding: 0.4rem;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
	}

	.share-modal-close-btn:hover {
		color: var(--text-primary, #ffffff);
		background: rgba(255, 255, 255, 0.08);
	}

	.share-job-preview {
		background: var(--bg-input, rgba(15, 23, 42, 0.5));
		border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
		border-radius: 12px;
		padding: 0.9rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.share-job-preview-category {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.72rem;
		color: var(--accent, #6366f1);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.share-job-preview-title {
		font-size: 0.95rem;
		font-weight: 600;
		margin: 0;
		color: var(--text-primary, #ffffff);
		line-height: 1.35;
	}

	.share-job-preview-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.85rem;
		margin-top: 0.2rem;
		font-size: 0.82rem;
		color: var(--text-secondary, #94a3b8);
	}

	.share-job-preview-meta-item {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.share-copy-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--bg-input, rgba(15, 23, 42, 0.6));
		border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
		border-radius: 10px;
		padding: 0.35rem;
	}

	.share-copy-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		font-size: 0.82rem;
		color: var(--text-secondary, #94a3b8);
		padding: 0 0.5rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.share-copy-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.45rem 0.9rem;
		border-radius: 8px;
		background: var(--accent, #6366f1);
		border: none;
		color: #ffffff;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.2s ease;
	}

	.share-copy-btn:hover {
		background: var(--accent-hover, #4f46e5);
	}

	.share-copy-btn.copied {
		background: #10b981;
	}

	.share-actions-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.65rem;
	}

	@media (max-width: 480px) {
		.share-actions-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.share-channel-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		padding: 0.75rem 0.5rem;
		background: var(--bg-input, rgba(15, 23, 42, 0.4));
		border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		color: var(--text-primary, #ffffff);
	}

	.share-channel-btn:hover {
		transform: translateY(-2px);
		border-color: var(--accent, #6366f1);
		background: rgba(255, 255, 255, 0.08);
	}

	.share-channel-icon {
		width: 42px;
		height: 42px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #ffffff;
		transition: transform 0.2s ease;
	}

	.share-channel-btn:hover .share-channel-icon {
		transform: scale(1.08);
	}

	.share-native .share-channel-icon {
		background: linear-gradient(135deg, #6366f1, #8b5cf6);
	}

	.share-sms .share-channel-icon {
		background: linear-gradient(135deg, #0ea5e9, #0284c7);
	}

	.share-whatsapp .share-channel-icon {
		background: linear-gradient(135deg, #22c55e, #16a34a);
	}

	.share-telegram .share-channel-icon {
		background: linear-gradient(135deg, #0088cc, #229ED9);
	}

	.share-messenger .share-channel-icon {
		background: linear-gradient(135deg, #0099ff, #a033ff);
	}

	.share-channel-name {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary, #94a3b8);
	}
</style>
