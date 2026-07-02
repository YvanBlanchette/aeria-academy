"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeFriendshipPair } from "@/lib/social-graph";

const relationshipSchema = z.object({
	targetUserId: z.string().cuid("Utilisateur invalide"),
	username: z.string().trim().optional().default(""),
});

async function requireSessionUser() {
	const session = await auth();
	if (!session?.user?.id) {
		return null;
	}
	return session.user;
}

export async function followUser(formData) {
	return sendFriendRequest(formData);
}

export async function unfollowUser(formData) {
	return unfriendUser(formData);
}

async function ensureUsersCanRelate(currentUserId, targetUserId) {
	if (targetUserId === currentUserId) {
		return { error: "Action invalide" };
	}

	const [target, block] = await Promise.all([
		prisma.user.findUnique({
			where: { id: targetUserId },
			select: { id: true },
		}),
		prisma.userBlock.findFirst({
			where: {
				OR: [
					{ blockerId: currentUserId, blockedId: targetUserId },
					{ blockerId: targetUserId, blockedId: currentUserId },
				],
			},
			select: { id: true },
		}),
	]);

	if (!target) {
		return { error: "Profil introuvable" };
	}

	if (block) {
		return { error: "Action impossible (utilisateur bloqué)" };
	}

	return { success: true };
}

async function revalidateRelationshipPaths(username) {
	if (username) {
		revalidatePath(`/users/${username}`);
		revalidatePath(`/users/${username}/followers`);
		revalidatePath(`/users/${username}/following`);
	}
	revalidatePath("/community");
	revalidatePath("/community/messages");
	revalidatePath("/community/friends");
	revalidatePath("/profile");
	revalidatePath("/dashboard/settings");
}

export async function sendFriendRequest(formData) {
	const user = await requireSessionUser();
	if (!user) return { error: "Non autorisé" };

	const parsed = relationshipSchema.safeParse({
		targetUserId: formData.get("targetUserId") || formData.get("followingId") || "",
		username: formData.get("username") || "",
	});
	if (!parsed.success) return { error: parsed.error.issues[0].message };

	const { targetUserId, username } = parsed.data;
	const guard = await ensureUsersCanRelate(user.id, targetUserId);
	if (guard?.error) return guard;

	const [userAId, userBId] = normalizeFriendshipPair(user.id, targetUserId);
	const friendship = await prisma.userFriendship.findUnique({
		where: {
			userAId_userBId: {
				userAId,
				userBId,
			},
		},
		select: { id: true },
	});
	if (friendship) return { success: true };

	const incomingRequest = await prisma.userFriendRequest.findUnique({
		where: {
			senderId_receiverId: {
				senderId: targetUserId,
				receiverId: user.id,
			},
		},
		select: { id: true, status: true },
	});

	if (incomingRequest?.status === "PENDING") {
		await prisma.$transaction([
			prisma.userFriendRequest.update({
				where: { id: incomingRequest.id },
				data: { status: "ACCEPTED", respondedAt: new Date() },
			}),
			prisma.userFriendship.create({
				data: {
					userAId,
					userBId,
				},
			}),
			prisma.communityNotification.deleteMany({
				where: {
					recipientId: user.id,
					actorId: targetUserId,
					type: "FRIEND_REQUEST",
				},
			}),
			prisma.communityNotification.create({
				data: {
					recipientId: targetUserId,
					actorId: user.id,
					type: "FRIEND_ACCEPTED",
				},
			}),
		]);

		await revalidateRelationshipPaths(username);
		return { success: true };
	}

	const outgoingRequest = await prisma.userFriendRequest.findUnique({
		where: {
			senderId_receiverId: {
				senderId: user.id,
				receiverId: targetUserId,
			},
		},
		select: { id: true, status: true },
	});

	if (!outgoingRequest) {
		await prisma.$transaction([
			prisma.userFriendRequest.create({
				data: {
					senderId: user.id,
					receiverId: targetUserId,
					status: "PENDING",
				},
			}),
			prisma.communityNotification.create({
				data: {
					recipientId: targetUserId,
					actorId: user.id,
					type: "FRIEND_REQUEST",
				},
			}),
		]);
	} else if (outgoingRequest.status !== "PENDING") {
		await prisma.$transaction([
			prisma.userFriendRequest.update({
				where: { id: outgoingRequest.id },
				data: {
					status: "PENDING",
					respondedAt: null,
				},
			}),
			prisma.communityNotification.create({
				data: {
					recipientId: targetUserId,
					actorId: user.id,
					type: "FRIEND_REQUEST",
				},
			}),
		]);
	}

	await revalidateRelationshipPaths(username);
	return { success: true };
}

export async function cancelFriendRequest(formData) {
	const user = await requireSessionUser();
	if (!user) return { error: "Non autorisé" };

	const parsed = relationshipSchema.safeParse({
		targetUserId: formData.get("targetUserId") || formData.get("followingId") || "",
		username: formData.get("username") || "",
	});
	if (!parsed.success) return { error: parsed.error.issues[0].message };

	const { targetUserId, username } = parsed.data;

	await prisma.userFriendRequest.updateMany({
		where: {
			senderId: user.id,
			receiverId: targetUserId,
			status: "PENDING",
		},
		data: {
			status: "CANCELED",
			respondedAt: new Date(),
		},
	});

	await prisma.communityNotification.deleteMany({
		where: {
			recipientId: targetUserId,
			actorId: user.id,
			type: "FRIEND_REQUEST",
			isRead: false,
		},
	});

	await revalidateRelationshipPaths(username);
	return { success: true };
}

