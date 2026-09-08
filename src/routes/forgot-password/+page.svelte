<script>
	import { enhance } from '$app/forms';
	import { 
		KeyRound, 
		Mail, 
		AlertTriangle, 
		ArrowLeft, 
		RotateCw, 
		CheckCircle2, 
		ShieldCheck, 
		Eye, 
		EyeOff, 
		Briefcase, 
		User, 
		Info,
		X
	} from 'lucide-svelte';

	let { form } = $props();

	let loading = $state(false);
	let resendLoading = $state(false);
	let clientError = $state('');

	// Step tracking: 'email' | 'otp' | 'new_password' | 'done'
	// svelte-ignore state_referenced_locally
	let currentStep = $state(form?.step ?? 'email');

	// svelte-ignore state_referenced_locally
	let email = $state(form?.email ?? '');
	let otpCode = $state('');
	// svelte-ignore state_referenced_locally
	let roles = $state(form?.roles ?? []);
	// svelte-ignore state_referenced_locally
	let resetToken = $state(form?.resetToken ?? '');

	// Password fields
	let customerPassword = $state('');
	let workerPassword = $state('');
	let singlePassword = $state('');
	let confirmSinglePassword = $state('');

	// Show/hide toggles
	let showCustomerPass = $state(false);
	let showWorkerPass = $state(false);
	let showSinglePass = $state(false);

	// OTP Resend Cooldown
	let resendCooldown = $state(60);
	let timerInterval = null;

	function startCooldownTimer() {
		resendCooldown = 60;
		if (timerInterval) clearInterval(timerInterval);
		timerInterval = setInterval(() => {
			if (resendCooldown > 0) {
				resendCooldown -= 1;
			} else {
				clearInterval(timerInterval);
			}
		}, 1000);
	}

	$effect(() => {
		if (form?.step) {
			currentStep = form.step;
			if (form.step === 'otp') {
				startCooldownTimer();
			}
		}
		if (form?.email) email = form.email;
		if (form?.roles) roles = form.roles;
		if (form?.resetToken) resetToken = form.resetToken;
	});

	function handleBackToEmail() {
		currentStep = 'email';
		clientError = '';
		otpCode = '';
	}
</script>

<svelte:head>
	<title>Forgot Password | Serviee</title>
</svelte:head>

