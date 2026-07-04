import { prisma } from "@/lib/prisma";
import { canUserMessageTarget } from "@/lib/social-graph";

function normalizeConversationParticipants(participantAId, participantBId) {
	// Stable ordering prevents duplicate rows for the same user pair.
	return participantAId < participantBId ? [participantAId, participantBId] : [participantBId, participantAId];
}

export async function findOrCreateCommunityConversationForUsers(userId, otherUserId) {
	// Validate target user and messaging permissions before exposing/creating conversation IDs.
	const otherUser = await prisma.user.findUnique({
		where: { id: otherUserId },
		select: {
			id: true,
			profile: {
				select: {
					messagePermissionScope: true,
				},
			},
		},
	});

	if (!otherUser || otherUser.id === userId) {
		throw new Error("Conversation invalide");
	}

	const canCreateConversation = await canUserMessageTarget({
		senderId: userId,
		targetUserId: otherUserId,
		targetMessagePermissionScope: otherUser.profile?.messagePermissionScope || "EVERYONE",
	});

	if (!canCreateConversation) {
		throw new Error("Permissions de messagerie insuffisantes");
	}

	const [participantAId, participantBId] = normalizeConversationParticipants(userId, otherUserId);

	let conversation = await prisma.communityConversation.findUnique({
		where: {
			participantAId_participantBId: {
				participantAId,
				participantBId,
			},
		},
		select: { id: true },
	});

	if (!conversation) {
		conversation = await prisma.communityConversation.create({
			data: {
				participantAId,
				participantBId,
			},
			select: { id: true },
		});
	}

	return conversation;
}
