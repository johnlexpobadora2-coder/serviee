<script>
	import { MessageSquare, Pin, ArrowLeft, User, Trash2, MapPin, ExternalLink, Plus, Compass, Navigation, Image as ImageIcon } from 'lucide-svelte';
	import { parseGpsMessage, parseImageMessage } from '$lib/gpsUtils.js';

	let { 
		conversations = [], 
		activeConversation = null, 
		activeConvId = $bindable(''), 
		unreadConvIds = new Set(), 
		loadingMessagesConvId = null, 
		loadingMoreMessages = false, 
		isOtherUserTyping = false, 
		newMessageContent = $bindable(''), 
		sendingMessage = false, 
		sharingLocation = false, 
		uploadingImage = false, 
		showGpsDropup = $bindable(false), 
		currentUserId = null, 
		fileInputRef = $bindable(null), 
		onselectconversation, 
		oncloseactiveconversation, 
		onchatscroll, 
		onloadmoremessages, 
		onopenviewprofile, 
		onpromptdeletemessage, 
		onpromptdeleteconversation, 
		ontriggerimageupload, 
		onimagefileselect, 
		onsharelocation, 
		onopencustomlocationmodal, 
		onhandletypinginput, 
		onsendmessage, 
		onpreviewimage 
	} = $props();
</script>

