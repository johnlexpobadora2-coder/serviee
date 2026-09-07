<script>
	import { enhance } from '$app/forms';
	import { AlertTriangle } from 'lucide-svelte';

	import { CITIES_MUNICIPALITIES } from '$lib/locations.js';

	let { data, form } = $props();

	let loading = $state(false);

	let selectedRole = $derived(form?.role ?? data?.role ?? '');
</script>

<svelte:head>
	<title>Register | Serviee</title>
</svelte:head>

<div style="max-width: 580px; margin: 2.5rem auto; width: 100%; padding: 0 1rem;">
	<div class="card" style="padding: 2.5rem 2rem;">
		<h2 style="font-size: 2.25rem; margin-bottom: 0.6rem; text-align: center;">Create an Account</h2>
		<p style="color: var(--text-secondary); text-align: center; margin-bottom: 2.25rem; font-size: 1.05rem;">
			Sign up to request services or find sideline work.
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
				<label for="name" style="font-size: 0.95rem; margin-bottom: 0.4rem;">Full Name</label>
				<input 
					type="text" 
					id="name" 
					name="name" 
					placeholder="Juan Dela Cruz" 
					value={form?.name ?? ''} 
					required 
					style="padding: 0.75rem 1rem; font-size: 1rem;"
				/>
			</div>

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

			<div class="form-group" style="margin-bottom: 1.25rem;">
				<label for="phone" style="font-size: 0.95rem; margin-bottom: 0.4rem;">Contact Number</label>
				<input 
					type="tel" 
					id="phone" 
					name="phone" 
					placeholder="09123456789" 
					value={form?.phone ?? ''} 
					required 
					style="padding: 0.75rem 1rem; font-size: 1rem;"
				/>
			</div>

			<div class="form-group" style="margin-bottom: 1.25rem;">
				<label for="address" style="font-size: 0.95rem; margin-bottom: 0.4rem;">City/Municipality</label>
				<select 
					id="address" 
					name="address" 
					required 
					style="padding: 0.75rem 1rem; font-size: 1rem;"
					value={form?.address ?? ''}
				>
					<option value="" disabled selected={!form?.address}>Select City / Municipality...</option>
					{#each CITIES_MUNICIPALITIES as city}
						<option value={city}>{city}</option>
					{/each}
				</select>
			</div>

			<div class="form-group" style="margin-bottom: 1.25rem;">
				<label for="role" style="font-size: 0.95rem; margin-bottom: 0.4rem;">What is your role?</label>
				<select id="role" name="role" required value={selectedRole} style="padding: 0.75rem 1rem; font-size: 1rem;">
					<option value="" disabled selected={!selectedRole}>Select your role...</option>
					<option value="customer">Looking for Services (Client / Customer)</option>
					<option value="worker">Looking for Work (Worker / Provider)</option>
				</select>
			</div>

			<div class="form-group" style="margin-bottom: 2.25rem;">
				<label for="password" style="font-size: 0.95rem; margin-bottom: 0.4rem;">Password</label>
				<input 
					type="password" 
					id="password" 
					name="password" 
					placeholder="At least 6 characters" 
					required 
					style="padding: 0.75rem 1rem; font-size: 1rem;"
				/>
			</div>

			<button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.85rem 1.25rem; font-size: 1.05rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;" disabled={loading} id="register-submit-btn">
				{#if loading}
					<span class="spinner spinner-sm"></span>
					<span>Registering...</span>
				{:else}
					Register
				{/if}
			</button>
		</form>

		<div style="margin-top: 1.75rem; text-align: center; font-size: 1rem; color: var(--text-secondary);">
			Already have an account? <a href="/login" style="font-weight: 600;" id="register-login-link">Log In here</a>
		</div>
	</div>
</div>
