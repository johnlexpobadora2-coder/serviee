<script>
	import { fade, slide, scale } from 'svelte/transition';
	import { Shield, AlertTriangle, Unlock, ArrowLeft } from 'lucide-svelte';

	let { 
		passcode = $bindable(''), 
		passError = '', 
		onsubmit 
	} = $props();
</script>

<div class="admin-lock-wrapper" transition:fade={{ duration: 150 }}>
	<div class="admin-lock-card" transition:scale={{ duration: 200, start: 0.95 }}>
		<!-- Shield Icon Box -->
		<div class="admin-lock-icon-box">
			<Shield size={32} class="admin-lock-shield-icon" />
		</div>

		<h1 class="admin-lock-title">Serviee Admin Panel</h1>
		<div class="admin-lock-route-badge">
			<span>Restricted Secret Route</span>
			<code>/admin05</code>
		</div>

		{#if passError}
			<div class="admin-lock-error" transition:slide>
				<AlertTriangle size={16} class="admin-lock-error-icon" />
				<span>{passError}</span>
			</div>
		{/if}

		<form onsubmit={onsubmit} class="admin-lock-form">
			<div class="admin-lock-form-group">
				<label for="passcode" class="admin-lock-label">Secret Passcode</label>
				<input 
					id="passcode" 
					type="password" 
					bind:value={passcode}
					placeholder="Enter PIN..." 
					autocomplete="off"
					class="admin-lock-input"
					required
				/>
			</div>

			<button 
				type="submit" 
				class="admin-lock-submit-btn"
			>
				<Unlock size={18} />
				<span>Authenticate & Unlock</span>
			</button>
		</form>

		<div class="admin-lock-footer">
			<a href="/" class="admin-lock-return-link">
				<ArrowLeft size={14} />
				<span>Return to Serviee Platform</span>
			</a>
		</div>
	</div>
</div>

<style>
	.admin-lock-wrapper {
		flex: 1;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		min-height: calc(100vh - 140px);
		box-sizing: border-box;
	}

	.admin-lock-card {
		width: 100%;
		max-width: 440px;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg, 0.75rem);
		padding: 2.5rem 2rem;
		box-shadow: var(--shadow-lg);
		text-align: center;
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		align-items: center;
		box-sizing: border-box;
	}

	.admin-lock-icon-box {
		width: 4.25rem;
		height: 4.25rem;
		margin-bottom: 1.25rem;
		background: var(--accent-light);
		border: 1px solid rgba(114, 97, 239, 0.25);
		color: var(--accent);
		border-radius: var(--radius-md, 0.6rem);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 16px rgba(114, 97, 239, 0.15);
	}

	.admin-lock-title {
		font-size: 1.55rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-bottom: 0.35rem;
		letter-spacing: -0.02em;
	}

	.admin-lock-route-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 1.75rem;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.admin-lock-route-badge code {
		padding: 0.15rem 0.55rem;
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		color: var(--accent);
		border-radius: var(--radius-sm, 0.375rem);
		font-size: 0.78rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-weight: 700;
	}

	.admin-lock-error {
		width: 100%;
		margin-bottom: 1.25rem;
		padding: 0.75rem 1rem;
		background: var(--error-light);
		border: 1px solid var(--error);
		color: var(--error);
		border-radius: var(--radius-md, 0.5rem);
		font-size: 0.82rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-weight: 600;
		box-sizing: border-box;
	}

	.admin-lock-form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		box-sizing: border-box;
	}

	.admin-lock-form-group {
		width: 100%;
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		box-sizing: border-box;
	}

	.admin-lock-label {
		display: block;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
	}

	.admin-lock-input {
		width: 100%;
		height: 48px;
		padding: 0.75rem 1rem;
		background: var(--bg-input);
		border: 1.5px solid var(--border-color);
		border-radius: var(--radius-md, 0.5rem);
		color: var(--text-primary);
		font-size: 1rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-align: center;
		transition: all var(--transition-fast);
		box-sizing: border-box;
		outline: none;
	}

	.admin-lock-input:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-light);
	}

	.admin-lock-submit-btn {
		width: 100%;
		height: 48px;
		padding: 0.75rem 1.25rem;
		background: linear-gradient(135deg, #7261ef 0%, #8b5cf6 100%);
		color: #ffffff;
		font-weight: 700;
		font-size: 0.92rem;
		border-radius: var(--radius-md, 0.5rem);
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		box-shadow: 0 4px 14px rgba(114, 97, 239, 0.35);
		transition: all var(--transition-fast);
		box-sizing: border-box;
	}

	.admin-lock-submit-btn:hover {
		background: linear-gradient(135deg, #6351e6 0%, #7c3aed 100%);
		transform: translateY(-1px);
		box-shadow: 0 6px 20px rgba(114, 97, 239, 0.45);
	}

	.admin-lock-submit-btn:active {
		transform: translateY(0);
	}

	.admin-lock-footer {
		width: 100%;
		margin-top: 1.75rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--border-color);
		display: flex;
		justify-content: center;
		box-sizing: border-box;
	}

	.admin-lock-return-link {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--text-secondary);
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		transition: color var(--transition-fast);
	}

	.admin-lock-return-link:hover {
		color: var(--text-primary);
	}

	@media (max-width: 480px) {
		.admin-lock-card {
			padding: 2rem 1.25rem;
			border-radius: var(--radius-md, 0.75rem);
		}

		.admin-lock-title {
			font-size: 1.35rem;
		}
	}
</style>
