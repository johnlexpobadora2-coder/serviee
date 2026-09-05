<script>
	import { onDestroy } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { CheckCircle, AlertTriangle } from 'lucide-svelte';

	import AdminPasscodeLock from '$lib/admin/AdminPasscodeLock.svelte';
	import AdminHeader from '$lib/admin/AdminHeader.svelte';
	import AdminTabsNav from '$lib/admin/AdminTabsNav.svelte';
	import AdminOverviewTab from '$lib/admin/AdminOverviewTab.svelte';
	import AdminUsersTab from '$lib/admin/AdminUsersTab.svelte';
	import AdminJobsTab from '$lib/admin/AdminJobsTab.svelte';
	import AdminReviewsTab from '$lib/admin/AdminReviewsTab.svelte';
	import AdminSystemTab from '$lib/admin/AdminSystemTab.svelte';
	import AdminDeleteModal from '$lib/admin/AdminDeleteModal.svelte';
	import AdminEditAddressModal from '$lib/admin/AdminEditAddressModal.svelte';

	let { data, form } = $props();

	// Secret Passcode Verification State
	let passcode = $state('');
	let isAuthenticated = $state(false);
	let passError = $state('');

	function lockAdmin() {
		isAuthenticated = false;
		passcode = '';
		if (typeof window !== 'undefined') {
			sessionStorage.removeItem('admin05_authed');
		}
	}

	onDestroy(() => {
		lockAdmin();
	});

	if (typeof window !== 'undefined') {
		window.addEventListener('pagehide', lockAdmin);
		window.addEventListener('beforeunload', lockAdmin);
	}

	function handlePasscodeSubmit(e) {
		e.preventDefault();
		if (passcode.trim() === '1473') {
			isAuthenticated = true;
			passError = '';
			if (typeof window !== 'undefined') {
				sessionStorage.setItem('admin05_authed', 'true');
			}
		} else {
			passError = 'Invalid Secret Passcode. Access denied.';
		}
	}

	// Navigation Tabs
	let activeTab = $state('overview'); // 'overview' | 'users' | 'jobs' | 'reviews' | 'system'

	// Search & Filters
	let userSearch = $state('');
	let userRoleFilter = $state('all');

	let jobSearch = $state('');
	let jobStatusFilter = $state('all');

	let reviewSearch = $state('');
	let reviewRatingFilter = $state('all');

	// Delete Modal State
	let deleteModal = $state({
		open: false,
		type: null,
		id: null,
		name: ''
	});

	function openDeleteModal(type, id, name) {
		deleteModal = { open: true, type, id, name };
	}

	function closeDeleteModal() {
		deleteModal = { open: false, type: null, id: null, name: '' };
	}

	// Edit Address Modal State
	let editAddressModal = $state({
		open: false,
		userId: null,
		name: '',
		address: ''
	});

	function openEditAddressModal(user) {
		editAddressModal = {
			open: true,
			userId: user.id,
			name: user.name,
			address: user.address || ''
		};
	}

	function closeEditAddressModal() {
		editAddressModal = { open: false, userId: null, name: '', address: '' };
	}

	// Svelte 5 Derived Reactive Filters
	let filteredUsers = $derived(
		(data.users || []).filter(u => {
			const matchesSearch = !userSearch || 
				u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
				u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
				u.phone?.includes(userSearch);
			const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
			return matchesSearch && matchesRole;
		})
	);

	let filteredJobs = $derived(
		(data.jobs || []).filter(j => {
			const matchesSearch = !jobSearch || 
				j.title?.toLowerCase().includes(jobSearch.toLowerCase()) ||
				j.category?.toLowerCase().includes(jobSearch.toLowerCase()) ||
				j.location?.toLowerCase().includes(jobSearch.toLowerCase());
			const matchesStatus = jobStatusFilter === 'all' || j.status === jobStatusFilter;
			return matchesSearch && matchesStatus;
		})
	);

	let filteredReviews = $derived(
		(data.reviews || []).filter(r => {
			const matchesSearch = !reviewSearch ||
				r.review_text?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
				r.customer_name?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
				r.worker_name?.toLowerCase().includes(reviewSearch.toLowerCase());
			const matchesRating = reviewRatingFilter === 'all' || Math.round(r.rating) === parseInt(reviewRatingFilter);
			return matchesSearch && matchesRating;
		})
	);
</script>

<svelte:head>
	<title>Admin Panel - Serviee [Admin05]</title>
</svelte:head>

<div class="text-slate-100 font-sans selection:bg-[#7261ef]/30 selection:text-white">
	{#if !isAuthenticated}
		<AdminPasscodeLock 
			bind:passcode 
			{passError} 
			onsubmit={handlePasscodeSubmit} 
		/>
	{:else}
		<div class="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-3.5 sm:space-y-6" transition:fade={{ duration: 150 }}>
			<AdminHeader onlock={lockAdmin} />

			{#if form?.message}
				<div 
					class="p-3 sm:p-4 rounded-xl text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg border transition-all {form.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}"
					transition:slide
				>
					<div class="flex items-center gap-2">
						{#if form.success}
							<CheckCircle size={16} class="text-emerald-400 shrink-0" />
						{:else}
							<AlertTriangle size={16} class="text-red-400 shrink-0" />
						{/if}
						<span class="font-medium">{form.message}</span>
					</div>
				</div>
			{/if}

			<AdminTabsNav 
				bind:activeTab 
				userCount={data.users?.length || 0} 
				jobCount={data.jobs?.length || 0} 
				reviewCount={data.reviews?.length || 0} 
			/>

			<main class="space-y-4 sm:space-y-6">
				{#if activeTab === 'overview'}
					<AdminOverviewTab 
						stats={data.stats} 
						users={data.users} 
						jobs={data.jobs} 
						onviewallusers={() => activeTab = 'users'} 
						onviewalljobs={() => activeTab = 'jobs'} 
					/>
				{:else if activeTab === 'users'}
					<AdminUsersTab 
						bind:userSearch 
						bind:userRoleFilter 
						{filteredUsers} 
						totalUsersCount={data.users?.length || 0} 
						customerCount={data.stats?.totalCustomers || 0} 
						workerCount={data.stats?.totalWorkers || 0} 
						onopeneditaddress={openEditAddressModal} 
						onopendelete={openDeleteModal} 
					/>
				{:else if activeTab === 'jobs'}
					<AdminJobsTab 
						bind:jobSearch 
						bind:jobStatusFilter 
						{filteredJobs} 
						onopendelete={openDeleteModal} 
					/>
				{:else if activeTab === 'reviews'}
					<AdminReviewsTab 
						bind:reviewSearch 
						bind:reviewRatingFilter 
						{filteredReviews} 
						onopendelete={openDeleteModal} 
					/>
				{:else if activeTab === 'system'}
					<AdminSystemTab onlock={lockAdmin} />
				{/if}
			</main>
		</div>
	{/if}

	<AdminDeleteModal 
		bind:deleteModal 
		onclose={closeDeleteModal} 
	/>

	<AdminEditAddressModal 
		bind:editAddressModal 
		onclose={closeEditAddressModal} 
	/>
</div>
