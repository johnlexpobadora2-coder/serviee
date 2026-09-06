<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { pushState, replaceState } from '$app/navigation';

	let { 
		activeConvId = $bindable(''), 
		showGpsDropup = $bindable(false),
		activeTab = 'chat'
	} = $props();

	let isMounted = $state(false);
	let pushedState = $state(false);

	$effect(() => {
		if (!browser || !isMounted) return;

		if (activeTab === 'chat' && activeConvId) {
			if (!pushedState) {
				pushedState = true;
				try {
					pushState('', { chatOpen: true, convId: activeConvId });
				} catch (e) {}
			} else if (history.state?.convId !== activeConvId) {
				try {
					replaceState('', { chatOpen: true, convId: activeConvId });
				} catch (e) {}
			}
		} else if ((!activeConvId || activeTab !== 'chat') && pushedState) {
			pushedState = false;
		}
	});

	function handlePopState(e) {
		if (activeConvId) {
			pushedState = false;
			activeConvId = '';
			showGpsDropup = false;
		}
	}

	onMount(() => {
		isMounted = true;
		if (typeof window !== 'undefined') {
			window.addEventListener('popstate', handlePopState);
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('popstate', handlePopState);
		}
	});
</script>
