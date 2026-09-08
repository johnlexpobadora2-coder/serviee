export const CITIES_MUNICIPALITIES = [
	'Caloocan City',
	'Las Piñas City',
	'Makati City',
	'Malabon City',
	'Mandaluyong City',
	'Manila City',
	'Marikina City',
	'Muntinlupa City',
	'Navotas City',
	'Parañaque City',
	'Pasay City',
	'Pasig City',
	'Quezon City',
	'San Juan City',
	'Taguig City',
	'Valenzuela City',
	'Pateros',
	'Antipolo City',
	'Angono',
	'Baras',
	'Binangonan',
	'Cainta',
	'Cardona',
	'Jala-Jala',
	'Morong',
	'Pililla',
	'Rodriguez (Montalban)',
	'San Mateo',
	'Tanay',
	'Taytay',
	'Teresa',
	'Baliuag City',
	'Malolos City',
	'Meycauayan City',
	'San Jose del Monte City',
	'Angat',
	'Balagtas',
	'Bocaue',
	'Bulakan',
	'Bustos',
	'Calumpit',
	'Doña Remedios Trinidad (DRT)',
	'Guiguinto',
	'Hagonoy',
	'Marilao',
	'Norzagaray',
	'Obando',
	'Pandi',
	'Paombong',
	'Plaridel',
	'Pulilan',
	'San Ildefonso',
	'San Miguel',
	'San Rafael',
	'Santa Maria'
];

/**
 * Helper to match any city, town, or address string to the supported CITIES_MUNICIPALITIES list
 * @param {string} query 
 * @returns {string} The matched city from CITIES_MUNICIPALITIES or empty string
 */
export function findMatchingCity(query) {
	if (!query || typeof query !== 'string') return '';
	const clean = query.trim().toLowerCase();

	// 1. Direct / exact normalized comparison
	for (const city of CITIES_MUNICIPALITIES) {
		const cityLower = city.toLowerCase();
		const withoutCity = cityLower.replace(' city', '').trim();
		if (clean === cityLower || clean === withoutCity) {
			return city;
		}
	}

	// 2. Specific alias checks
	if (clean.includes('montalban') || clean.includes('rodriguez')) {
		return 'Rodriguez (Montalban)';
	}
	if (clean.includes('drt') || clean.includes('doña remedios') || clean.includes('dona remedios')) {
		return 'Doña Remedios Trinidad (DRT)';
	}
	if (clean.includes('san jose del monte') || clean.includes('sjdm')) {
		return 'San Jose del Monte City';
	}

	// 3. Substring / inclusion match against base name
	for (const city of CITIES_MUNICIPALITIES) {
		const cityLower = city.toLowerCase();
		const withoutCity = cityLower.replace(' city', '').trim();
		if (clean.includes(withoutCity) || clean.includes(cityLower)) {
			return city;
		}
	}

	// 4. City list item contains query
	for (const city of CITIES_MUNICIPALITIES) {
		const cityLower = city.toLowerCase();
		const withoutCity = cityLower.replace(' city', '').trim();
		if (withoutCity.includes(clean) || cityLower.includes(clean)) {
			return city;
		}
	}

	return '';
}

