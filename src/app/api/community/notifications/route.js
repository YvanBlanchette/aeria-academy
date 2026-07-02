import { auth } from "@/auth";
import { getCommunityEnabled } from "@/lib/platform-settings";
import { getNotificationsPayload, markNotificationsAsRead } from "@/features/community/notifications/server/notifications-service";
import { parseMarkAll, parseNotificationId, parseNotificationsLimit } from "@/features/community/notifications/server/notifications-validators";

export async function GET(request) {
	const session = await auth();
	if (!session?.user?.id) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const communityEnabled = await getCommunityEnabled();
	if (!communityEnabled) {
		return Response.json({
			unreadCount: 0,
			notifications: [],
		});
	}

	const { searchParams } = new URL(request.url);
	const limit = parseNotificationsLimit(searchParams.get("limit"));
	const userId = session.user.id;

	const payload = await getNotificationsPayload({ userId, limit });
	return Response.json(payload);
}

export async function POST(request) {
	const session = await auth();
	if (!session?.user?.id) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const communityEnabled = await getCommunityEnabled();
	if (!communityEnabled) {
		return Response.json({ success: true, unreadCount: 0 });
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const notificationId = parseNotificationId(body?.notificationId);
	const markAll = parseMarkAll(body?.markAll);
	if (!markAll && !notificationId) {
		return Response.json({ error: "notificationId is required" }, { status: 400 });
	}

	const userId = session.user.id;
	const payload = await markNotificationsAsRead({ userId, notificationId, markAll });
	return Response.json(payload);
}
