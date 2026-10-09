<script>
	import { Camera, Trash2, UploadCloud, Eye, AlertCircle } from 'lucide-svelte';
	import { compressAvatarImage } from '$lib/avatarUtils.js';
	import { toast } from '$lib/toast.svelte.js';
	import AvatarViewerModal from '$lib/AvatarViewerModal.svelte';

	let { 
		avatar = $bindable(''), 
		name = '', 
		role = 'customer',
		disabled = false 
	} = $props();

	let fileInputRef = $state(null);
	let isCompressing = $state(false);
	let errorMessage = $state('');
	let showViewerModal = $state(false);

	async function handleFileChange(event) {
		errorMessage = '';
		const file = event.target?.files?.[0];
		if (!file) return;

		// Reset input value so re-selecting same file triggers change
		event.target.value = '';

		isCompressing = true;
		try {
			// Heavy client-side compression (256x256 max square, 0.72 quality WebP, EXIF stripped)
			const result = await compressAvatarImage(file, { maxSize: 256, quality: 0.72 });
			avatar = result.dataUrl;
			toast.success('Photo selected! Click "Save Profile Changes" to apply.');
		} catch (err) {
			console.error('Avatar processing error:', err);
			errorMessage = err.message || 'Failed to process image. Please choose a valid photo.';
			toast.error(errorMessage);
		} finally {
			isCompressing = false;
		}
	}

	function handleRemoveAvatar() {
		avatar = '';
		errorMessage = '';
		toast.info('Profile photo removed.');
	}

	function triggerFileInput() {
		if (disabled || isCompressing) return;
		fileInputRef?.click();
	}

	function handleAvatarClick() {
		if (avatar) {
			showViewerModal = true;
		}
	}
</script>

<div class="p-4 sm:p-5 bg-(--bg-input) border border-(--border-color) rounded-lg flex flex-col gap-3.5">
	<div class="flex items-center justify-between">
		<label for="avatar-input-hidden" class="flex items-center gap-2 text-[0.9rem] font-semibold text-(--text-primary) m-0">
			<Camera size={18} class="text-(--accent)" />
			<span>Profile Photo</span>
		</label>
	</div>

	<div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
		<!-- Avatar Preview: Clicking only VIEWS the photo if present -->
		{#if avatar}
			<button 
				type="button"
				class="relative shrink-0 select-none cursor-pointer group p-0 border-0 bg-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-(--accent)" 
				onclick={handleAvatarClick}
				title="Click to view photo"
				aria-label="View full size profile photo"
			>
				<div class="w-22 h-22 sm:w-24 sm:h-24 rounded-full border-3 border-(--bg-card) bg-linear-to-br from-(--accent) to-[hsl(280,80%,60%)] text-white text-[2rem] font-bold flex items-center justify-center shadow-(--shadow-sm) ring-2 ring-black/5 dark:ring-white/10 overflow-hidden transition-transform duration-200 group-hover:scale-105">
					<img 
						src={avatar} 
						alt={name || 'User Avatar'} 
						class="w-full h-full object-cover" 
					/>
				</div>

				<!-- View overlay icon on hover -->
				<div class="absolute inset-0 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
					<Eye size={22} class="drop-shadow-md" />
				</div>
			</button>
		{:else}
			<div class="relative shrink-0 select-none">
				<div class="w-22 h-22 sm:w-24 sm:h-24 rounded-full border-3 border-(--bg-card) bg-linear-to-br from-(--accent) to-[hsl(280,80%,60%)] text-white text-[2rem] font-bold flex items-center justify-center shadow-(--shadow-sm) ring-2 ring-black/5 dark:ring-white/10 overflow-hidden">
					<span>{name ? name.charAt(0).toUpperCase() : (role === 'worker' ? 'W' : 'U')}</span>
				</div>
			</div>
		{/if}

		<!-- Action Buttons: ONLY way to upload / change / remove photo -->
		<div class="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left gap-2 w-full">
			<div class="flex items-center flex-wrap gap-2 justify-center sm:justify-start">
				<button
					type="button"
					class="btn btn-secondary btn-sm py-1.5 px-3.5 text-xs sm:text-sm inline-flex items-center gap-1.5 rounded-md"
					onclick={triggerFileInput}
					disabled={disabled || isCompressing}
				>
					{#if isCompressing}
						<span class="spinner spinner-sm w-3 h-3 border-2"></span>
						<span>Processing...</span>
					{:else}
						<UploadCloud size={15} />
						<span>{avatar ? 'Change Photo' : 'Upload Photo'}</span>
					{/if}
				</button>

				{#if avatar}
					<button
						type="button"
						class="btn btn-outline btn-sm py-1.5 px-3 text-xs sm:text-sm inline-flex items-center gap-1.5 rounded-md text-red-500 border-red-500/40 hover:bg-red-500/10"
						onclick={handleRemoveAvatar}
						disabled={disabled || isCompressing}
						title="Remove photo"
					>
						<Trash2 size={14} />
						<span>Remove</span>
					</button>
				{/if}
			</div>

			<!-- Hidden File Input (strictly triggered by Upload/Change button) -->
			<input
				id="avatar-input-hidden"
				type="file"
				accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif"
				class="hidden"
				bind:this={fileInputRef}
				onchange={handleFileChange}
				disabled={disabled || isCompressing}
			/>

			<!-- Hidden Form Input to submit with profile updates -->
			<input type="hidden" name="avatar" value={avatar || ''} />

			<p class="text-[0.76rem] text-(--text-muted) m-0 leading-relaxed max-w-md">
				Supported formats: JPG, PNG, WebP (Max 15MB)
			</p>

			{#if errorMessage}
				<div class="text-[0.75rem] text-(--error) flex items-center gap-1 mt-0.5">
					<AlertCircle size={13} class="shrink-0" />
					<span>{errorMessage}</span>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Reusable Full-size Avatar Viewer Lightbox Modal -->
<AvatarViewerModal 
	isOpen={showViewerModal} 
	imageUrl={avatar} 
	title={name || 'Profile Photo'} 
	onclose={() => (showViewerModal = false)} 
/>
