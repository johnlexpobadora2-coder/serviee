<script>
	import { getPasswordStrength } from '$lib/validation.js';

	let { password = '', showRequirements = false } = $props();

	let strength = $derived(getPasswordStrength(password));
</script>

{#if password}
	<div class="password-meter-container">
		<!-- Strength Meter Header -->
		<div class="meter-header">
			<span class="meter-label">Password Strength:</span>
			<span class="strength-tag" style="color: {strength.color}; font-weight: 600;">
				{strength.label}
			</span>
		</div>

		<!-- Segmented Progress Bar -->
		<div class="meter-segments" role="progressbar" aria-valuenow={strength.score} aria-valuemin="0" aria-valuemax="4">
			<div 
				class="segment" 
				class:active={strength.score >= 1} 
				style={strength.score >= 1 ? `background-color: ${strength.color}; box-shadow: 0 0 8px ${strength.color}40;` : ''}
			></div>
			<div 
				class="segment" 
				class:active={strength.score >= 2} 
				style={strength.score >= 2 ? `background-color: ${strength.color}; box-shadow: 0 0 8px ${strength.color}40;` : ''}
			></div>
			<div 
				class="segment" 
				class:active={strength.score >= 3} 
				style={strength.score >= 3 ? `background-color: ${strength.color}; box-shadow: 0 0 8px ${strength.color}40;` : ''}
			></div>
			<div 
				class="segment" 
				class:active={strength.score >= 4} 
				style={strength.score >= 4 ? `background-color: ${strength.color}; box-shadow: 0 0 8px ${strength.color}40;` : ''}
			></div>
		</div>
	</div>
{/if}

<style>
	.password-meter-container {
		margin-top: 0.5rem;
		padding: 0.65rem 0.85rem;
		background: var(--bg-surface, rgba(255, 255, 255, 0.03));
		border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
		border-radius: var(--radius-md, 8px);
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		animation: fadeIn 0.2s ease-in-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-3px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.meter-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.8rem;
	}

	.meter-label {
		color: var(--text-secondary, #9ca3af);
	}

	.strength-tag {
		text-transform: uppercase;
		font-size: 0.75rem;
		letter-spacing: 0.04em;
	}

	.meter-segments {
		display: flex;
		gap: 0.35rem;
		height: 4px;
		width: 100%;
	}

	.segment {
		flex: 1;
		height: 100%;
		border-radius: 9999px;
		background-color: var(--border-color, rgba(255, 255, 255, 0.12));
		transition: all 0.3s ease;
	}
</style>
