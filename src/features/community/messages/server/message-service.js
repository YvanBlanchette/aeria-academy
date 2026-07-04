import { prisma } from "@/lib/prisma";
import { triggerCommunityRealtimeUpdate } from "@/lib/pusher-server";
import { canUserMessageTarget } from "@/lib/social-graph";
import { deleteCommunityMessageAttachmentFiles, uploadCommunityMessageAttachment } from "@/features/community/messages/server/message-attachments";

function serializeAttachmentField(values) {
	// Keep backward compatibility with legacy single-value schema fields.
	if (!values || values.length === 0) return null;
	if (values.length === 1) return values[0];
	return JSON.stringify(values);
}

function buildAttachmentMessageFields(attachmentPayloads) {
	if (!attachmentPayloads || attachmentPayloads.length === 0) {
		return {
			attachmentUrl: null,
			attachmentName: null,
			attachmentMimeType: null,
			attachmentSize: null,
		};
	}

	return {
		attachmentUrl: serializeAttachmentField(attachmentPayloads.map((payload) => payload.url)),
		attachmentName: serializeAttachmentField(attachmentPayloads.map((payload) => payload.name || "Pièce jointe")),
		attachmentMimeType: serializeAttachmentField(attachmentPayloads.map((payload) => payload.mimeType || "application/octet-stream")),
		attachmentSize: attachmentPayloads.reduce((sum, payload) => sum + (payload.size || 0), 0),
	};
}

export async function sendCommunityMessage({ user, conversationId, content, attachments = [] }) {
	// Basic payload guards; this endpoint accepts text-only, attachment-only, or mixed messages.
	if (!conversationId) {
		return { error: "Conversation invalide" };
	}

	const validAttachments = attachments.filter((file) => file && typeof file !== "string" && file.size > 0);
	if (content.length < 1 && validAttachments.length < 1) {
		return { error: "Ajoute un message ou une pièce jointe" };
	}

	const conversation = await prisma.communityConversation.findFirst({
		// Security boundary: users can only post in conversations they participate in.
		where: {
			id: conversationId,
			OR: [{ participantAId: user.id }, { participantBId: user.id }],
		},
		select: {
			id: true,
			participantAId: true,
			participantBId: true,
			participantA: {
				select: {
					id: true,
					name: true,
					email: true,
					username: true,
					profile: {
						select: {
							messagePermissionScope: true,
						},
					},
				},
			},
			participantB: {
				select: {
					id: true,
					name: true,
					email: true,
					username: true,
					profile: {
						select: {
							messagePermissionScope: true,
						},
					},
				},
			},
		},
	});

	if (!conversation) {
		return { error: "Conversation introuvable" };
	}

	const now = new Date();
	const recipientId = conversation.participantAId === user.id ? conversation.participantBId : conversation.participantAId;
	const recipient = conversation.participantAId === user.id ? conversation.participantB : conversation.participantA;
	const canSendToRecipient = await canUserMessageTarget({
		senderId: user.id,
		targetUserId: recipientId,
		targetMessagePermissionScope: recipient?.profile?.messagePermissionScope || "EVERYONE",
	});

	if (!canSendToRecipient) {
		return { error: "Cet utilisateur ne peut pas recevoir tes messages" };
	}

	const attachmentPayloads = [];
	// Upload each attachment server-side before persisting message metadata.
	for (const file of validAttachments) {
		const uploadResult = await uploadCommunityMessageAttachment({
			file,
			sessionUserId: user.id,
		});
		if (uploadResult?.error) {
			return { error: uploadResult.error };
		}
		attachmentPayloads.push(uploadResult);
	}

	const attachmentFields = buildAttachmentMessageFields(attachmentPayloads);

	const messagePreview =
		content.length > 0
			? content.length > 140
				? `${content.slice(0, 137)}...`
				: content
			: attachmentPayloads.length > 1
				? `a envoyé ${attachmentPayloads.length} pièces jointes`
				: "a envoyé une pièce jointe";
	const messageHref = `/community/messages?conversation=${conversation.id}`;

	// Keep message, conversation timestamp, and notification in the same transaction.
	await prisma.$transaction([
		prisma.communityMessage.create({
			data: {
				conversationId: conversation.id,
				senderId: user.id,
				content: content || null,
				...attachmentFields,
			},
		}),
		prisma.communityConversation.update({
			where: { id: conversation.id },
			data: {
				lastMessageAt: now,
				...(conversation.participantAId === user.id ? { participantALastReadAt: now } : { participantBLastReadAt: now }),
			},
		}),
		...(recipientId !== user.id
			? [
					prisma.communityNotification.create({
						data: {
							recipientId,
							actorId: user.id,
							type: "MESSAGE",
							conversationId: conversation.id,
							messagePreview,
						},
					}),
				]
			: []),
	]);

	await triggerCommunityRealtimeUpdate({
		userIds: [conversation.participantAId, conversation.participantBId],
		conversationId: conversation.id,
		reason: "message.sent",
	});

	return {
		success: true,
		conversationId: conversation.id,
		messageHref,
		recipientName: recipient?.name || recipient?.email || "Membre",
	};
}

