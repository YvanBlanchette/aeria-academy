import { prisma } from "@/lib/prisma";
import { canUserMessageTarget } from "@/lib/social-graph";
import { uploadCommunityMessageAttachment } from "@/features/community/messages/server/message-attachments";

export async function sendCommunityMessage({ user, conversationId, content, attachment }) {
	if (!conversationId) {
		return { error: "Conversation invalide" };
	}

	const hasAttachment = attachment && typeof attachment !== "string" && attachment.size > 0;
	if (content.length < 1 && !hasAttachment) {
		return { error: "Ajoute un message ou une pièce jointe" };
	}

	const conversation = await prisma.communityConversation.findFirst({
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

	let attachmentPayload = null;
	if (hasAttachment) {
		const uploadResult = await uploadCommunityMessageAttachment({
			file: attachment,
			sessionUserId: user.id,
		});
		if (uploadResult?.error) {
			return { error: uploadResult.error };
		}
		attachmentPayload = uploadResult;
	}

	const messagePreview = content.length > 0 ? (content.length > 140 ? `${content.slice(0, 137)}...` : content) : "a envoyé une pièce jointe";
	const messageHref = `/community/messages?conversation=${conversation.id}`;

	await prisma.$transaction([
		prisma.communityMessage.create({
			data: {
				conversationId: conversation.id,
				senderId: user.id,
				content: content || null,
				attachmentUrl: attachmentPayload?.url || null,
				attachmentName: attachmentPayload?.name || null,
				attachmentMimeType: attachmentPayload?.mimeType || null,
				attachmentSize: attachmentPayload?.size || null,
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
		},
	});

	if (!message) {
		return { error: "Message introuvable" };
	}

	if (!message.deletedAt) {
		await prisma.communityMessage.update({
			where: { id: message.id },
			data: {
				content: "",
				deletedAt: new Date(),
			},
		});
	}

	return { success: true };
}

export async function toggleCommunityMessageReaction({ userId, messageId, emoji }) {
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

	return { success: true };
}
