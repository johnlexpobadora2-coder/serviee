<script>
	import { enhance } from '$app/forms';

	let { form } = $props();

	let loading = $state(false);
</script>

<svelte:head>
	<title>Log In | Serviee</title>
</svelte:head>

<div style="max-width: 450px; margin: 4rem auto; width: 100%;">
	<div class="card" style="position: relative; overflow: hidden;">
		<div style="position: absolute; top: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, var(--accent), var(--accent-hover));"></div>

		<h2 style="font-size: 2rem; margin-bottom: 0.5rem; text-align: center;">Log In</h2>
		<p style="color: var(--text-secondary); text-align: center; margin-bottom: 2rem; font-size: 0.95rem;">
			Enter your email and password to continue to Serviee.
		</p>

		{#if form?.error}
			<div style="background-color: var(--error-light); border: 1px solid var(--error); color: var(--text-primary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;">
				<span style="font-size: 1.2rem;">⚠️</span>
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
			<div class="form-group">
				<label for="email">Email Address</label>
				<input 
					type="email" 
					id="email" 
					name="email" 
					placeholder="juan@example.com" 
					value={form?.email ?? ''} 
					required 
				/>
			</div>

			<div class="form-group" style="margin-bottom: 2rem;">
				<div style="display: flex; justify-content: space-between; align-items: center;">
					<label for="password">Password</label>
				</div>
				<input 
					type="password" 
					id="password" 
					name="password" 
					placeholder="Enter your password" 
					required 
				/>
			</div>

			<button type="submit" class="btn btn-primary" style="width: 100%;" disabled={loading} id="login-submit-btn">
				{#if loading}
					Logging in...
				{:else}
					Log In
				{/if}
			</button>
		</form>

		<div style="margin-top: 1.5rem; text-align: center; font-size: 0.9rem; color: var(--text-secondary);">
			Don't have an account? <a href="/register" style="font-weight: 600;" id="login-register-link">Sign Up</a>
		</div>
	</div>
</div>
