import { prisma } from "@/lib/prisma";

export async function getNotificationsPayload({ userId, limit }) {
	const [notifications, unreadCount] = await Promise.all([
		prisma.communityNotification.findMany({
			where: {
				recipientId: userId,
			},
			orderBy: { createdAt: "desc" },
			take: limit,
			include: {
				actor: {
					select: {
						name: true,
						email: true,
						username: true,
						profile: { select: { publicProfile: true } },
					},
				},
				post: {
					select: { id: true, content: true },
				},
				comment: {
					select: { content: true },
				},
				conversation: {
					select: { id: true },
				},
			},
		}),
		prisma.communityNotification.count({
			where: {
				recipientId: userId,
				isRead: false,
			},
		}),
	]);

	return {
		unreadCount,
		notifications: notifications.map((item) => ({
			id: item.id,
			type: item.type,
			isRead: item.isRead,
			createdAt: item.createdAt,
			actor: item.actor,
			post: item.post,
			comment: item.comment,
			conversation: item.conversation,
			messagePreview: item.messagePreview,
			href:
				item.type === "MESSAGE" && item.conversationId
					? `/community/messages?conversation=${item.conversationId}`
					: item.type === "FRIEND_REQUEST" || item.type === "FRIEND_ACCEPTED"
						? "/community/friends"
						: item.postId
							? `/community?focusPost=${item.postId}`
							: "/community",
		})),
	};
}

export async function markNotificationsAsRead({ userId, notificationId, markAll }) {
	await prisma.communityNotification.updateMany({
		where: markAll
			? {
					recipientId: userId,
					isRead: false,
				}
			: {
					id: notificationId,
					recipientId: userId,
					isRead: false,
				},
		data: {
			isRead: true,
			readAt: new Date(),
		},
	});

	const unreadCount = await prisma.communityNotification.count({
		where: {
			recipientId: userId,
			isRead: false,
		},
	});

	return { success: true, unreadCount };
}