export async function deleteCommunityMessage({ userId, messageId }) {
	if (!messageId) {
		return { error: "Message invalide" };
	}

	const message = await prisma.communityMessage.findFirst({
		where: {
			id: messageId,
			senderId: userId,
			conversation: {
				OR: [{ participantAId: userId }, { participantBId: userId }],
			},
		},
		select: {
			id: true,
			deletedAt: true,
			attachmentUrl: true,
			conversation: {
				select: {
					id: true,
					participantAId: true,
					participantBId: true,
				},
			},
		},
	});

	if (!message) {
		return { error: "Message introuvable" };
	}

	if (!message.deletedAt) {
		// Privacy mode: remove text and all attachment metadata from the message row.
		await prisma.communityMessage.update({
			where: { id: message.id },
			data: {
				content: "",
				deletedAt: new Date(),
				attachmentUrl: null,
				attachmentName: null,
				attachmentMimeType: null,
				attachmentSize: null,
			},
		});

		// Best-effort physical file cleanup for attachment URLs linked to this message.
		await deleteCommunityMessageAttachmentFiles(message.attachmentUrl);

		await triggerCommunityRealtimeUpdate({
			userIds: [message.conversation?.participantAId, message.conversation?.participantBId],
			conversationId: message.conversation?.id,
			reason: "message.deleted",
		});
	}

	return { success: true };
}

export async function toggleCommunityMessageReaction({ userId, messageId, emoji }) {
	// Reactions are unique per user/message pair and can be toggled by clicking same emoji.
	if (!messageId) {
		return { error: "Message invalide" };
	}

	if (!emoji) {
		return { error: "Emoji invalide" };
	}

	const message = await prisma.communityMessage.findFirst({
		where: {
			id: messageId,
			deletedAt: null,
			conversation: {
				OR: [{ participantAId: userId }, { participantBId: userId }],
			},
		},
		select: {
			id: true,
			conversation: {
				select: {
					id: true,
					participantAId: true,
					participantBId: true,
				},
			},
		},
	});

	if (!message) {
		return { error: "Message introuvable" };
	}

	const existingReaction = await prisma.communityMessageReaction.findUnique({
		where: {
			messageId_userId: {
				messageId,
				userId,
			},
		},
		select: { id: true, emoji: true },
	});

	if (existingReaction?.emoji === emoji) {
		await prisma.communityMessageReaction.delete({
			where: { id: existingReaction.id },
		});
	} else if (existingReaction) {
		await prisma.communityMessageReaction.update({
			where: { id: existingReaction.id },
			data: { emoji },
		});
	} else {
		await prisma.communityMessageReaction.create({
			data: {
				messageId,
				userId,
				emoji,
			},
		});
	}

	await triggerCommunityRealtimeUpdate({
		userIds: [message.conversation?.participantAId, message.conversation?.participantBId],
		conversationId: message.conversation?.id,
		reason: "message.reaction",
	});

	return { success: true };
}

export async function getCopyableCommunityMessageContent({ userId, messageId }) {
	if (!messageId) {
		return { error: "Message invalide" };
	}

	const message = await prisma.communityMessage.findFirst({
		where: {
			id: messageId,
			deletedAt: null,
			conversation: {
				OR: [{ participantAId: userId }, { participantBId: userId }],
			},
		},
		select: {
			content: true,
		},
	});

	if (!message?.content) {
		return { error: "Aucun contenu à copier" };
	}

	return {
		success: true,
		content: message.content,
	};
}
