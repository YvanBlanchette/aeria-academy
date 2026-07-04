import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download, FileText, ImageIcon, MessageSquare, Search } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCommunityEnabled } from "@/lib/platform-settings";
import { formatSocialRelativeTime } from "@/lib/time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CommunityMessageComposer } from "@/components/community/community-message-composer";
import { CommunityMessageActionsMenu } from "@/components/community/community-message-actions-menu";
import { CommunityMessageReactions } from "@/components/community/community-message-reactions";
import { CommunityMessagesLiveIndicator } from "@/components/community/community-messages-live-indicator";
import { CommunityMessagesPoller } from "@/components/community/community-messages-poller";
import { CommunityMessagesAutoScroll } from "@/components/community/community-messages-auto-scroll";
import { findOrCreateCommunityConversationForUsers } from "./actions";
import { BiSolidMessageRoundedDetail } from "react-icons/bi";

export const metadata = {
	title: "Messages | Communauté ÆRIA",
	description: "Messagerie privée de la communauté ÆRIA",
};

const MESSAGE_BATCH_SIZE = 80;

function initialsFromName(name, email) {
	return (name || email || "U")
		.split(" ")
		.map((part) => part.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function normalizeText(value) {
	if (typeof value !== "string") return "";
	return value.trim();
}

function normalizeId(value) {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function parseBeforeCursor(value) {
	if (!value) return null;
	const candidate = new Date(value);
	return Number.isNaN(candidate.getTime()) ? null : candidate;
}

function getProfileHref(user) {
	const slug = user?.username || user?.id;
	if (!slug) return null;
	return `/users/${encodeURIComponent(slug)}`;
}

function parseSerializedAttachmentField(value) {
	// Backward-compatible parser: old rows store a single string, newer rows store JSON arrays.
	if (!value || typeof value !== "string") return [];
	const trimmed = value.trim();
	if (!trimmed) return [];
	if (!trimmed.startsWith("[")) return [trimmed];

	try {
		const parsed = JSON.parse(trimmed);
		return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && item.trim().length > 0) : [];
	} catch {
		return [trimmed];
	}
}

function getOtherParticipant(conversation, userId) {
	return conversation.participantAId === userId ? conversation.participantB : conversation.participantA;
}

function getReadAt(conversation, userId) {
	return conversation.participantAId === userId ? conversation.participantALastReadAt : conversation.participantBLastReadAt;
}

function getPreviewMessage(conversation, userId) {
	const latestMessage = conversation.messages[0];
	if (!latestMessage) return "Démarre la conversation";
	if (latestMessage.deletedAt) return "Message effacé";
	const attachmentNames = parseSerializedAttachmentField(latestMessage.attachmentName);
	if (attachmentNames.length > 0) {
		const prefix = latestMessage.senderId === userId ? "Vous: " : "";
		if (attachmentNames.length === 1) {
			return `${prefix}Pièce jointe: ${attachmentNames[0]}`;
		}
		return `${prefix}${attachmentNames.length} pièces jointes`;
	}
	if (!latestMessage.content) return "Pièce jointe";
	return latestMessage.senderId === userId ? `Vous: ${latestMessage.content}` : latestMessage.content;
}

function formatAttachmentSize(sizeInBytes) {
	if (!sizeInBytes || sizeInBytes < 1) return "";
	if (sizeInBytes < 1024) return `${sizeInBytes} B`;
	if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
	return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDeletedMessageLabel(deletedAt) {
	if (!deletedAt) return "Message effacé";
	const timeLabel = new Intl.DateTimeFormat("fr-FR", {
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(deletedAt));
	return `Message effacé à ${timeLabel}`;
}

function getConversationPresence(conversation, userId) {
	if (!conversation) {
		return { isOnline: false, label: "Hors ligne" };
	}

	const lastPartnerMessage = (conversation.messages || [])
		.filter((message) => message.senderId !== userId)
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

	if (!lastPartnerMessage?.createdAt) {
		return { isOnline: false, label: "Hors ligne" };
	}

	const lastSeenAt = new Date(lastPartnerMessage.createdAt);
	const now = Date.now();
	const deltaMs = now - lastSeenAt.getTime();
	const onlineWindowMs = 2 * 60 * 1000;

	if (deltaMs <= onlineWindowMs) {
		return { isOnline: true, label: "En ligne" };
	}

	return {
		isOnline: false,
		label: `Actif ${formatSocialRelativeTime(lastSeenAt)}`,
	};
}

function ConversationItem({ conversation, userId, selectedConversationId }) {
	const other = getOtherParticipant(conversation, userId);
	const unreadCount = conversation.unreadCount || 0;
	const isSelected = conversation.id === selectedConversationId;
	const initials = initialsFromName(other?.name, other?.email);
	const profileHref = getProfileHref(other);
	const conversationHref = `/community/messages?conversation=${conversation.id}`;

	return (
		<div
			className={`flex items-center gap-3 rounded-2xl border p-3 transition-all ${
				isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/40 hover:border-border hover:bg-muted"
			}`}
		>
			{profileHref ? (
				<Link
					href={profileHref}
					className="shrink-0 rounded-full transition-all hover:opacity-90 hover:ring-2 hover:ring-primary/25"
				>
					<Avatar className="h-12 w-12">
						<AvatarImage src={other?.image || ""} />
						<AvatarFallback>{initials}</AvatarFallback>
					</Avatar>
				</Link>
			) : (
				<Avatar className="h-12 w-12 shrink-0">
					<AvatarImage src={other?.image || ""} />
					<AvatarFallback>{initials}</AvatarFallback>
				</Avatar>
			)}

			<div className="min-w-0 flex-1">
				<div className="flex items-center justify-between gap-2">
					{profileHref ? (
						<Link
							href={profileHref}
							className="truncate font-medium transition-colors hover:text-primary hover:underline"
						>
							{other?.name || other?.email}
						</Link>
					) : (
						<p className="truncate font-medium">{other?.name || other?.email}</p>
					)}
					{conversation.lastMessageAt ? (
						<span className="shrink-0 text-[11px] text-muted-foreground">{formatSocialRelativeTime(conversation.lastMessageAt)}</span>
					) : null}
				</div>
				<Link
					href={conversationHref}
					className="line-clamp-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					{getPreviewMessage(conversation, userId)}
				</Link>
			</div>

			{unreadCount > 0 ? <Badge className="shrink-0 rounded-full">{unreadCount}</Badge> : null}
		</div>
	);
}

function SearchResultItem({ user }) {
	const initials = initialsFromName(user.name, user.email);
	const messageHref = `/community/messages?composeTo=${encodeURIComponent(user.username || user.id)}`;
	const profileHref = getProfileHref(user);

	return (
		<div className="flex items-center gap-3 rounded-2xl border bg-white p-3 transition-all hover:border-border hover:shadow-sm">
			{profileHref ? (
				<Link
					href={profileHref}
					className="flex min-w-0 flex-1 items-center gap-3"
				>
					<Avatar className="h-11 w-11 shrink-0">
						<AvatarImage src={user.image || ""} />
						<AvatarFallback>{initials}</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1">
						<p className="truncate font-medium transition-colors hover:text-primary hover:underline">{user.name || user.email}</p>
						<p className="truncate text-sm text-muted-foreground">{user.profile?.jobTitle || user.email}</p>
					</div>
				</Link>
			) : (
				<div className="flex min-w-0 flex-1 items-center gap-3">
					<Avatar className="h-11 w-11 shrink-0">
						<AvatarImage src={user.image || ""} />
						<AvatarFallback>{initials}</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1">
						<p className="truncate font-medium">{user.name || user.email}</p>
						<p className="truncate text-sm text-muted-foreground">{user.profile?.jobTitle || user.email}</p>
					</div>
				</div>
			)}
			<Button
				asChild
				variant="outline"
				className="rounded-full"
			>
				<Link href={messageHref}>Message</Link>
			</Button>
		</div>
	);
}

export default async function CommunityMessagesPage({ searchParams }) {
	// Guard route access at the server boundary to avoid rendering private state to guests.
	const session = await auth();
	if (!session?.user?.id) redirect("/login?callbackUrl=/community/messages");
	const communityEnabled = await getCommunityEnabled();
	if (!communityEnabled) redirect("/community-disabled");

	const resolvedSearchParams = await searchParams;
	const userId = session.user.id;

	const searchQuery = normalizeText(resolvedSearchParams?.q);
	const selectedConversationId = normalizeId(resolvedSearchParams?.conversation);
	const composeTo = normalizeId(resolvedSearchParams?.composeTo);
	const beforeCursorDate = parseBeforeCursor(normalizeText(resolvedSearchParams?.before));

	let conversationToOpen = null;
	let composeTarget = null;

	if (composeTo) {
		composeTarget = await prisma.user.findFirst({
			where: {
				AND: [
					{ id: { not: userId } },
					{
						OR: [{ id: { equals: composeTo, mode: "insensitive" } }, { username: { equals: composeTo, mode: "insensitive" } }],
					},
				],
			},
			select: {
				id: true,
				name: true,
				email: true,
				image: true,
				username: true,
				profile: { select: { jobTitle: true } },
			},
		});

		if (!composeTarget) {
			notFound();
		}

		try {
			conversationToOpen = await findOrCreateCommunityConversationForUsers(userId, composeTarget.id);
		} catch {
			conversationToOpen = null;
		}
	}

	const initialConversations = await prisma.communityConversation.findMany({
		// First pass fetch is used to resolve the active conversation id and mark read state.
		where: {
			OR: [{ participantAId: userId }, { participantBId: userId }],
		},
		orderBy: { lastMessageAt: "desc" },
		include: {
			participantA: { select: { id: true, name: true, email: true, image: true, username: true } },
			participantB: { select: { id: true, name: true, email: true, image: true, username: true } },
			messages: {
				take: 1,
				orderBy: { createdAt: "desc" },
				select: { id: true, content: true, senderId: true, createdAt: true, deletedAt: true, attachmentName: true },
			},
		},
	});

	let conversationIdToOpen = conversationToOpen?.id || selectedConversationId || initialConversations[0]?.id || null;
	if (conversationIdToOpen) {
		// Mark thread as read as soon as it becomes active for the current user.
		const now = new Date();
		const selectedConversation = initialConversations.find((conversation) => conversation.id === conversationIdToOpen);
		if (!selectedConversation) {
			notFound();
		}

		await Promise.all([
			prisma.communityConversation.update({
				where: { id: conversationIdToOpen },
				data: selectedConversation.participantAId === userId ? { participantALastReadAt: now } : { participantBLastReadAt: now },
			}),
			prisma.communityNotification.updateMany({
				where: {
					recipientId: userId,
					type: "MESSAGE",
					conversationId: conversationIdToOpen,
					isRead: false,
				},
				data: {
					isRead: true,
					readAt: now,
				},
			}),
		]);
	}

	const [conversations, selectedConversation, searchResults] = await Promise.all([
		// Parallel fetch keeps the page responsive even when search is active.
		prisma.communityConversation.findMany({
			where: {
				OR: [{ participantAId: userId }, { participantBId: userId }],
			},
			orderBy: { lastMessageAt: "desc" },
			include: {
				participantA: { select: { id: true, name: true, email: true, image: true, username: true } },
				participantB: { select: { id: true, name: true, email: true, image: true, username: true } },
				messages: {
					take: 1,
					orderBy: { createdAt: "desc" },
					select: { id: true, content: true, senderId: true, createdAt: true, deletedAt: true, attachmentName: true },
				},
			},
		}),
		conversationIdToOpen
			? prisma.communityConversation.findFirst({
					where: {
						id: conversationIdToOpen,
						OR: [{ participantAId: userId }, { participantBId: userId }],
					},
					include: {
						participantA: { select: { id: true, name: true, email: true, image: true, username: true } },
						participantB: { select: { id: true, name: true, email: true, image: true, username: true } },
						messages: {
							orderBy: { createdAt: "desc" },
							take: MESSAGE_BATCH_SIZE,
							...(beforeCursorDate ? { where: { createdAt: { lt: beforeCursorDate } } } : {}),
							include: {
								sender: { select: { id: true, name: true, email: true, image: true, username: true } },
								reactions: {
									select: {
										emoji: true,
										userId: true,
										user: { select: { name: true, email: true } },
									},
								},
							},
						},
					},
				})
			: Promise.resolve(null),
		searchQuery
			? prisma.user.findMany({
					where: {
						id: { not: userId },
						OR: [
							{ name: { contains: searchQuery, mode: "insensitive" } },
							{ email: { contains: searchQuery, mode: "insensitive" } },
							{ username: { contains: searchQuery, mode: "insensitive" } },
						],
					},
					orderBy: { name: "asc" },
					take: 8,
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
						username: true,
						profile: { select: { jobTitle: true } },
					},
				})
			: Promise.resolve([]),
	]);

	const unreadRows = await prisma.$queryRaw`
		SELECT
			c.id AS "conversationId",
			COUNT(m.id)::int AS "unreadCount"
		FROM "CommunityConversation" c
		LEFT JOIN "CommunityMessage" m
			ON m."conversationId" = c.id
			AND m."senderId" <> ${userId}
			AND m."createdAt" > (
				CASE
					WHEN c."participantAId" = ${userId} THEN COALESCE(c."participantALastReadAt", TO_TIMESTAMP(0))
					ELSE COALESCE(c."participantBLastReadAt", TO_TIMESTAMP(0))
				END
			)
		WHERE c."participantAId" = ${userId} OR c."participantBId" = ${userId}
		GROUP BY c.id
	`;

	const unreadCountByConversationId = new Map((unreadRows || []).map((row) => [row.conversationId, Number(row.unreadCount || 0)]));

	const conversationsWithUnread = conversations.map((conversation) => ({
		...conversation,
		unreadCount: unreadCountByConversationId.get(conversation.id) || 0,
	}));

	const activeConversation =
		selectedConversation ||
		(conversationsWithUnread.length > 0
			? await prisma.communityConversation.findFirst({
					where: {
						id: conversationsWithUnread[0].id,
						OR: [{ participantAId: userId }, { participantBId: userId }],
					},
					include: {
						participantA: { select: { id: true, name: true, email: true, image: true, username: true } },
						participantB: { select: { id: true, name: true, email: true, image: true, username: true } },
						messages: {
							orderBy: { createdAt: "desc" },
							take: MESSAGE_BATCH_SIZE,
							...(beforeCursorDate ? { where: { createdAt: { lt: beforeCursorDate } } } : {}),
							include: {
								sender: { select: { id: true, name: true, email: true, image: true, username: true } },
								reactions: {
									select: {
										emoji: true,
										userId: true,
										user: { select: { name: true, email: true } },
									},
								},
							},
						},
					},
				})
			: null);

	const activePartner = activeConversation ? getOtherParticipant(activeConversation, userId) : null;
	// Normalize current window to oldest -> newest for stable rendering and presence logic.
	const activeConversationMessages = activeConversation?.messages
		? [...activeConversation.messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
		: [];
	const oldestLoadedMessage = activeConversationMessages.length > 0 ? activeConversationMessages[0] : null;
	const hasOlderMessages =
		activeConversation && oldestLoadedMessage
			? (await prisma.communityMessage.count({
					where: {
						conversationId: activeConversation.id,
						createdAt: { lt: oldestLoadedMessage.createdAt },
					},
				})) > 0
			: false;
	const loadOlderHref =
		activeConversation && oldestLoadedMessage
			? `/community/messages?conversation=${encodeURIComponent(activeConversation.id)}&before=${encodeURIComponent(
					new Date(oldestLoadedMessage.createdAt).toISOString(),
				)}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`
			: null;
	const activeInitials = initialsFromName(activePartner?.name, activePartner?.email);
	const activePartnerProfileHref = getProfileHref(activePartner);
	const presence = getConversationPresence(activeConversation, userId);

	return (
		<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<CommunityMessagesPoller userId={userId} />
			<div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
				{/* MESSAGE LIST */}
				<Card className="overflow-hidden rounded-3xl border-0 bg-white shadow-sm">
					<CardHeader className="space-y-3 border-b pb-4">
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-2">
								<BiSolidMessageRoundedDetail className="h-5 w-5 text-muted-foreground" />
								<CardTitle className="text-base">ÆRIA Messenger</CardTitle>
							</div>
							<div className="flex items-center gap-2">
								<CommunityMessagesLiveIndicator />
							</div>
						</div>

						<form
							method="get"
							className="relative"
						>
							<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								name="q"
								defaultValue={searchQuery}
								placeholder="Rechercher une personne..."
								className="pl-9 bg-neutral-100 shadow-inner focus-visible:ring-2 focus-visible:ring-[#CE8500]/50 focus-visible:ring-offset-2"
							/>
						</form>
					</CardHeader>

					<CardContent className="space-y-3 p-4">
						{searchQuery ? (
							<div className="space-y-3">
								<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nouveaux contacts</p>
								{searchResults.length > 0 ? (
									<div className="space-y-2">
										{searchResults.map((user) => (
											<SearchResultItem
												key={user.id}
												user={user}
											/>
										))}
									</div>
								) : (
									<p className="rounded-2xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">Aucun membre trouvé.</p>
								)}
							</div>
						) : null}

						<div className="space-y-3">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conversations</p>
							{conversationsWithUnread.length > 0 ? (
								<div className="space-y-2">
									{conversationsWithUnread.map((conversation) => (
										<ConversationItem
											key={conversation.id}
											conversation={conversation}
											userId={userId}
											selectedConversationId={conversationIdToOpen}
										/>
									))}
								</div>
							) : (
								<div className="rounded-2xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
									Aucune conversation pour le moment. Cherche un membre pour démarrer une discussion.
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* MESSAGE THREAD */}
				<Card className="overflow-hidden rounded-3xl space-y-0 border-0 bg-white shadow-sm">
					{activeConversation && activePartner ? (
						<>
							<CardHeader className="border-b shadow-sm">
								<div className="flex items-center justify-between gap-3">
									<div className="flex min-w-0 items-center gap-3">
										{activePartnerProfileHref ? (
											<Link
												href={activePartnerProfileHref}
												className="shrink-0 rounded-full transition-all hover:opacity-90 hover:ring-2 hover:ring-primary/25"
											>
												<Avatar className="h-12 w-12">
													<AvatarImage src={activePartner.image || ""} />
													<AvatarFallback>{activeInitials}</AvatarFallback>
												</Avatar>
											</Link>
										) : (
											<Avatar className="h-12 w-12 shrink-0">
												<AvatarImage src={activePartner.image || ""} />
												<AvatarFallback>{activeInitials}</AvatarFallback>
											</Avatar>
										)}
										<div className="min-w-0">
											{activePartnerProfileHref ? (
												<CardTitle className="truncate text-base">
													<Link
														href={activePartnerProfileHref}
														className="transition-colors hover:text-primary hover:underline"
													>
														{activePartner.name || activePartner.email}
													</Link>
												</CardTitle>
											) : (
												<CardTitle className="truncate text-base">{activePartner.name || activePartner.email}</CardTitle>
											)}
											<div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
												<span className={`h-1.5 w-1.5 rounded-full ${presence.isOnline ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
												<span className="truncate">{presence.label}</span>
											</div>
										</div>
									</div>

									{composeTarget ? (
										<Badge
											variant="secondary"
											className="rounded-full"
										>
											Nouveau message
										</Badge>
									) : null}
								</div>
							</CardHeader>

							<CardContent className="flex h-[calc(100vh-15rem)] flex-col p-0">
								<CommunityMessagesAutoScroll
									containerId="community-messages-scroll-container"
									conversationId={activeConversation.id}
									messageCount={activeConversationMessages.length}
								/>
								<div
									id="community-messages-scroll-container"
									className="flex-1 space-y-3 overflow-y-auto p-4 sm:px-6"
								>
									{activeConversationMessages.length > 0 ? (
										<>
											{hasOlderMessages && loadOlderHref ? (
												<div className="flex justify-center pb-2">
													<Button
														asChild
														variant="outline"
														size="sm"
														className="rounded-full"
													>
														<Link href={loadOlderHref}>Charger les messages plus anciens</Link>
													</Button>
												</div>
											) : null}
											{activeConversationMessages.map((message) => {
												const isMine = message.senderId === userId;
												const isDeleted = Boolean(message.deletedAt);
												const attachmentUrls = parseSerializedAttachmentField(message.attachmentUrl);
												const attachmentNames = parseSerializedAttachmentField(message.attachmentName);
												const attachmentMimeTypes = parseSerializedAttachmentField(message.attachmentMimeType);
												const hasAttachment = attachmentUrls.length > 0;
												const senderInitials = initialsFromName(message.sender.name, message.sender.email);
												const senderProfileHref = getProfileHref(message.sender);

												return (
													<div
														key={message.id}
														className={`flex ${isMine ? "justify-end" : "justify-start"}`}
													>
														<div className={`group/message flex max-w-[80%] items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
															{senderProfileHref ? (
																<Link
																	href={senderProfileHref}
																	className="shrink-0 rounded-full transition-all hover:opacity-90 hover:ring-2 hover:ring-primary/25"
																>
																	<Avatar className="h-8 w-8">
																		<AvatarImage src={message.sender.image || ""} />
																		<AvatarFallback>{senderInitials}</AvatarFallback>
																	</Avatar>
																</Link>
															) : (
																<Avatar className="h-8 w-8 shrink-0">
																	<AvatarImage src={message.sender.image || ""} />
																	<AvatarFallback>{senderInitials}</AvatarFallback>
																</Avatar>
															)}
															{!isDeleted ? (
																<div
																	className={`flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover/message:opacity-100 group-focus-within/message:opacity-100 ${
																		isMine ? "order-2 mr-1" : "order-1 ml-1"
																	}`}
																>
																	<CommunityMessageActionsMenu
																		messageId={message.id}
																		isMine={isMine}
																	/>
																</div>
															) : null}
															<div className="relative pb-4">
																<div
																	className={`min-w-[150px] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
																		isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
																	}`}
																>
																	{isDeleted ? (
																		<p className="italic opacity-80">{formatDeletedMessageLabel(message.deletedAt)}</p>
																	) : (
																		<>
																			{message.content ? <p className="whitespace-pre-wrap">{message.content}</p> : null}
																			{hasAttachment ? (
																				<div className="mt-2 space-y-2">
																					{attachmentUrls.map((attachmentUrl, index) => {
																						const attachmentName = attachmentNames[index] || attachmentNames[0] || `Pièce jointe ${index + 1}`;
																						const attachmentMimeType = attachmentMimeTypes[index] || attachmentMimeTypes[0] || "";
																						const isAttachmentImage = attachmentMimeType.startsWith("image/");

																						return (
																							<div
																								key={`${message.id}-attachment-${index}`}
																								className={`rounded-xl border ${isMine ? "border-primary-foreground/20 bg-primary-foreground/10" : "border-border bg-background/80"}`}
																							>
																								{isAttachmentImage ? (
																									<a
																										href={attachmentUrl}
																										target="_blank"
																										rel="noreferrer"
																										className="block"
																									>
																										{/* eslint-disable-next-line @next/next/no-img-element */}
																										<img
																											src={attachmentUrl}
																											alt={attachmentName || "Image jointe"}
																											className="max-h-56 w-full rounded-t-xl object-cover"
																										/>
																									</a>
																								) : null}
																								<div className="flex items-center justify-between gap-3 p-3">
																									<div className="min-w-0">
																										<div className="inline-flex items-center gap-1.5 text-xs font-medium">
																											{isAttachmentImage ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
																											<span className="truncate">{attachmentName}</span>
																										</div>
																										{attachmentMimeType || (index === 0 && message.attachmentSize) ? (
																											<p className="mt-1 truncate text-[11px] opacity-80">
																												{attachmentMimeType || "Fichier"}
																												{index === 0 && message.attachmentSize ? ` • ${formatAttachmentSize(message.attachmentSize)}` : ""}
																											</p>
																										) : null}
																									</div>
																									<a
																										href={attachmentUrl}
																										target="_blank"
																										rel="noreferrer"
																										className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${isMine ? "border-primary-foreground/30" : "border-border"}`}
																									>
																										<Download className="h-3.5 w-3.5" />
																										<span>Ouvrir</span>
																									</a>
																								</div>
																							</div>
																						);
																					})}
																				</div>
																			) : null}
																		</>
																	)}
																	<p className={`mt-1 text-[11px] ${isMine ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
																		{formatSocialRelativeTime(message.createdAt)}
																	</p>
																</div>
																{!isDeleted ? (
																	<div className={`pointer-events-none absolute -bottom-0.5 ${isMine ? "right-3" : "left-3"}`}>
																		<CommunityMessageReactions
																			messageId={message.id}
																			reactions={(message.reactions || []).map((reaction) => ({
																				emoji: reaction.emoji,
																				userId: reaction.userId,
																				userName: reaction.user?.name || reaction.user?.email || "Membre",
																			}))}
																			currentUserId={userId}
																			isMine={isMine}
																		/>
																	</div>
																) : null}
															</div>
														</div>
													</div>
												);
											})}
										</>
									) : (
										<div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
											<div className="space-y-2">
												<MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/50" />
												<p className="font-medium">Pas encore de message</p>
												<p className="text-sm">Écris le premier message pour lancer la conversation.</p>
											</div>
										</div>
									)}
								</div>

								<div className="bg-white p-4 px-6">
									<CommunityMessageComposer
										conversationId={activeConversation.id}
										partnerName={activePartner.name || activePartner.email}
									/>
								</div>
							</CardContent>
						</>
					) : (
						<CardContent className="flex min-h-[60vh] items-center justify-center p-10 text-center text-muted-foreground">
							<div className="space-y-3">
								<MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/40" />
								<div>
									<p className="text-lg font-medium text-foreground">Sélectionne une conversation</p>
									<p className="max-w-md text-sm text-muted-foreground">
										Ouvre une discussion à gauche ou cherche un membre pour commencer une conversation privée.
									</p>
								</div>
							</div>
						</CardContent>
					)}
				</Card>
			</div>
		</div>
	);
}
