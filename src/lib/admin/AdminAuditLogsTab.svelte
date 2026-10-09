<script>
	import { fade, scale } from 'svelte/transition';
	import { 
		Search, ShieldAlert, ShieldCheck, KeyRound, MapPin, Trash2, 
		Clock, Globe, Terminal, LogOut, UserX, Download, 
		RefreshCw, Copy, Check, Eye, X, Filter, Sparkles
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';

	let { 
		auditSearch = $bindable(''),
		auditActionFilter = $bindable('all'),
		auditLogs = []
	} = $props();

	let selectedLog = $state(null);
	let showClearModal = $state(false);
	let isClearing = $state(false);
	let copiedKey = $state('');

	function copyToClipboard(text, key) {
		if (!text) return;
		navigator.clipboard.writeText(text).then(() => {
			copiedKey = key;
			setTimeout(() => {
				copiedKey = '';
			}, 2000);
		});
	}

	function formatDate(isoStr) {
		if (!isoStr) return 'N/A';
		try {
			return new Date(isoStr).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});
		} catch {
			return isoStr;
		}
	}

	function getActionBadge(action) {
		switch (action) {
			case 'ADMIN_LOGIN_SUCCESS':
				return { 
					bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', 
					icon: ShieldCheck, 
					label: 'Admin Login',
					description: 'Successful administrator authentication'
				};
			case 'ADMIN_LOGIN_FAILED':
				return { 
					bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', 
					icon: ShieldAlert, 
					label: 'Login Failed',
					description: 'Denied access attempt with invalid passcode'
				};
			case 'ADMIN_LOGOUT':
				return { 
					bg: 'bg-slate-500/10 text-slate-600 dark:text-[#b2acd6] border-slate-500/20', 
					icon: LogOut, 
					label: 'Admin Logout',
					description: 'Admin closed dashboard session'
				};
			case 'RESET_USER_PASSWORD':
				return { 
					bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', 
					icon: KeyRound, 
					label: 'Password Reset',
					description: 'Admin updated user password credentials'
				};
			case 'UPDATE_USER_ADDRESS':
				return { 
					bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', 
					icon: MapPin, 
					label: 'Address Updated',
					description: 'Admin modified client/worker service address'
				};
			case 'DELETE_USER':
				return { 
					bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', 
					icon: UserX, 
					label: 'User Deleted',
					description: 'Admin permanently deleted an account'
				};
			case 'DELETE_JOB':
				return { 
					bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', 
					icon: Trash2, 
					label: 'Job Deleted',
					description: 'Admin deleted a job listing from platform'
				};
			case 'DELETE_REVIEW':
				return { 
					bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', 
					icon: Trash2, 
					label: 'Review Deleted',
					description: 'Admin removed review entry from platform'
				};
			case 'UPDATE_JOB_STATUS':
				return { 
					bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', 
					icon: RefreshCw, 
					label: 'Status Updated',
					description: 'Admin adjusted status of a job listing'
				};
			case 'CLEAR_AUDIT_LOGS':
				return { 
					bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', 
					icon: Trash2, 
					label: 'Logs Cleared',
					description: 'Admin purged historical audit records'
				};
			default:
				return { 
					bg: 'bg-purple-500/10 text-[#7261ef] dark:text-purple-400 border-purple-500/20', 
					icon: ShieldCheck, 
					label: action?.replace(/_/g, ' ') || 'Action',
					description: 'Administrative platform event'
				};
		}
	}

	function formatDetailsText(details) {
		if (!details) return '—';
		if (typeof details === 'string') return details;
		try {
			const parts = [];
			for (const [key, value] of Object.entries(details)) {
				if (typeof value === 'object' && value !== null) {
					parts.push(`${key}: ${JSON.stringify(value)}`);
				} else {
					parts.push(`${key}: ${value}`);
				}
			}
			return parts.join(' | ');
		} catch {
			return JSON.stringify(details);
		}
	}

	let filteredLogs = $derived(
		(auditLogs || []).filter(log => {
			const query = (auditSearch || '').toLowerCase().trim();
			if (!query && auditActionFilter === 'all') return true;

			const detailsText = formatDetailsText(log.details).toLowerCase();
			const matchesSearch = !query || 
				(log.action || '').toLowerCase().includes(query) ||
				(log.target_id || '').toLowerCase().includes(query) ||
				(log.target_type || '').toLowerCase().includes(query) ||
				(log.admin_id || '').toLowerCase().includes(query) ||
				(log.ip_address || '').toLowerCase().includes(query) ||
				detailsText.includes(query);

			const matchesFilter = auditActionFilter === 'all' || log.action === auditActionFilter;
			return matchesSearch && matchesFilter;
		})
	);

	function exportLogsToCSV() {
		if (!auditLogs || auditLogs.length === 0) return;
		const headers = ['ID', 'Timestamp', 'Admin', 'Action', 'Target Type', 'Target ID', 'IP Address', 'Details'];
		const rows = auditLogs.map(log => [
			`"${log.id || ''}"`,
			`"${log.created_at || ''}"`,
			`"${log.admin_id || 'admin'}"`,
			`"${log.action || ''}"`,
			`"${log.target_type || ''}"`,
			`"${log.target_id || ''}"`,
			`"${log.ip_address || ''}"`,
			`"${(formatDetailsText(log.details) || '').replace(/"/g, '""')}"`
		]);

		const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `serviee_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	function exportLogsToJSON() {
		if (!auditLogs || auditLogs.length === 0) return;
		const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
		const link = document.createElement('a');
		link.setAttribute('href', dataStr);
		link.setAttribute('download', `serviee_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<div class="space-y-4" transition:fade={{ duration: 150 }}>
	<!-- Top Filter & Search Bar with Action Controls -->
	<div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-[#161138] border border-slate-200 dark:border-[#2c235b] p-3.5 sm:p-4 rounded-xl shadow-xs dark:shadow-xl transition-all">
		<!-- Search Input -->
		<div class="relative flex-1 max-w-md">
			<Search size={15} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#77719f]" />
			<input 
				type="text" 
				bind:value={auditSearch} 
				placeholder="Search by action, target ID, IP, or details..." 
				class="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#211a4e] border border-slate-300 dark:border-[#2c235b] rounded-lg text-slate-900 dark:text-[#faf9fe] placeholder-slate-400 dark:placeholder-[#77719f] text-xs focus:outline-none focus:bg-white dark:focus:bg-[#211a4e] focus:border-[#7261ef] focus:ring-2 focus:ring-[#7261ef]/20 transition-all font-medium"
			/>
			{#if auditSearch}
				<button 
					type="button" 
					onclick={() => auditSearch = ''} 
					class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 rounded cursor-pointer"
					aria-label="Clear search"
				>
					<X size={13} />
				</button>
			{/if}
		</div>

		<!-- Filter and Export Actions -->
		<div class="flex flex-wrap items-center justify-between lg:justify-end gap-2.5">
			<div class="flex items-center gap-1.5 min-w-42.5">
				<Filter size={14} class="text-slate-400 dark:text-[#77719f] shrink-0" />
				<select 
					bind:value={auditActionFilter}
					class="bg-slate-50 dark:bg-[#211a4e] border border-slate-300 dark:border-[#2c235b] text-slate-900 dark:text-[#faf9fe] text-xs rounded-lg px-2.5 py-2.5 focus:outline-none focus:bg-white dark:focus:bg-[#211a4e] focus:border-[#7261ef] focus:ring-2 focus:ring-[#7261ef]/20 w-full cursor-pointer font-semibold"
				>
					<option value="all">All Events ({auditLogs.length})</option>
					<option value="ADMIN_LOGIN_SUCCESS">Admin Logins</option>
					<option value="ADMIN_LOGIN_FAILED">Failed Logins</option>
					<option value="ADMIN_LOGOUT">Admin Logouts</option>
					<option value="RESET_USER_PASSWORD">Password Resets</option>
					<option value="UPDATE_USER_ADDRESS">Address Updates</option>
					<option value="DELETE_USER">User Deletions</option>
					<option value="DELETE_JOB">Job Deletions</option>
					<option value="UPDATE_JOB_STATUS">Job Status Updates</option>
					<option value="DELETE_REVIEW">Review Deletions</option>
					<option value="CLEAR_AUDIT_LOGS">Logs Purged</option>
				</select>
			</div>

			<div class="flex items-center gap-2">
				<button 
					type="button"
					onclick={exportLogsToCSV} 
					disabled={!auditLogs.length}
					class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#211a4e] dark:hover:bg-[#2b2266] text-slate-700 dark:text-[#faf9fe] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 dark:border-[#2c235b]"
					title="Export logs to CSV"
				>
					<Download size={13} />
					<span>CSV</span>
				</button>

				<button 
					type="button"
					onclick={exportLogsToJSON} 
					disabled={!auditLogs.length}
					class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#211a4e] dark:hover:bg-[#2b2266] text-slate-700 dark:text-[#faf9fe] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 dark:border-[#2c235b]"
					title="Export logs to JSON"
				>
					<Terminal size={13} />
					<span>JSON</span>
				</button>

				<button 
					type="button"
					onclick={() => showClearModal = true}
					disabled={!auditLogs.length}
					class="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-rose-200 dark:border-rose-500/20"
					title="Clear audit log history"
				>
					<Trash2 size={13} />
					<span>Clear</span>
				</button>
			</div>
		</div>
	</div>

	<!-- Results Stats bar -->
	<div class="flex items-center justify-between text-xs text-slate-500 dark:text-[#b2acd6] px-1">
		<div class="flex items-center gap-1.5">
			<Sparkles size={13} class="text-[#7261ef]" />
			<span>Showing <strong class="text-slate-800 dark:text-[#faf9fe]">{filteredLogs.length}</strong> of {auditLogs.length} logged events</span>
		</div>
		{#if auditSearch || auditActionFilter !== 'all'}
			<button 
				type="button"
				onclick={() => { auditSearch = ''; auditActionFilter = 'all'; }}
				class="text-[#7261ef] hover:underline font-semibold cursor-pointer"
			>
				Reset Filters
			</button>
		{/if}
	</div>

	<!-- Audit Logs Table (Desktop View) -->
	<div class="hidden sm:block bg-white dark:bg-[#161138] border border-slate-200 dark:border-[#2c235b] rounded-xl shadow-xs dark:shadow-xl overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="bg-slate-50 dark:bg-[#211a4e]/70 border-b border-slate-200 dark:border-[#2c235b] text-[11px] font-bold text-slate-500 dark:text-[#b2acd6] uppercase tracking-wider">
						<th class="py-3 px-4">Timestamp</th>
						<th class="py-3 px-4">Action / Event</th>
						<th class="py-3 px-4">Target</th>
						<th class="py-3 px-4">IP Address</th>
						<th class="py-3 px-4">Details</th>
						<th class="py-3 px-4 text-right">View</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-[#2c235b]/60 text-xs">
					{#each filteredLogs as log (log.id || log.created_at)}
						{@const badge = getActionBadge(log.action)}
						{@const BadgeIcon = badge.icon}
						<tr class="hover:bg-slate-50/80 dark:hover:bg-[#211a4e]/40 transition-colors group">
							<!-- Timestamp -->
							<td class="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-[#b2acd6] whitespace-nowrap">
								<div class="flex items-center gap-1.5">
									<Clock size={12} class="text-slate-400 dark:text-[#77719f] shrink-0" />
									<span>{formatDate(log.created_at)}</span>
								</div>
							</td>

							<!-- Action Badge -->
							<td class="py-3.5 px-4 whitespace-nowrap">
								<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border {badge.bg}">
									<BadgeIcon size={12} />
									<span>{badge.label}</span>
								</span>
							</td>

							<!-- Target -->
							<td class="py-3.5 px-4 font-mono text-[11px] text-slate-700 dark:text-[#b2acd6] whitespace-nowrap">
								{#if log.target_id}
									<div class="inline-flex items-center gap-1.5">
										<span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#211a4e] border border-slate-200 dark:border-[#2c235b] text-slate-700 dark:text-[#faf9fe] font-mono text-[10px]">
											{log.target_type || 'target'}: {log.target_id.slice(0, 8)}...
										</span>
										<button 
											type="button" 
											onclick={() => copyToClipboard(log.target_id, `target_${log.id}`)}
											class="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 rounded cursor-pointer"
											title="Copy Full Target ID"
										>
											{#if copiedKey === `target_${log.id}`}
												<Check size={11} class="text-emerald-500" />
											{:else}
												<Copy size={11} />
											{/if}
										</button>
									</div>
								{:else}
									<span class="text-slate-400 dark:text-[#77719f] font-sans">—</span>
								{/if}
							</td>

							<!-- IP Address -->
							<td class="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-[#b2acd6] whitespace-nowrap">
								<div class="flex items-center gap-1.5">
									<Globe size={11} class="text-slate-400 dark:text-[#77719f] shrink-0" />
									<span>{log.ip_address || '127.0.0.1'}</span>
									<button 
										type="button" 
										onclick={() => copyToClipboard(log.ip_address || '127.0.0.1', `ip_${log.id}`)}
										class="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
										title="Copy IP"
									>
										{#if copiedKey === `ip_${log.id}`}
											<Check size={11} class="text-emerald-500" />
										{:else}
											<Copy size={11} />
										{/if}
									</button>
								</div>
							</td>

							<!-- Details Summary -->
							<td class="py-3.5 px-4 text-slate-600 dark:text-[#b2acd6] text-xs max-w-xs truncate">
								<span title={formatDetailsText(log.details)}>
									{formatDetailsText(log.details)}
								</span>
							</td>

							<!-- Inspect Details Button -->
							<td class="py-3.5 px-4 text-right whitespace-nowrap">
								<button 
									type="button" 
									onclick={() => selectedLog = log}
									class="px-2 py-1 bg-slate-100 hover:bg-purple-50 dark:bg-[#211a4e] dark:hover:bg-purple-900/40 text-slate-600 hover:text-[#7261ef] dark:text-[#b2acd6] dark:hover:text-purple-300 rounded text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
									title="Inspect Log Entry"
								>
									<Eye size={12} />
									<span>Details</span>
								</button>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="py-14 text-center text-slate-500 dark:text-[#b2acd6]">
								<div class="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
									<ShieldAlert size={36} class="text-slate-300 dark:text-[#77719f]" />
									<p class="font-bold text-slate-800 dark:text-[#faf9fe] text-sm">No audit logs matching query</p>
									<p class="text-xs text-slate-400 dark:text-[#77719f]">All administrative operations like password resets, user deletions, logins, and status updates will be logged here automatically.</p>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Mobile Cards View -->
	<div class="sm:hidden space-y-3">
		{#each filteredLogs as log (log.id || log.created_at)}
			{@const badge = getActionBadge(log.action)}
			{@const BadgeIcon = badge.icon}
			<div class="bg-white dark:bg-[#161138] border border-slate-200 dark:border-[#2c235b] p-3.5 rounded-xl shadow-xs space-y-2.5">
				<div class="flex items-center justify-between gap-2">
					<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border {badge.bg}">
						<BadgeIcon size={11} />
						<span>{badge.label}</span>
					</span>
					<span class="text-[10px] font-mono text-slate-500 dark:text-[#b2acd6]">{formatDate(log.created_at)}</span>
				</div>

				{#if log.target_id}
					<div class="text-[11px] font-mono text-slate-700 dark:text-[#b2acd6] flex items-center justify-between">
						<div><span class="text-slate-400 dark:text-[#77719f]">Target:</span> {log.target_type || 'item'} ({log.target_id.slice(0, 10)}...)</div>
						<button 
							type="button" 
							onclick={() => copyToClipboard(log.target_id, `m_target_${log.id}`)}
							class="text-slate-400 hover:text-white p-1"
						>
							{#if copiedKey === `m_target_${log.id}`}
								<Check size={11} class="text-emerald-500" />
							{:else}
								<Copy size={11} />
							{/if}
						</button>
					</div>
				{/if}

				<div class="text-xs text-slate-600 dark:text-[#faf9fe] bg-slate-50 dark:bg-[#211a4e]/60 p-2 rounded-lg font-medium">
					{formatDetailsText(log.details)}
				</div>

				<div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#b2acd6] pt-2 border-t border-slate-100 dark:border-[#2c235b]">
					<span class="font-mono flex items-center gap-1">
						<Globe size={11} /> {log.ip_address || '127.0.0.1'}
					</span>
					<button 
						type="button" 
						onclick={() => selectedLog = log}
						class="text-[#7261ef] font-semibold hover:underline flex items-center gap-1"
					>
						<Eye size={12} />
						<span>Full Details</span>
					</button>
				</div>
			</div>
		{:else}
			<div class="bg-white dark:bg-[#161138] border border-slate-200 dark:border-[#2c235b] p-8 rounded-xl text-center text-slate-500 dark:text-[#b2acd6] space-y-2">
				<ShieldAlert size={28} class="mx-auto text-slate-300 dark:text-[#77719f]" />
				<p class="text-xs font-semibold">No audit logs found.</p>
			</div>
		{/each}
	</div>
</div>

<!-- Log Detail Inspection Modal -->
{#if selectedLog}
	{@const badge = getActionBadge(selectedLog.action)}
	{@const BadgeIcon = badge.icon}
	<div 
		class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
		transition:fade={{ duration: 150 }}
		onclick={(e) => { if (e.target === e.currentTarget) selectedLog = null; }}
		onkeydown={(e) => { if (e.key === 'Escape') selectedLog = null; }}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div 
			class="bg-white dark:bg-[#161138] border border-slate-200 dark:border-[#2c235b] rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
			transition:scale={{ duration: 150, start: 0.96 }}
		>
			<div class="flex items-center justify-between border-b border-slate-100 dark:border-[#2c235b] pb-3.5">
				<div class="flex items-center gap-2">
					<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border {badge.bg}">
						<BadgeIcon size={13} />
						<span>{badge.label}</span>
					</span>
					<span class="text-xs font-mono text-slate-500 dark:text-[#b2acd6]">Event Inspector</span>
				</div>
				<button 
					type="button" 
					onclick={() => selectedLog = null} 
					class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#211a4e] transition-colors cursor-pointer"
					aria-label="Close dialog"
				>
					<X size={16} />
				</button>
			</div>

			<div class="space-y-3 text-xs">
				<div class="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-[#211a4e]/50 rounded-xl border border-slate-200/60 dark:border-[#2c235b]">
					<div>
						<div class="text-[10px] text-slate-400 dark:text-[#77719f] font-bold uppercase">Timestamp</div>
						<div class="font-mono text-slate-800 dark:text-[#faf9fe] mt-0.5">{formatDate(selectedLog.created_at)}</div>
					</div>
					<div>
						<div class="text-[10px] text-slate-400 dark:text-[#77719f] font-bold uppercase">IP Address</div>
						<div class="font-mono text-slate-800 dark:text-[#faf9fe] mt-0.5">{selectedLog.ip_address || '127.0.0.1'}</div>
					</div>
					<div>
						<div class="text-[10px] text-slate-400 dark:text-[#77719f] font-bold uppercase">Admin / Actor</div>
						<div class="font-mono text-slate-800 dark:text-[#faf9fe] mt-0.5">{selectedLog.admin_id || 'admin_master'}</div>
					</div>
					<div>
						<div class="text-[10px] text-slate-400 dark:text-[#77719f] font-bold uppercase">Target Entity</div>
						<div class="font-mono text-slate-800 dark:text-[#faf9fe] mt-0.5 truncate">{selectedLog.target_type || 'None'}</div>
					</div>
				</div>

				{#if selectedLog.target_id}
					<div class="space-y-1">
						<div class="text-[10px] text-slate-400 dark:text-[#77719f] font-bold uppercase flex items-center justify-between">
							<span>Target ID</span>
							<button 
								type="button" 
								onclick={() => copyToClipboard(selectedLog.target_id, 'modal_target')}
								class="text-[#7261ef] hover:underline flex items-center gap-1 font-sans cursor-pointer"
							>
								{#if copiedKey === 'modal_target'}
									<Check size={11} /> Copied
								{:else}
									<Copy size={11} /> Copy
								{/if}
							</button>
						</div>
						<div class="p-2.5 bg-slate-100 dark:bg-[#211a4e] rounded-lg font-mono text-[11px] break-all select-all text-slate-800 dark:text-[#faf9fe] border border-slate-200 dark:border-[#2c235b]">
							{selectedLog.target_id}
						</div>
					</div>
				{/if}

				<div class="space-y-1">
					<div class="text-[10px] text-slate-400 dark:text-[#77719f] font-bold uppercase flex items-center justify-between">
						<span>Payload & Details</span>
						<button 
							type="button" 
							onclick={() => copyToClipboard(JSON.stringify(selectedLog, null, 2), 'modal_json')}
							class="text-[#7261ef] hover:underline flex items-center gap-1 font-sans cursor-pointer"
						>
							{#if copiedKey === 'modal_json'}
								<Check size={11} /> Copied JSON
							{:else}
								<Copy size={11} /> Copy JSON
							{/if}
						</button>
					</div>
					<pre class="p-3 bg-slate-950 dark:bg-[#0c081e] text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800 dark:border-[#2c235b] whitespace-pre-wrap leading-relaxed max-h-52">{typeof selectedLog.details === 'object' ? JSON.stringify(selectedLog.details, null, 2) : (selectedLog.details || 'No payload attached')}</pre>
				</div>
			</div>

			<div class="pt-2 flex justify-end">
				<button 
					type="button" 
					onclick={() => selectedLog = null}
					class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#211a4e] dark:hover:bg-[#2b2266] text-slate-700 dark:text-[#faf9fe] rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-[#2c235b]"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Clear Confirmation Modal -->
{#if showClearModal}
	<div 
		class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
		transition:fade={{ duration: 150 }}
		onclick={(e) => { if (e.target === e.currentTarget && !isClearing) showClearModal = false; }}
		onkeydown={(e) => { if (e.key === 'Escape' && !isClearing) showClearModal = false; }}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div 
			class="bg-white dark:bg-[#161138] border border-slate-200 dark:border-[#2c235b] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4"
			transition:scale={{ duration: 150, start: 0.96 }}
		>
			<div class="flex items-center gap-3 text-rose-500">
				<div class="p-2.5 rounded-full bg-rose-500/10 border border-rose-500/20">
					<Trash2 size={22} />
				</div>
				<div>
					<h4 class="font-bold text-base text-slate-900 dark:text-[#faf9fe]">Purge Audit Log History?</h4>
					<p class="text-xs text-slate-400 dark:text-[#77719f]">This will remove all logged historical events.</p>
				</div>
			</div>

			<p class="text-xs text-slate-600 dark:text-[#b2acd6] leading-relaxed bg-rose-50/50 dark:bg-rose-500/5 p-3 rounded-lg border border-rose-200/50 dark:border-rose-500/10">
				Are you sure you want to clear all {auditLogs.length} audit logs? A record of this clearing action will still be logged for safety.
			</p>

			<form 
				method="POST" 
				action="?/clearAuditLogs" 
				use:enhance={() => {
					isClearing = true;
					return async ({ update }) => {
						await update();
						isClearing = false;
						showClearModal = false;
					};
				}}
				class="flex items-center justify-end gap-2 pt-2"
			>
				<button 
					type="button" 
					disabled={isClearing}
					onclick={() => showClearModal = false}
					class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#211a4e] dark:hover:bg-[#2b2266] text-slate-700 dark:text-[#faf9fe] rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 border border-slate-200 dark:border-[#2c235b]"
				>
					Cancel
				</button>
				<button 
					type="submit" 
					disabled={isClearing}
					class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
				>
					{#if isClearing}
						<RefreshCw size={13} class="animate-spin" />
						<span>Clearing...</span>
					{:else}
						<Trash2 size={13} />
						<span>Confirm Purge</span>
					{/if}
				</button>
			</form>
		</div>
	</div>
{/if}
