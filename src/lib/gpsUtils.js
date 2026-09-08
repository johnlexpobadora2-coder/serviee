/**
 * Utility helper functions for Device GPS Geolocation and Google Maps integration
 */

/**
 * Get the current device coordinates via the HTML5 Geolocation API
 * @returns {Promise<{ latitude: number, longitude: number, accuracy: number }>}
 */
export function getCurrentCoordinates() {
	return new Promise((resolve, reject) => {
		if (typeof window === 'undefined' || !navigator.geolocation) {
			reject(new Error('Geolocation is not supported by your browser.'));
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				resolve({
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
					accuracy: position.coords.accuracy
				});
			},
			(error) => {
				let msg = 'Unable to retrieve location.';
				switch (error.code) {
					case error.PERMISSION_DENIED:
						msg = 'Location permission was denied. Please allow location access in your browser settings.';
						break;
					case error.POSITION_UNAVAILABLE:
						msg = 'Location information is unavailable on your device.';
						break;
					case error.TIMEOUT:
						msg = 'Location request timed out. Please try again.';
						break;
				}
				reject(new Error(msg));
			},
			{
				enableHighAccuracy: true,
				timeout: 12000,
				maximumAge: 30000
			}
		);
	});
}

import { resolvePhilippineCity } from '$lib/philippinesLocations.js';

/**
 * Perform reverse geocoding to retrieve city / municipality / road using OpenStreetMap Nominatim
 * and automatically resolve to official Philippine City/Municipality naming (e.g. Davao City, Antipolo City).
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{ displayName: string, city: string, province: string, region: string }>}
 */
export async function reverseGeocode(lat, lng) {
	try {
		const res = await fetch(
			`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
			{
				headers: {
					'Accept-Language': 'en'
				}
			}
		);
		if (!res.ok) throw new Error('Failed to resolve address from coordinates.');
		const data = await res.json();
		const addr = data.address || {};

		// Intelligently resolve to official Philippine City / Municipality (e.g. "Davao" -> "Davao City")
		const resolved = resolvePhilippineCity(data);

		const city = resolved.city || addr.city || addr.town || addr.municipality || addr.city_district || addr.suburb || addr.village || addr.county || '';
		const province = resolved.province || addr.province || addr.state || addr.region || '';
		const region = resolved.region || addr.region || '';
		const displayName = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

		return {
			displayName,
			city,
			province,
			region
		};
	} catch (err) {
		console.warn('Reverse geocoding error:', err);
		return {
			displayName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
			city: '',
			province: '',
			region: ''
		};
	}
}

/**
 * Search/Forward geocode address, place or landmark name to coordinates
 * @param {string} query
 * @returns {Promise<Array<{ displayName: string, lat: number, lng: number, city: string }>>}
 */
export async function forwardGeocode(query) {
	if (!query || !query.trim()) return [];
	try {
		const formattedQuery = query.includes('Philippines') ? query : `${query}, Philippines`;
		const res = await fetch(
			`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formattedQuery)}&limit=5&addressdetails=1`,
			{
				headers: {
					'Accept-Language': 'en'
				}
			}
		);
		if (!res.ok) return [];
		const data = await res.json();
		return (data || []).map(item => {
			const addr = item.address || {};
			const resolved = resolvePhilippineCity(item);
			const city = resolved.city || addr.city || addr.town || addr.municipality || addr.city_district || addr.suburb || '';
			return {
				displayName: item.display_name,
				lat: parseFloat(item.lat),
				lng: parseFloat(item.lon),
				city
			};
		});
	} catch (err) {
		console.warn('Forward geocode search error:', err);
		return [];
	}
}

/**
 * Build standard Google Maps link
 * @param {number|string} lat
 * @param {number|string} lng
 * @param {string} [label]
 * @returns {string}
 */
export function getGoogleMapsUrl(lat, lng, label = '') {
	return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Build OpenStreetMap Embed URL for lightweight interactive iframe previews (no API key needed)
 * @param {number|string} lat
 * @param {number|string} lng
 * @returns {string}
 */
export function getEmbedMapUrl(lat, lng) {
	const numericLat = typeof lat === 'number' ? lat : parseFloat(lat);
	const numericLng = typeof lng === 'number' ? lng : parseFloat(lng);
	const offset = 0.005;
	const bbox = `${numericLng - offset},${numericLat - offset},${numericLng + offset},${numericLat + offset}`;
	return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${numericLat},${numericLng}`;
}