<div class="chat-container {activeConvId ? 'has-active-conv' : ''}">
	<!-- Left Sidebar: Conversations List -->
	<div class="chat-threads-sidebar">
		<div class="chat-threads-header" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
			<div style="display: flex; align-items: center; gap: 0.5rem;">
				<MessageSquare size={18} /> Inquiries & Messages
			</div>
		</div>
		<div class="chat-thread-list">
			{#if !conversations || conversations.length === 0}
				<div style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
					No active chats yet.<br />Click "Chat / Inquire" on any job post to contact clients.
				</div>
			{:else}
				{#each conversations as conv (conv.id)}
					<div class="chat-thread-item-wrapper" style="position: relative; display: flex; align-items: center;">
						<button
							type="button"
							class="chat-thread-item {activeConversation?.id === conv.id ? 'active' : ''}"
							style="flex: 1;"
							onclick={() => onselectconversation(conv.id)}
						>
							<div class="chat-avatar" style="position: relative;">
								{conv.other_user_name ? conv.other_user_name.charAt(0).toUpperCase() : 'U'}
								{#if unreadConvIds.has(conv.id)}
									<span class="chat-unread-dot" style="position: absolute; top: -2px; right: -2px; border: 2px solid var(--bg-card);"></span>
								{/if}
							</div>
							<div class="chat-thread-info">
								<div class="chat-thread-top">
									<span class="chat-thread-name">{conv.other_user_name}</span>
									<span class="chat-role-badge">Client</span>
								</div>
								<div class="chat-thread-title">
									<Pin size={11} style="flex-shrink: 0;" /> <span class="chat-thread-title-text">{conv.job_title}</span>
								</div>
								<div class="chat-thread-preview" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
									<span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
										{conv.last_message || "No messages yet."}
									</span>
									{#if unreadConvIds.has(conv.id)}
										<span class="badge-unread-counter" style="font-size: 0.65rem; height: 14px; min-width: 14px; padding: 0 3px;">•</span>
									{/if}
								</div>
							</div>
						</button>
					</div>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Right Panel: Message Thread Window -->
	<div class="chat-window">
		{#if activeConversation}
			<div class="chat-header">
				<div style="display: flex; align-items: center; gap: 0.5rem; min-width: 0; flex: 1;">
					<button
						type="button"
						class="btn btn-outline mobile-back-btn"
						aria-label="Back to chat list"
						style="display: none;"
						onclick={oncloseactiveconversation}
					>
						<ArrowLeft size={22} />
						<span>Back</span>
					</button>
					<div style="min-width: 0;">
						<h4 style="margin: 0; font-size: 1.05rem; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
							{activeConversation.other_user_name}
						</h4>
						<span style="font-size: 0.78rem; color: var(--accent-hover); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
							Job: {activeConversation.job_title}
						</span>
					</div>
				</div>

				<div style="display: flex; align-items: center; gap: 0.45rem; flex-shrink: 0; margin-left: 0.5rem;">
					<button
						type="button"
						class="btn btn-outline chat-action-icon-btn"
						style="width: 36px; height: 36px; min-width: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; border-color: var(--accent); color: var(--accent-hover);"
						title="View Profile"
						aria-label="View Profile"
						onclick={() => onopenviewprofile(activeConversation.other_user_id)}
					>
						<User size={18} />
					</button>
					{#if onpromptdeleteconversation}
						<button
							type="button"
							class="btn btn-outline chat-action-icon-btn chat-delete-conv-btn"
							style="width: 36px; height: 36px; min-width: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; border-color: var(--border-color); color: var(--text-muted);"
							title="Delete Conversation"
							aria-label="Delete Conversation"
							onclick={() => onpromptdeleteconversation(activeConversation)}
						>
							<Trash2 size={16} />
						</button>
					{/if}
				</div>
			</div>

			<div class="chat-messages-body" id="chat-messages-worker-body" onscroll={onchatscroll}>
				{#if loadingMessagesConvId === activeConversation.id && (!activeConversation.messages || activeConversation.messages.length === 0)}
					<div style="display: flex; align-items: center; justify-content: center; height: 100%; min-height: 180px; margin: auto;">
						<div class="spinner spinner-accent"></div>
					</div>
				{:else if !activeConversation.messages || activeConversation.messages.length === 0}
					<div style="text-align: center; color: var(--text-muted); margin: auto; font-size: 0.9rem;">
						Start conversation with {activeConversation.other_user_name}...
					</div>
				{:else}
					{#if loadingMoreMessages}
						<div style="display: flex; align-items: center; justify-content: center; padding: 0.5rem 0; width: 100%;">
							<div class="spinner spinner-sm spinner-accent"></div>
						</div>
					{:else if activeConversation.hasMore}
						<div style="text-align: center; padding: 0.3rem 0; margin-bottom: 0.5rem;">
							<button 
								type="button" 
								class="btn btn-outline" 
								style="font-size: 0.72rem; padding: 0.15rem 0.6rem; opacity: 0.8; border-color: var(--border-color); color: var(--text-muted);"
								onclick={onloadmoremessages}
							>
								Load older messages
							</button>
						</div>
					{/if}
					{#each activeConversation.messages as msg (msg.id || msg.created_at)}
						{@const gpsData = parseGpsMessage(msg.content)}
						{@const imgData = parseImageMessage(msg.content)}
						<div class="chat-bubble-row {msg.sender_id === currentUserId ? 'sent' : 'received'}">
							{#if msg.sender_id === currentUserId}
								<button 
									type="button" 
									class="chat-msg-delete-btn" 
									onclick={() => onpromptdeletemessage(msg.id)} 
									title="Delete message"
									aria-label="Delete message"
								>
									<Trash2 size={13} />
								</button>
							{/if}
							<div class="chat-bubble-wrap {msg.sender_id === currentUserId ? 'sent' : 'received'}">
								<div class="chat-bubble {msg.sender_id === currentUserId ? 'sent' : 'received'}">
									{#if gpsData}
										<div class="chat-location-card">
											<div class="chat-location-header">
												<MapPin size={15} color="var(--accent-hover)" />
												<span>{gpsData.label}</span>
											</div>
											<div class="chat-location-preview-box">
												<iframe 
													title="Shared GPS Location"
													src={gpsData.embedUrl}
													loading="lazy"
												></iframe>
											</div>
											<div style="font-size: 0.72rem; opacity: 0.85;">
												Coordinates: {gpsData.lat}, {gpsData.lng}
											</div>
											<div class="chat-location-actions">
												<a 
													href={gpsData.mapUrl} 
													class="chat-location-btn"
												>
													<ExternalLink size={13} /> Open in Google Maps
												</a>
											</div>
										</div>
									{:else if imgData}
										<div class="chat-image-card">
											<button 
												type="button" 
												class="chat-image-btn" 
												onclick={() => onpreviewimage(imgData.url)}
												title="Click to view full photo"
											>
												<img src={imgData.url} alt="Shared attachment" class="chat-image-preview" loading="lazy" />
											</button>
											{#if imgData.caption}
												<div class="chat-image-caption">{imgData.caption}</div>
											{/if}
										</div>
									{:else}
										<div>{msg.content}</div>
									{/if}
								</div>
								<div class="chat-time {msg.sender_id === currentUserId ? 'sent' : 'received'}">
									{new Date(msg.created_at).toLocaleTimeString("en-PH", {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</div>
							</div>
						</div>
					{/each}
				{/if}

				{#if isOtherUserTyping}
					<div class="chat-typing-indicator">
						<span>{activeConversation.other_user_name} is typing</span>
						<div class="typing-dots">
							<span class="typing-dot"></span>
							<span class="typing-dot"></span>
							<span class="typing-dot"></span>
						</div>
					</div>
				{/if}
			</div>

			<div class="chat-footer">
				<form
					onsubmit={onsendmessage}
					style="display: flex; gap: 0.5rem; align-items: center; width: 100%;"
				>
					<input
						type="hidden"
						name="jobId"
						value={activeConversation.job_id}
					/>
					<input
						type="hidden"
						name="receiverId"
						value={activeConversation.other_user_id}
					/>

					<!-- Hidden File Input for Image Upload -->
					<input 
						type="file" 
						bind:this={fileInputRef} 
						accept="image/*" 
						style="display: none;" 
						onchange={onimagefileselect} 
					/>

					<!-- Mobile Plus Trigger Button with Dropup Menu -->
					<div class="chat-gps-mobile-container">
						<button 
							type="button" 
							class="chat-gps-mobile-trigger {showGpsDropup ? 'active' : ''}" 
							onclick={() => showGpsDropup = !showGpsDropup}
							aria-label="Action options"
							title="Add Attachment or Location"
							disabled={sharingLocation || uploadingImage}
						>
							{#if sharingLocation || uploadingImage}
								<span class="spinner spinner-sm"></span>
							{:else}
								<Plus size={20} class="dropup-plus-icon" />
							{/if}
						</button>

						{#if showGpsDropup}
							<button 
								type="button" 
								class="chat-dropup-backdrop" 
								onclick={() => showGpsDropup = false}
								aria-label="Close menu"
								tabindex="-1"
							></button>

							<div class="chat-gps-dropup-menu" role="menu">
								<!-- Custom Pin -->
								<button 
									type="button" 
									class="chat-dropup-item" 
									onclick={() => {
										showGpsDropup = false;
										onopencustomlocationmodal();
									}}
									disabled={sendingMessage || uploadingImage}
								>
									<div class="chat-dropup-item-icon">
										<Compass size={17} />
									</div>
									<div class="chat-dropup-item-info">
										<span class="dropup-title">Custom Pin</span>
										<span class="dropup-subtitle">Search & pin on map</span>
									</div>
								</button>

								<!-- Auto GPS -->
								<button 
									type="button" 
									class="chat-dropup-item" 
									onclick={() => {
										showGpsDropup = false;
										onsharelocation();
									}}
									disabled={sharingLocation || sendingMessage || uploadingImage}
								>
									<div class="chat-dropup-item-icon">
										<Navigation size={17} />
									</div>
									<div class="chat-dropup-item-info">
										<span class="dropup-title">Auto GPS</span>
										<span class="dropup-subtitle">Share current GPS location</span>
									</div>
								</button>

								<!-- Send Image -->
								<button 
									type="button" 
									class="chat-dropup-item" 
									onclick={() => {
										showGpsDropup = false;
										ontriggerimageupload();
									}}
									disabled={uploadingImage || sendingMessage}
								>
									<div class="chat-dropup-item-icon">
										<ImageIcon size={17} />
									</div>
									<div class="chat-dropup-item-info">
										<span class="dropup-title">Send Image</span>
										<span class="dropup-subtitle">Upload & send a photo</span>
									</div>
								</button>
							</div>
						{/if}
					</div>

					<!-- Desktop GPS & Image Buttons -->
					<button 
						type="button" 
						class="chat-gps-btn chat-gps-desktop-btn" 
						onclick={onsharelocation}
						disabled={sharingLocation || sendingMessage || uploadingImage}
						title="Share your current device GPS location"
					>
						{#if sharingLocation}
							<span class="spinner spinner-sm"></span>
						{:else}
							<Navigation size={14} />
						{/if}
						<span style="font-size: 0.8rem;">Auto GPS</span>
					</button>

					<button 
						type="button" 
						class="chat-gps-btn chat-gps-desktop-btn" 
						onclick={onopencustomlocationmodal}
						disabled={sendingMessage || uploadingImage}
						title="Search & pin any custom location or landmark"
						style="border-color: var(--accent); color: var(--accent-hover);"
					>
						<Compass size={14} />
						<span style="font-size: 0.8rem;">Pin Map</span>
					</button>

					<button 
						type="button" 
						class="chat-gps-btn chat-gps-desktop-btn" 
						onclick={ontriggerimageupload}
						disabled={uploadingImage || sendingMessage}
						title="Upload and send a photo"
						style="border-color: var(--border-color); color: var(--text-primary);"
					>
						{#if uploadingImage}
							<span class="spinner spinner-sm"></span>
						{:else}
							<ImageIcon size={14} />
						{/if}
						<span style="font-size: 0.8rem;">Send Pic</span>
					</button>

					<input
						type="text"
						name="content"
						placeholder="Type your message here..."
						bind:value={newMessageContent}
						oninput={onhandletypinginput}
						autocomplete="off"
						required
						class="chat-input-field"
						style="flex: 1; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary);"
					/>
					<button
						type="submit"
						class="btn btn-primary chat-send-btn"
						style="display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;"
						disabled={sendingMessage || !newMessageContent.trim()}
					>
						{#if sendingMessage}
							<span class="spinner spinner-sm"></span>
						{/if}
						Send
					</button>
				</form>
			</div>
		{:else}
			<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); flex-direction: column; gap: 0.75rem; padding: 2rem;">
				<MessageSquare size={48} style="opacity: 0.6;" />
				<p style="font-size: 0.95rem;">
					Select an inquiry on the left to start messaging.
				</p>
			</div>
		{/if}
	</div>
</div>
