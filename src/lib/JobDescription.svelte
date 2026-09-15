<script>
	/**
	 * @typedef {Object} Props
	 * @property {string} text
	 * @property {number} [maxLines=3]
	 * @property {number} [thresholdLength=140]
	 */

	/** @type {Props} */
	let {
		text = '',
		maxLines = 3,
		thresholdLength = 140
	} = $props();

	let isExpanded = $state(false);

	// Only show read more button if text exceeds character length or has multiple linebreaks
	let isLongText = $derived(
		(text && text.length > thresholdLength) || (text && text.split('\n').length > 3)
	);

	function toggleExpand(e) {
		e.stopPropagation();
		isExpanded = !isExpanded;
	}
</script>

{#if text}
	<div class="job-description-wrapper">
		<p class="job-desc-content {!isExpanded && isLongText ? 'clamped' : ''}">
			{text}
		</p>
		{#if isLongText}
			<button
				type="button"
				class="job-desc-toggle-btn"
				onclick={toggleExpand}
				aria-expanded={isExpanded}
			>
				{isExpanded ? 'Show less' : 'Read more'}
			</button>
		{/if}
	</div>
{/if}

<style>
	.job-description-wrapper {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
		width: 100%;
	}

	.job-desc-content {
		font-size: 0.93rem;
		color: var(--text-secondary);
		line-height: 1.6;
		white-space: pre-line;
		overflow-wrap: break-word;
		word-break: break-word;
		margin: 0;
		padding: 0;
		transition: all 0.2s ease;
	}

	.job-desc-content.clamped {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.job-desc-toggle-btn {
		background: none;
		border: none;
		padding: 0;
		color: var(--accent-hover);
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		margin-top: 0.15rem;
		transition: opacity 0.15s;
	}

	.job-desc-toggle-btn:hover {
		text-decoration: underline;
		opacity: 0.9;
	}
</style>