export async function acceptFriendRequest(formData) {
	const user = await requireSessionUser();
	if (!user) return { error: "Non autorisé" };

	const parsed = relationshipSchema.safeParse({
		targetUserId: formData.get("targetUserId") || "",
		username: formData.get("username") || "",
	});
	if (!parsed.success) return { error: parsed.error.issues[0].message };

	const { targetUserId, username } = parsed.data;
	const [userAId, userBId] = normalizeFriendshipPair(user.id, targetUserId);

	const request = await prisma.userFriendRequest.findUnique({
		where: {
			senderId_receiverId: {
				senderId: targetUserId,
				receiverId: user.id,
			},
		},
		select: { id: true, status: true },
	});

	if (!request || request.status !== "PENDING") {
		return { error: "Demande introuvable" };
	}

	await prisma.$transaction([
		prisma.userFriendRequest.update({
			where: { id: request.id },
			data: { status: "ACCEPTED", respondedAt: new Date() },
		}),
		prisma.userFriendship.upsert({
			where: {
				userAId_userBId: {
					userAId,
					userBId,
				},
			},
			create: { userAId, userBId },
			update: {},
		}),
		prisma.communityNotification.deleteMany({
			where: {
				recipientId: user.id,
				actorId: targetUserId,
				type: "FRIEND_REQUEST",
			},
		}),
		prisma.communityNotification.create({
			data: {
				recipientId: targetUserId,
				actorId: user.id,
				type: "FRIEND_ACCEPTED",
			},
		}),
	]);

	await revalidateRelationshipPaths(username);
	return { success: true };
}

export async function declineFriendRequest(formData) {
	const user = await requireSessionUser();
	if (!user) return { error: "Non autorisé" };

	const parsed = relationshipSchema.safeParse({
		targetUserId: formData.get("targetUserId") || "",
		username: formData.get("username") || "",
	});
	if (!parsed.success) return { error: parsed.error.issues[0].message };

	const { targetUserId, username } = parsed.data;

	await prisma.userFriendRequest.updateMany({
		where: {
			senderId: targetUserId,
			receiverId: user.id,
			status: "PENDING",
		},
		data: {
			status: "DECLINED",
			respondedAt: new Date(),
		},
	});

	await prisma.communityNotification.deleteMany({
		where: {
			recipientId: user.id,
			actorId: targetUserId,
			type: "FRIEND_REQUEST",
		},
	});

	await revalidateRelationshipPaths(username);
	return { success: true };
}

export async function unfriendUser(formData) {
	const user = await requireSessionUser();
	if (!user) return { error: "Non autorisé" };

	const parsed = relationshipSchema.safeParse({
		targetUserId: formData.get("targetUserId") || formData.get("followingId") || "",
		username: formData.get("username") || "",
	});
	if (!parsed.success) return { error: parsed.error.issues[0].message };

	const { targetUserId, username } = parsed.data;
	const [userAId, userBId] = normalizeFriendshipPair(user.id, targetUserId);

	await prisma.$transaction([
		prisma.userFriendship.deleteMany({
			where: { userAId, userBId },
		}),
		prisma.userFriendRequest.updateMany({
			where: {
				OR: [
					{ senderId: user.id, receiverId: targetUserId, status: "PENDING" },
					{ senderId: targetUserId, receiverId: user.id, status: "PENDING" },
				],
			},
			data: {
				status: "CANCELED",
				respondedAt: new Date(),
			},
		}),
		prisma.communityNotification.deleteMany({
			where: {
				type: "FRIEND_REQUEST",
				OR: [
					{ recipientId: user.id, actorId: targetUserId },
					{ recipientId: targetUserId, actorId: user.id },
				],
			},
		}),
	]);

	await revalidateRelationshipPaths(username);
	return { success: true };
}

export async function blockUser(formData) {
	const user = await requireSessionUser();
	if (!user) return { error: "Non autorisé" };

	const parsed = relationshipSchema.safeParse({
		targetUserId: formData.get("targetUserId") || "",
		username: formData.get("username") || "",
	});
	if (!parsed.success) return { error: parsed.error.issues[0].message };

	const { targetUserId, username } = parsed.data;
	if (targetUserId === user.id) return { error: "Action invalide" };

	const [userAId, userBId] = normalizeFriendshipPair(user.id, targetUserId);

	await prisma.$transaction([
		prisma.userBlock.upsert({
			where: {
				blockerId_blockedId: {
					blockerId: user.id,
					blockedId: targetUserId,
				},
			},
			create: {
				blockerId: user.id,
				blockedId: targetUserId,
			},
			update: {},
		}),
		prisma.userFriendship.deleteMany({
			where: { userAId, userBId },
		}),
		prisma.userFriendRequest.updateMany({
			where: {
				OR: [
					{ senderId: user.id, receiverId: targetUserId, status: "PENDING" },
					{ senderId: targetUserId, receiverId: user.id, status: "PENDING" },
				],
			},
			data: {
				status: "CANCELED",
				respondedAt: new Date(),
			},
		}),
		prisma.communityNotification.deleteMany({
			where: {
				type: "FRIEND_REQUEST",
				OR: [
					{ recipientId: user.id, actorId: targetUserId },
					{ recipientId: targetUserId, actorId: user.id },
				],
			},
		}),
	]);

	await revalidateRelationshipPaths(username);
	return { success: true };
}

export async function unblockUser(formData) {
	const user = await requireSessionUser();
	if (!user) return { error: "Non autorisé" };

	const parsed = relationshipSchema.safeParse({
		targetUserId: formData.get("targetUserId") || "",
		username: formData.get("username") || "",
	});
	if (!parsed.success) return { error: parsed.error.issues[0].message };

	const { targetUserId, username } = parsed.data;

	await prisma.userBlock.deleteMany({
		where: {
			blockerId: user.id,
			blockedId: targetUserId,
		},
	});

	await revalidateRelationshipPaths(username);
	return { success: true };
}
