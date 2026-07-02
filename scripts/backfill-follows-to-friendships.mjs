import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function normalizePair(userIdA, userIdB) {
	return userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];
}

async function main() {
	const dryRun = process.argv.includes("--dry-run");
	console.log(dryRun ? "[DRY RUN] Backfill follows -> friends" : "Backfill follows -> friends");

	const follows = await prisma.userFollow.findMany({
		select: {
			followerId: true,
			followingId: true,
		},
	});

	console.log(`Follows trouvés: ${follows.length}`);

	const directed = new Set(follows.map((follow) => `${follow.followerId}:${follow.followingId}`));
	const processedPairs = new Set();
	const friendshipPairs = [];
	const pendingRequests = [];

	for (const follow of follows) {
		if (follow.followerId === follow.followingId) continue;

		const [userAId, userBId] = normalizePair(follow.followerId, follow.followingId);
		const pairKey = `${userAId}:${userBId}`;
		if (processedPairs.has(pairKey)) continue;
		processedPairs.add(pairKey);

		const hasAB = directed.has(`${userAId}:${userBId}`);
		const hasBA = directed.has(`${userBId}:${userAId}`);

		if (hasAB && hasBA) {
			friendshipPairs.push({ userAId, userBId });
		} else if (hasAB) {
			pendingRequests.push({ senderId: userAId, receiverId: userBId });
		} else if (hasBA) {
			pendingRequests.push({ senderId: userBId, receiverId: userAId });
		}
	}

	console.log(`Paires amitié candidates: ${friendshipPairs.length}`);
	console.log(`Demandes en attente candidates: ${pendingRequests.length}`);

	let friendshipsCreated = 0;
	let requestsCreated = 0;
	let blockedSkipped = 0;

	for (const pair of friendshipPairs) {
		const isBlocked = await prisma.userBlock.findFirst({
			where: {
				OR: [
					{ blockerId: pair.userAId, blockedId: pair.userBId },
					{ blockerId: pair.userBId, blockedId: pair.userAId },
				],
			},
			select: { id: true },
		});

		if (isBlocked) {
			blockedSkipped += 1;
			continue;
		}

		if (!dryRun) {
			await prisma.userFriendship.upsert({
				where: {
					userAId_userBId: {
						userAId: pair.userAId,
						userBId: pair.userBId,
					},
				},
				create: {
					userAId: pair.userAId,
					userBId: pair.userBId,
				},
				update: {},
			});
		}
		friendshipsCreated += 1;
	}

	for (const request of pendingRequests) {
		const isBlocked = await prisma.userBlock.findFirst({
			where: {
				OR: [
					{ blockerId: request.senderId, blockedId: request.receiverId },
					{ blockerId: request.receiverId, blockedId: request.senderId },
				],
			},
			select: { id: true },
		});

		if (isBlocked) {
			blockedSkipped += 1;
			continue;
		}

		const [userAId, userBId] = normalizePair(request.senderId, request.receiverId);
		const friendshipExists = await prisma.userFriendship.findUnique({
			where: {
				userAId_userBId: {
					userAId,
					userBId,
				},
			},
			select: { id: true },
		});
		if (friendshipExists) continue;

		if (!dryRun) {
			await prisma.userFriendRequest.upsert({
				where: {
					senderId_receiverId: {
						senderId: request.senderId,
						receiverId: request.receiverId,
					},
				},
				create: {
					senderId: request.senderId,
					receiverId: request.receiverId,
					status: "PENDING",
				},
				update: {
					status: "PENDING",
					respondedAt: null,
				},
			});
		}
		requestsCreated += 1;
	}

	console.log(`Amitiés ${dryRun ? "simulées" : "créées"}: ${friendshipsCreated}`);
	console.log(`Demandes ${dryRun ? "simulées" : "créées"}: ${requestsCreated}`);
	console.log(`Relations ignorées (blocage): ${blockedSkipped}`);
	console.log("Backfill terminé.");
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
