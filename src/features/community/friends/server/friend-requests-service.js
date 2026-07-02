import { prisma } from "@/lib/prisma";

export async function getIncomingPendingFriendRequestsCount(userId) {
	return prisma.userFriendRequest.count({
		where: {
			receiverId: userId,
			status: "PENDING",
		},
	});
}
