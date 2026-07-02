import { prisma } from "@/lib/prisma";

export const PROFILE_VISIBILITY_SCOPE = {
	PUBLIC: "PUBLIC",
	MEMBERS: "MEMBERS",
	FRIENDS: "FRIENDS",
	PRIVATE: "PRIVATE",
};

export const MESSAGE_PERMISSION_SCOPE = {
	EVERYONE: "EVERYONE",
	FRIENDS: "FRIENDS",
	NOBODY: "NOBODY",
};

export function normalizeFriendshipPair(userIdA, userIdB) {
	if (!userIdA || !userIdB) return [null, null];
	return userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];
}

export async function areUsersFriends(userIdA, userIdB) {
	if (!userIdA || !userIdB) return false;
	if (userIdA === userIdB) return true;

	const [userAId, userBId] = normalizeFriendshipPair(userIdA, userIdB);
	const friendship = await prisma.userFriendship.findUnique({
		where: {
			userAId_userBId: {
				userAId,
				userBId,
			},
		},
		select: { id: true },
	});

	return Boolean(friendship);
}

export async function getFriendRequestStatusBetween(userIdA, userIdB) {
	if (!userIdA || !userIdB || userIdA === userIdB) {
		return { outgoingPending: false, incomingPending: false };
	}

	const [outgoing, incoming] = await Promise.all([
		prisma.userFriendRequest.findFirst({
			where: {
				senderId: userIdA,
				receiverId: userIdB,
				status: "PENDING",
			},
			select: { id: true },
		}),
		prisma.userFriendRequest.findFirst({
			where: {
				senderId: userIdB,
				receiverId: userIdA,
				status: "PENDING",
			},
			select: { id: true },
		}),
	]);

	return {
		outgoingPending: Boolean(outgoing),
		incomingPending: Boolean(incoming),
	};
}

export async function areUsersBlockedEitherWay(userIdA, userIdB) {
	if (!userIdA || !userIdB) return false;
	if (userIdA === userIdB) return false;

	const block = await prisma.userBlock.findFirst({
		where: {
			OR: [
				{ blockerId: userIdA, blockedId: userIdB },
				{ blockerId: userIdB, blockedId: userIdA },
			],
		},
		select: { id: true },
	});

	return Boolean(block);
}

export async function canViewerSeeUserProfile({ viewerId, targetUserId, targetProfileVisibilityScope }) {
	if (!targetUserId) return false;
	if (viewerId && viewerId === targetUserId) return true;

	if (viewerId && (await areUsersBlockedEitherWay(viewerId, targetUserId))) {
		return false;
	}

	const scope = targetProfileVisibilityScope || PROFILE_VISIBILITY_SCOPE.MEMBERS;
	if (scope === PROFILE_VISIBILITY_SCOPE.PUBLIC) return true;
	if (scope === PROFILE_VISIBILITY_SCOPE.MEMBERS) return Boolean(viewerId);
	if (scope === PROFILE_VISIBILITY_SCOPE.PRIVATE) return false;
	if (!viewerId) return false;
	return areUsersFriends(viewerId, targetUserId);
}

export async function canUserMessageTarget({ senderId, targetUserId, targetMessagePermissionScope }) {
	if (!senderId || !targetUserId) return false;
	if (senderId === targetUserId) return true;
	if (await areUsersBlockedEitherWay(senderId, targetUserId)) return false;

	const scope = targetMessagePermissionScope || MESSAGE_PERMISSION_SCOPE.EVERYONE;
	if (scope === MESSAGE_PERMISSION_SCOPE.EVERYONE) return true;
	if (scope === MESSAGE_PERMISSION_SCOPE.NOBODY) return false;
	return areUsersFriends(senderId, targetUserId);
}
