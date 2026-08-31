<script>
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let loading = $state(false);

	let selectedRole = $derived(form?.role ?? data?.role ?? '');
</script>

<svelte:head>
	<title>Register | Serviee</title>
</svelte:head>

<div style="max-width: 500px; margin: 2rem auto; width: 100%;">
	<div class="card" style="position: relative; overflow: hidden;">
		<!-- Subtle background gradient accent -->
		<div style="position: absolute; top: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, var(--accent), var(--accent-hover));"></div>

		<h2 style="font-size: 2rem; margin-bottom: 0.5rem; text-align: center;">Create an Account</h2>
		<p style="color: var(--text-secondary); text-align: center; margin-bottom: 2rem; font-size: 0.95rem;">
			Sign up to request services or find sideline work.
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
				<label for="name">Full Name</label>
				<input 
					type="text" 
					id="name" 
					name="name" 
					placeholder="Juan Dela Cruz" 
					value={form?.name ?? ''} 
					required 
				/>
			</div>

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

			<div class="form-group">
				<label for="phone">Contact Number</label>
				<input 
					type="tel" 
					id="phone" 
					name="phone" 
					placeholder="09123456789" 
					value={form?.phone ?? ''} 
					required 
				/>
			</div>

			<div class="form-group">
				<label for="address">Location / Barangay Address</label>
				<input 
					type="text" 
					id="address" 
					name="address" 
					placeholder="Brgy. San Jose, Pasig City" 
					value={form?.address ?? ''} 
					required 
				/>
			</div>

			<div class="form-group">
				<label for="role">What is your role?</label>
				<select id="role" name="role" required value={selectedRole}>
					<option value="" disabled selected={!selectedRole}>Select your role...</option>
					<option value="customer">Looking for Services (Client / Customer)</option>
					<option value="worker">Looking for Work (Worker / Provider)</option>
				</select>
			</div>

			<div class="form-group" style="margin-bottom: 2rem;">
				<label for="password">Password</label>
				<input 
					type="password" 
					id="password" 
					name="password" 
					placeholder="At least 6 characters" 
					required 
				/>
			</div>

			<button type="submit" class="btn btn-primary" style="width: 100%;" disabled={loading} id="register-submit-btn">
				{#if loading}
					Registering...
				{:else}
					Register
				{/if}
			</button>
		</form>

		<div style="margin-top: 1.5rem; text-align: center; font-size: 0.9rem; color: var(--text-secondary);">
			Already have an account? <a href="/login" style="font-weight: 600;" id="register-login-link">Log In here</a>
		</div>
	</div>
</div>
