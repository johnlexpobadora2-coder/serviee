/**
 * Ultra-lightweight image compression & avatar handling utilities.
 * Ensures images are heavily compressed before database storage,
 * stripping all EXIF/GPS metadata and center-cropping to square avatars.
 */

/**
 * Ultra-compresses and square center-crops an avatar image file.
 * Resizes to 256x256 max dimensions and applies WebP compression (quality 0.72)
 * with JPEG fallback. Strips all EXIF/GPS metadata.
 * Produces tiny base64 data URLs (~8KB - 25KB).
 * 
 * @param {File|Blob} file
 * @param {Object} [options]
 * @param {number} [options.maxSize=256] - Max width & height in px
 * @param {number} [options.quality=0.72] - Compression quality (0 to 1)
 * @returns {Promise<{ dataUrl: string, sizeBytes: number, originalSizeBytes: number, reductionPercent: number, width: number, height: number }>}
 */
export function compressAvatarImage(file, { maxSize = 256, quality = 0.72 } = {}) {
	return new Promise((resolve, reject) => {
		if (!file) {
			return reject(new Error('No image file provided.'));
		}

		// Security: Validate MIME type
		const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'];
		if (file.type && !validTypes.includes(file.type.toLowerCase()) && !file.type.startsWith('image/')) {
			return reject(new Error('Invalid image file type. Please upload a JPG, PNG, or WebP photo.'));
		}

		// Security: Limit raw file input to 15MB before browser decoding
		const MAX_RAW_BYTES = 15 * 1024 * 1024;
		if (file.size > MAX_RAW_BYTES) {
			return reject(new Error('Image file is too large. Please select a photo under 15MB.'));
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			const img = new Image();
			img.onload = () => {
				try {
					const originalWidth = img.naturalWidth || img.width;
					const originalHeight = img.naturalHeight || img.height;

					if (!originalWidth || !originalHeight) {
						return reject(new Error('Unable to read image dimensions.'));
					}

					// 1. Calculate square center-crop coordinates
					const minDim = Math.min(originalWidth, originalHeight);
					const cropX = Math.round((originalWidth - minDim) / 2);
					const cropY = Math.round((originalHeight - minDim) / 2);

					// 2. Target canvas dimensions (square 256x256 or less)
					const targetSize = Math.min(maxSize, minDim);

					const canvas = document.createElement('canvas');
					canvas.width = targetSize;
					canvas.height = targetSize;

					const ctx = canvas.getContext('2d');
					if (!ctx) {
						return reject(new Error('Could not initialize canvas context.'));
					}

					// Enable high-quality smoothing for sharp downscaling
					ctx.imageSmoothingEnabled = true;
					ctx.imageSmoothingQuality = 'high';

					// Draw center-cropped square to canvas (strips all EXIF headers & metadata)
					ctx.drawImage(
						img,
						cropX, cropY, minDim, minDim, // Source rect
						0, 0, targetSize, targetSize   // Destination rect
					);

					// 3. Compress to WebP (with fallback to JPEG)
					let compressedDataUrl = canvas.toDataURL('image/webp', quality);
					if (!compressedDataUrl.startsWith('data:image/webp')) {
						compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
					}

					// 4. Calculate approximate size in bytes
					const base64Data = compressedDataUrl.split(',')[1] || '';
					const sizeBytes = Math.round((base64Data.length * 3) / 4);
					const originalSizeBytes = file.size || sizeBytes;
					const reductionPercent = originalSizeBytes > sizeBytes 
						? Math.round(((originalSizeBytes - sizeBytes) / originalSizeBytes) * 100) 
						: 0;

					resolve({
						dataUrl: compressedDataUrl,
						sizeBytes,
						originalSizeBytes,
						reductionPercent,
						width: targetSize,
						height: targetSize
					});
				} catch (err) {
					reject(err);
				}
			};
			img.onerror = () => reject(new Error('Failed to process image file. The file may be corrupted.'));
			img.src = typeof e.target?.result === 'string' ? e.target.result : String(e.target?.result || '');
		};
		reader.onerror = () => reject(new Error('Failed to read image file.'));
		reader.readAsDataURL(file);
	});
}

/**
 * Format bytes to readable string (e.g. 14.5 KB)
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
	if (!bytes || bytes <= 0) return '0 B';
	const units = ['B', 'KB', 'MB'];
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const value = bytes / Math.pow(1024, i);
	return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