<div style="max-width: 540px; margin: 3rem auto; width: 100%; padding: 0 1rem;">
	<div class="card" style="padding: 2.5rem 2rem; position: relative;">

		<!-- Top Exit / Close Button (Available on all steps to cancel and exit back to Log In) -->
		{#if currentStep !== 'done'}
			<a 
				href="/login" 
				style="position: absolute; right: 1.25rem; top: 1.25rem; background: var(--bg-base); border: 1px solid var(--border-color); color: var(--text-muted); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-decoration: none; cursor: pointer; transition: all 0.2s;"
				title="Exit and Return to Log In"
				id="forgot-top-exit-btn"
				onmouseenter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
				onmouseleave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
			>
				<X size={18} />
			</a>
		{/if}

		<!-- ================= STEP 1: EMAIL REQUEST ================= -->
		{#if currentStep === 'email'}
			<div style="text-align: center; margin-bottom: 2rem;">
				<div style="display: inline-flex; align-items: center; justify-content: center; width: 60px; height: 60px; border-radius: 50%; background: var(--accent-light, rgba(114, 97, 239, 0.15)); color: var(--accent); margin-bottom: 1rem;">
					<KeyRound size={28} />
				</div>
				<h2 style="font-size: 2rem; margin-bottom: 0.5rem; color: var(--text-primary);">Reset Password</h2>
				<p style="color: var(--text-secondary); font-size: 0.98rem; line-height: 1.5;">
					Enter your registered email address to receive a 6-digit OTP verification code.
				</p>
			</div>

			{#if form?.error || clientError}
				<div style="background-color: var(--error-light); border: 1px solid var(--error); color: var(--text-primary); padding: 1rem 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.95rem; display: flex; align-items: center; gap: 0.65rem;">
					<AlertTriangle size={20} style="color: var(--error); flex-shrink: 0;" />
					<span>{form?.error || clientError}</span>
				</div>
			{/if}

			<form method="POST" action="?/requestOtp" use:enhance={() => {
				loading = true;
				clientError = '';
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}>
				<div class="form-group" style="margin-bottom: 2rem;">
					<label for="email" style="font-size: 0.95rem; margin-bottom: 0.4rem; color: var(--text-primary);">Email Address</label>
					<input 
						type="email" 
						id="email" 
						name="email" 
						placeholder="juan@example.com" 
						bind:value={email}
						required 
						style="padding: 0.75rem 1rem; font-size: 1rem;"
					/>
				</div>

				<button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.85rem 1.25rem; font-size: 1.05rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;" disabled={loading} id="forgot-submit-email-btn">
					{#if loading}
						<span class="spinner spinner-sm"></span>
						<span>Sending Code...</span>
					{:else}
						<Mail size={18} />
						<span>Send Reset Code</span>
					{/if}
				</button>
			</form>

			<div style="margin-top: 1.75rem; text-align: center; font-size: 0.98rem; color: var(--text-secondary);">
				Remember your password? <a href="/login" style="font-weight: 600; color: var(--accent);" id="forgot-back-login-link">Back to Log In</a>
			</div>

		<!-- ================= STEP 2: OTP VERIFICATION ================= -->
		{:else if currentStep === 'otp'}
			<div style="text-align: center; margin-bottom: 2rem;">
				<div style="display: inline-flex; align-items: center; justify-content: center; width: 60px; height: 60px; border-radius: 50%; background: var(--accent-light, rgba(114, 97, 239, 0.15)); color: var(--accent); margin-bottom: 1rem;">
					<Mail size={28} />
				</div>
				<h2 style="font-size: 1.85rem; margin-bottom: 0.5rem; color: var(--text-primary);">Enter Verification Code</h2>
				<p style="color: var(--text-secondary); font-size: 0.98rem; line-height: 1.5; max-width: 440px; margin: 0 auto;">
					We sent a 6-digit code to <strong style="color: var(--text-primary);">{email}</strong>. Enter it below to proceed with resetting your password.
				</p>
			</div>

			{#if form?.resendSuccess}
				<div style="background-color: var(--success-light); border: 1px solid var(--success); color: var(--text-primary); padding: 0.85rem 1.15rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.92rem; display: flex; align-items: center; gap: 0.5rem;">
					<CheckCircle2 size={18} style="color: var(--success); flex-shrink: 0;" />
					<span>{form.resendSuccess}</span>
				</div>
			{/if}

			{#if form?.error || clientError}
				<div style="background-color: var(--error-light); border: 1px solid var(--error); color: var(--text-primary); padding: 1rem 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.95rem; display: flex; align-items: center; gap: 0.65rem;">
					<AlertTriangle size={20} style="color: var(--error); flex-shrink: 0;" />
					<span>{form?.error || clientError}</span>
				</div>
			{/if}

			<form method="POST" action="?/verifyResetOtp" use:enhance={() => {
				loading = true;
				clientError = '';
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}>
				<input type="hidden" name="email" value={email} />

				<div class="form-group" style="margin-bottom: 1.75rem;">
					<label for="reset-otp-input" style="font-size: 0.95rem; margin-bottom: 0.6rem; text-align: center; display: block; font-weight: 600; color: var(--text-primary);">
						6-Digit Verification Code
					</label>
					<input 
						type="text" 
						id="reset-otp-input" 
						name="otp" 
						bind:value={otpCode}
						placeholder="••••••" 
						required 
						maxlength="6"
						pattern="[0-9]*"
						inputmode="numeric"
						autocomplete="one-time-code"
						style="padding: 0.85rem 1rem; font-size: 1.75rem; text-align: center; letter-spacing: 10px; font-weight: 700; font-family: monospace; border-radius: var(--radius-md);"
					/>
					<span style="display: block; text-align: center; font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.4rem;">
						Code expires in 10 minutes.
					</span>
				</div>

				<button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.85rem 1.25rem; font-size: 1.05rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 1rem;" disabled={loading || otpCode.length < 6} id="forgot-verify-otp-btn">
					{#if loading}
						<span class="spinner spinner-sm"></span>
						<span>Verifying Code...</span>
					{:else}
						<ShieldCheck size={18} />
						<span>Verify & Continue</span>
					{/if}
				</button>
			</form>

			<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border-color); font-size: 0.9rem;">
				<button 
					type="button" 
					onclick={handleBackToEmail}
					class="btn btn-outline" 
					style="padding: 0.45rem 0.85rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.4rem;"
				>
					<ArrowLeft size={14} /> Back
				</button>

				<form method="POST" action="?/resendResetOtp" use:enhance={() => {
					resendLoading = true;
					return async ({ update }) => {
						resendLoading = false;
						await update();
						startCooldownTimer();
					};
				}} style="display: inline;">
					<input type="hidden" name="email" value={email} />

					<button 
						type="submit" 
						class="btn btn-outline" 
						disabled={resendCooldown > 0 || resendLoading}
						style="padding: 0.45rem 0.85rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.4rem;"
					>
						{#if resendLoading}
							<span class="spinner spinner-sm" style="width: 12px; height: 12px;"></span>
							<span>Sending...</span>
						{:else if resendCooldown > 0}
							<span>Resend Code ({resendCooldown}s)</span>
						{:else}
							<RotateCw size={13} />
							<span>Resend Code</span>
						{/if}
					</button>
				</form>
			</div>

		<!-- ================= STEP 3: SET NEW PASSWORD(S) ================= -->
		{:else if currentStep === 'new_password'}
			<div style="margin-bottom: 1.75rem;">
				<h2 style="font-size: 1.85rem; margin-bottom: 0.4rem; text-align: center; color: var(--text-primary);">Set New Password</h2>
				<p style="color: var(--text-secondary); text-align: center; font-size: 0.95rem; line-height: 1.5;">
					Account: <strong style="color: var(--text-primary);">{email}</strong>
				</p>
			</div>

			{#if form?.error || clientError}
				<div style="background-color: var(--error-light); border: 1px solid var(--error); color: var(--text-primary); padding: 1rem 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.95rem; display: flex; align-items: center; gap: 0.65rem;">
					<AlertTriangle size={20} style="color: var(--error); flex-shrink: 0;" />
					<span>{form?.error || clientError}</span>
				</div>
			{/if}

			<!-- DUAL ROLE FORM: If the email has BOTH Customer and Worker roles -->
			{#if roles.includes('customer') && roles.includes('worker')}
				<div style="background-color: var(--accent-light, rgba(114, 97, 239, 0.12)); border: 1px solid var(--border-color); border-left: 4px solid var(--accent); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.5rem; font-size: 0.88rem; color: var(--text-primary); display: flex; align-items: flex-start; gap: 0.65rem; line-height: 1.5;">
					<Info size={18} style="color: var(--accent); flex-shrink: 0; margin-top: 2px;" />
					<div>
						<strong style="color: var(--text-primary);">Two Accounts Found:</strong> This email is used for both a <strong style="color: var(--accent);">Client</strong> and a <strong style="color: var(--warning, #f59e0b);">Worker</strong> account. You can update both passwords below. <span style="color: var(--text-secondary);"><em>Leave a role blank if you do not wish to edit its password.</em></span>
					</div>
				</div>

				<form method="POST" action="?/resetPassword" use:enhance={({ cancel }) => {
					clientError = '';
					if (!customerPassword.trim() && !workerPassword.trim()) {
						clientError = 'Please enter a new password for at least one account role.';
						cancel();
						return;
					}
					if (customerPassword.trim() && customerPassword.trim().length < 6) {
						clientError = 'Client password must be at least 6 characters.';
						cancel();
						return;
					}
					if (workerPassword.trim() && workerPassword.trim().length < 6) {
						clientError = 'Worker password must be at least 6 characters.';
						cancel();
						return;
					}
					if (customerPassword.trim() && workerPassword.trim() && customerPassword.trim() === workerPassword.trim()) {
						clientError = 'For security, Client and Worker accounts cannot have identical passwords.';
						cancel();
						return;
					}
					loading = true;
					return async ({ update }) => {
						loading = false;
						await update();
					};
				}}>
					<input type="hidden" name="email" value={email} />
					<input type="hidden" name="resetToken" value={resetToken} />

					<!-- Customer Account Password Card -->
					<div style="background: var(--bg-base); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem;">
						<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
							<div style="display: flex; align-items: center; gap: 0.5rem;">
								<div style="background: var(--accent-light, rgba(114, 97, 239, 0.15)); color: var(--accent); border: 1px solid hsla(252, 78%, 62%, 0.3); padding: 3px 8px; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
									<User size={13} /> Client Account
								</div>
								<span style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">New Password</span>
							</div>
							<span style="font-size: 0.75rem; color: var(--text-muted);">(Optional)</span>
						</div>

						<div style="position: relative;">
							<input 
								type={showCustomerPass ? 'text' : 'password'}
								id="customerPassword" 
								name="customerPassword" 
								bind:value={customerPassword}
								placeholder="Enter new Client password or leave blank" 
								style="padding: 0.75rem 2.5rem 0.75rem 1rem; font-size: 0.95rem; width: 100%;"
							/>
							<button 
								type="button" 
								onclick={() => showCustomerPass = !showCustomerPass}
								style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px;"
								tabindex="-1"
								title={showCustomerPass ? 'Hide password' : 'Show password'}
							>
								{#if showCustomerPass}
									<EyeOff size={16} />
								{:else}
									<Eye size={16} />
								{/if}
							</button>
						</div>
						<div style="font-size: 0.78rem; margin-top: 0.4rem;">
							{#if customerPassword.trim()}
								<span style="color: var(--accent); font-weight: 600;">✓ Will update Client password</span>
							{:else}
								<span style="color: var(--text-muted);">Leave blank to keep current password unchanged</span>
							{/if}
						</div>
					</div>

					<!-- Worker Account Password Card -->
					<div style="background: var(--bg-base); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.75rem;">
						<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
							<div style="display: flex; align-items: center; gap: 0.5rem;">
								<div style="background: var(--warning-light, rgba(245, 158, 11, 0.15)); color: var(--warning, #f59e0b); border: 1px solid hsla(38, 92%, 50%, 0.3); padding: 3px 8px; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
									<Briefcase size={13} /> Worker Account
								</div>
								<span style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">New Password</span>
							</div>
							<span style="font-size: 0.75rem; color: var(--text-muted);">(Optional)</span>
						</div>

						<div style="position: relative;">
							<input 
								type={showWorkerPass ? 'text' : 'password'}
								id="workerPassword" 
								name="workerPassword" 
								bind:value={workerPassword}
								placeholder="Enter new Worker password or leave blank" 
								style="padding: 0.75rem 2.5rem 0.75rem 1rem; font-size: 0.95rem; width: 100%;"
							/>
							<button 
								type="button" 
								onclick={() => showWorkerPass = !showWorkerPass}
								style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px;"
								tabindex="-1"
								title={showWorkerPass ? 'Hide password' : 'Show password'}
							>
								{#if showWorkerPass}
									<EyeOff size={16} />
								{:else}
									<Eye size={16} />
								{/if}
							</button>
						</div>
						<div style="font-size: 0.78rem; margin-top: 0.4rem;">
							{#if workerPassword.trim()}
								<span style="color: var(--accent); font-weight: 600;">✓ Will update Worker password</span>
							{:else}
								<span style="color: var(--text-muted);">Leave blank to keep current password unchanged</span>
							{/if}
						</div>
					</div>

					<div style="display: flex; gap: 0.75rem; align-items: center;">
						<a 
							href="/login" 
							class="btn btn-outline" 
							style="flex: 1; padding: 0.85rem 1rem; font-size: 0.95rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; text-decoration: none;"
							id="forgot-cancel-exit-btn"
						>
							<X size={16} />
							<span>Cancel / Exit</span>
						</a>

						<button 
							type="submit" 
							class="btn btn-primary" 
							style="flex: 1.6; padding: 0.85rem 1.25rem; font-size: 1rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;" 
							disabled={loading} 
							id="forgot-save-dual-passwords-btn"
						>
							{#if loading}
								<span class="spinner spinner-sm"></span>
								<span>Saving Changes...</span>
							{:else}
								<CheckCircle2 size={18} />
								<span>Update Passwords</span>
							{/if}
						</button>
					</div>
				</form>

			<!-- SINGLE ROLE FORM: If the email has only 1 role -->
			{:else}
				{@const singleRole = roles[0] ?? 'customer'}
				{@const roleLabel = singleRole === 'customer' ? 'Client / Customer' : 'Worker / Provider'}

				<form method="POST" action="?/resetPassword" use:enhance={({ cancel }) => {
					clientError = '';
					if (!singlePassword || singlePassword.length < 6) {
						clientError = 'Password must be at least 6 characters.';
						cancel();
						return;
					}
					if (singlePassword !== confirmSinglePassword) {
						clientError = 'Passwords do not match.';
						cancel();
						return;
					}
					loading = true;
					return async ({ update }) => {
						loading = false;
						await update();
					};
				}}>
					<input type="hidden" name="email" value={email} />
					<input type="hidden" name="resetToken" value={resetToken} />

					<div style="margin-bottom: 1rem; font-size: 0.88rem; color: var(--text-secondary);">
						Resetting password for: <span style="font-weight: 700; color: var(--text-primary);">{roleLabel} Account</span>
					</div>

					<div class="form-group" style="margin-bottom: 1.25rem;">
						<label for="singlePassword" style="font-size: 0.95rem; margin-bottom: 0.4rem; color: var(--text-primary);">New Password</label>
						<div style="position: relative;">
							<input 
								type={showSinglePass ? 'text' : 'password'}
								id="singlePassword" 
								name="password" 
								bind:value={singlePassword}
								placeholder="Enter at least 6 characters" 
								required
								style="padding: 0.75rem 2.5rem 0.75rem 1rem; font-size: 1rem; width: 100%;"
							/>
							<button 
								type="button" 
								onclick={() => showSinglePass = !showSinglePass}
								style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px;"
								tabindex="-1"
							>
								{#if showSinglePass}
									<EyeOff size={16} />
								{:else}
									<Eye size={16} />
								{/if}
							</button>
						</div>
					</div>

					<div class="form-group" style="margin-bottom: 2rem;">
						<label for="confirmSinglePassword" style="font-size: 0.95rem; margin-bottom: 0.4rem; color: var(--text-primary);">Confirm New Password</label>
						<input 
							type={showSinglePass ? 'text' : 'password'}
							id="confirmSinglePassword" 
							bind:value={confirmSinglePassword}
							placeholder="Re-enter your new password" 
							required
							style="padding: 0.75rem 1rem; font-size: 1rem; width: 100%;"
						/>
					</div>

					<div style="display: flex; gap: 0.75rem; align-items: center;">
						<a 
							href="/login" 
							class="btn btn-outline" 
							style="flex: 1; padding: 0.85rem 1rem; font-size: 0.95rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; text-decoration: none;"
							id="forgot-cancel-exit-single-btn"
						>
							<X size={16} />
							<span>Cancel / Exit</span>
						</a>

						<button 
							type="submit" 
							class="btn btn-primary" 
							style="flex: 1.6; padding: 0.85rem 1.25rem; font-size: 1rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;" 
							disabled={loading} 
							id="forgot-save-single-password-btn"
						>
							{#if loading}
								<span class="spinner spinner-sm"></span>
								<span>Saving Password...</span>
							{:else}
								<CheckCircle2 size={18} />
								<span>Set New Password</span>
							{/if}
						</button>
					</div>
				</form>
			{/if}

		<!-- ================= STEP 4: SUCCESS CONFIRMATION ================= -->
		{:else if currentStep === 'done'}
			<div style="text-align: center; padding: 1rem 0;">
				<div style="display: inline-flex; align-items: center; justify-content: center; width: 68px; height: 68px; border-radius: 50%; background: var(--success-light); color: var(--success); margin-bottom: 1.25rem;">
					<CheckCircle2 size={38} />
				</div>
				<h2 style="font-size: 2rem; margin-bottom: 0.6rem; color: var(--text-primary);">Password Reset Complete!</h2>
				<p style="color: var(--text-secondary); font-size: 1rem; line-height: 1.55; max-width: 420px; margin: 0 auto 2.25rem auto;">
					{form?.message || 'Your password has been successfully updated. You can now log in using your new credentials.'}
				</p>

				<a href="/login" class="btn btn-primary" style="width: 100%; padding: 0.85rem 1.25rem; font-size: 1.05rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; text-decoration: none;" id="forgot-done-login-btn">
					Proceed to Log In
				</a>
			</div>
		{/if}

	</div>
</div>
