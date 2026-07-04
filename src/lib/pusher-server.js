import Pusher from "pusher";

let pusherInstance = null;

function hasPusherServerConfig() {
	return Boolean(process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET && process.env.PUSHER_CLUSTER);
}

export function getPusherServer() {
	if (!hasPusherServerConfig()) return null;
	if (pusherInstance) return pusherInstance;

	// Singleton keeps connection config centralized and avoids recreating client per request.
	pusherInstance = new Pusher({
		appId: process.env.PUSHER_APP_ID,
		key: process.env.PUSHER_KEY,
		secret: process.env.PUSHER_SECRET,
		cluster: process.env.PUSHER_CLUSTER,
		useTLS: true,
	});

	return pusherInstance;
}

export async function triggerCommunityRealtimeUpdate({ userIds, conversationId, reason }) {
	const pusher = getPusherServer();
	if (!pusher) return;

	const normalizedUserIds = Array.from(new Set((userIds || []).filter(Boolean)));
	if (normalizedUserIds.length === 0) return;

	const payload = {
		conversationId: conversationId || null,
		reason: reason || "unknown",
		at: new Date().toISOString(),
	};

	await Promise.allSettled(normalizedUserIds.map((userId) => pusher.trigger(`private-user-${userId}`, "community:messages-updated", payload)));
}
