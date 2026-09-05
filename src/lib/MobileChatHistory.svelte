<script>
	import { onMount, onDestroy } from 'svelte';

	let { 
		activeConvId = $bindable(''), 
		showGpsDropup = $bindable(false),
		activeTab = 'chat'
	} = $props();

	let pushedState = $state(false);

	$effect(() => {
		if (typeof window === 'undefined') return;

		if (activeTab === 'chat' && activeConvId) {
			if (!pushedState) {
				pushedState = true;
				try {
					history.pushState({ chatOpen: true, convId: activeConvId }, '');
				} catch (e) {
					console.error('MobileChatHistory pushState error:', e);
				}
			} else if (history.state?.convId !== activeConvId) {
				try {
					history.replaceState({ chatOpen: true, convId: activeConvId }, '');
				} catch (e) {
					console.error('MobileChatHistory replaceState error:', e);
				}
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
