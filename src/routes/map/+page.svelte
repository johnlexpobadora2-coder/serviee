<script>
	import { page } from '$app/state';
	import MapViewer from '$lib/MapViewer.svelte';

	let lat = $derived(page.url.searchParams.get('lat') || '14.599512');
	let lng = $derived(page.url.searchParams.get('lng') || '120.984222');
	let title = $derived(page.url.searchParams.get('title') || 'Pinned Location');
	let address = $derived(page.url.searchParams.get('address') || '');
	let backUrl = $derived(page.url.searchParams.get('back') || '');
</script>

<svelte:head>
	<title>{title} | Serviee Map</title>
	<meta name="description" content="View pinned location on Serviee Map with Google Maps navigation." />
</svelte:head>

<MapViewer 
	latitude={lat} 
	longitude={lng} 
	title={title} 
	address={address} 
	backUrl={backUrl} 
	fullscreen={true}
/>
