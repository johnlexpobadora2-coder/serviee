<script>
	import { enhance } from '$app/forms';
	import { AlertTriangle } from 'lucide-svelte';

	let { form } = $props();

	let loading = $state(false);
</script>

<svelte:head>
	<title>Log In | Serviee</title>
</svelte:head>

<div style="max-width: 520px; margin: 3.5rem auto; width: 100%; padding: 0 1rem;">
	<div class="card" style="position: relative; overflow: hidden; padding: 2.5rem 2rem;">
		<div style="position: absolute; top: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, var(--accent), var(--accent-hover));"></div>

		<h2 style="font-size: 2.25rem; margin-bottom: 0.6rem; text-align: center;">Log In</h2>
		<p style="color: var(--text-secondary); text-align: center; margin-bottom: 2.25rem; font-size: 1.05rem;">
			Enter your email and password to continue to Serviee.
		</p>

		{#if form?.error}
			<div style="background-color: var(--error-light); border: 1px solid var(--error); color: var(--text-primary); padding: 1rem 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.75rem; font-size: 0.98rem; display: flex; align-items: center; gap: 0.65rem;">
				<AlertTriangle size={20} style="color: var(--error); flex-shrink: 0;" />
				<span>{form.error}</span>
			</div>
		{/if}

		<form method="POST" use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update();
			};
		}}>
			<div class="form-group" style="margin-bottom: 1.25rem;">
				<label for="email" style="font-size: 0.95rem; margin-bottom: 0.4rem;">Email Address</label>
				<input 
					type="email" 
					id="email" 
					name="email" 
					placeholder="juan@example.com" 
					value={form?.email ?? ''} 
					required 
					style="padding: 0.75rem 1rem; font-size: 1rem;"
				/>
			</div>

			<div class="form-group" style="margin-bottom: 2.25rem;">
				<div style="display: flex; justify-content: space-between; align-items: center;">
					<label for="password" style="font-size: 0.95rem; margin-bottom: 0.4rem;">Password</label>
				</div>
				<input 
					type="password" 
					id="password" 
					name="password" 
					placeholder="Enter your password" 
					required 
					style="padding: 0.75rem 1rem; font-size: 1rem;"
				/>
			</div>

			<button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.85rem 1.25rem; font-size: 1.05rem; font-weight: 600;" disabled={loading} id="login-submit-btn">
				{#if loading}
					Logging in...
				{:else}
					Log In
				{/if}
			</button>
		</form>

		<div style="margin-top: 1.75rem; text-align: center; font-size: 1rem; color: var(--text-secondary);">
			Don't have an account? <a href="/register" style="font-weight: 600;" id="login-register-link">Sign Up</a>
		</div>
	</div>
</div>
