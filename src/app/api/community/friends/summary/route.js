import { auth } from "@/auth";
import { getCommunityEnabled } from "@/lib/platform-settings";
import { getIncomingPendingFriendRequestsCount } from "@/features/community/friends/server/friend-requests-service";

export async function GET() {
	const session = await auth();
	if (!session?.user?.id) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const communityEnabled = await getCommunityEnabled();
	if (!communityEnabled) {
		return Response.json({ incomingPendingCount: 0 });
	}

	const incomingPendingCount = await getIncomingPendingFriendRequestsCount(session.user.id);

	return Response.json({ incomingPendingCount });
}