/**
 * Formats a GPS payload for sending via chat
 * Protocol: [GPS_LOCATION:lat,lng|Optional Title/Address]
 * @param {number|string} lat
 * @param {number|string} lng
 * @param {string} [label]
 * @returns {string}
 */
export function formatGpsChatMessage(lat, lng, label = 'Current Location') {
	return `[GPS_LOCATION:${lat},${lng}|${label}]`;
}

/**
 * Checks whether a message content string is a GPS location message
 * @param {string} content
 * @returns {boolean}
 */
export function isGpsMessage(content) {
	if (!content || typeof content !== 'string') return false;
	return content.startsWith('[GPS_LOCATION:') && content.endsWith(']');
}

/**
 * Parses a GPS message string into structured data
 * @param {string} content
 * @returns {{ isGps: boolean, lat: number, lng: number, label: string, mapUrl: string, embedUrl: string } | null}
 */
export function parseGpsMessage(content) {
	if (!isGpsMessage(content)) return null;

	try {
		const raw = content.slice('[GPS_LOCATION:'.length, -1);
		const [coords, ...labelParts] = raw.split('|');
		const label = labelParts.join('|') || 'Pinned Location';
		const [latStr, lngStr] = coords.split(',');
		const lat = parseFloat(latStr);
		const lng = parseFloat(lngStr);

		if (isNaN(lat) || isNaN(lng)) return null;

		return {
			isGps: true,
			lat,
			lng,
			label,
			mapUrl: getGoogleMapsUrl(lat, lng, label),
			embedUrl: getEmbedMapUrl(lat, lng)
		};
	} catch (e) {
		return null;
	}
}

/**
 * Formats an image payload for sending via chat
 * Protocol: [IMAGE_MESSAGE:dataUrl|optionalCaption]
 * @param {string} dataUrl
 * @param {string} [caption]
 * @returns {string}
 */
export function formatImageChatMessage(dataUrl, caption = '') {
	return caption ? `[IMAGE_MESSAGE:${dataUrl}|${caption}]` : `[IMAGE_MESSAGE:${dataUrl}]`;
}

/**
 * Checks whether a message content string is an image message
 * @param {string} content
 * @returns {boolean}
 */
export function isImageMessage(content) {
	if (!content || typeof content !== 'string') return false;
	return content.startsWith('[IMAGE_MESSAGE:') && content.endsWith(']');
}

/**
 * Parses an image message string into structured data
 * @param {string} content
 * @returns {{ isImage: boolean, url: string, caption: string } | null}
 */
export function parseImageMessage(content) {
	if (!isImageMessage(content)) return null;
	try {
		const raw = content.slice('[IMAGE_MESSAGE:'.length, -1);
		const pipeIdx = raw.indexOf('|');
		if (pipeIdx !== -1) {
			const url = raw.substring(0, pipeIdx);
			const caption = raw.substring(pipeIdx + 1);
			return { isImage: true, url, caption };
		}
		return { isImage: true, url: raw, caption: '' };
	} catch (e) {
		return null;
	}
}

/**
 * Compress and downscale an image File using HTML Canvas
 * @param {File} file
 * @param {number} [maxWidth=1200]
 * @param {number} [maxHeight=1200]
 * @param {number} [quality=0.8]
 * @returns {Promise<string>} Data URL of compressed image
 */
export function compressImageFile(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const img = new Image();
			img.onload = () => {
				let width = img.width;
				let height = img.height;

				if (width > maxWidth || height > maxHeight) {
					if (width / height > maxWidth / maxHeight) {
						height = Math.round((height * maxWidth) / width);
						width = maxWidth;
					} else {
						width = Math.round((width * maxHeight) / height);
						height = maxHeight;
					}
				}

				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext('2d');
				ctx.drawImage(img, 0, 0, width, height);

				const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
				resolve(compressedDataUrl);
			};
			img.onerror = () => reject(new Error('Failed to load image for compression.'));
			img.src = typeof e.target?.result === 'string' ? e.target.result : String(e.target?.result || '');
		};
		reader.onerror = () => reject(new Error('Failed to read image file.'));
		reader.readAsDataURL(file);
	});
}

/**
 * Format a text snippet for conversation list preview
 * @param {string} content
 * @returns {string}
 */
export function formatMessagePreview(content) {
	if (!content) return 'No messages yet.';
	if (isGpsMessage(content)) return '📍 Shared GPS Location';
	if (isImageMessage(content)) return '📷 Sent a photo';
	return content;
}

