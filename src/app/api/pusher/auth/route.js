import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(request) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Non autorise" }, { status: 401 });
	}

	const pusher = getPusherServer();
	if (!pusher) {
		return NextResponse.json({ error: "Pusher non configure" }, { status: 503 });
	}

	const formData = await request.formData();
	const socketId = String(formData.get("socket_id") || "").trim();
	const channelName = String(formData.get("channel_name") || "").trim();
	const expectedChannel = `private-user-${session.user.id}`;

	if (!socketId || !channelName) {
		return NextResponse.json({ error: "Parametres invalides" }, { status: 400 });
	}

	// Restrict subscriptions to the signed-in user's own private channel.
	if (channelName !== expectedChannel) {
		return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
	}

	const authPayload =
		typeof pusher.authorizeChannel === "function" ? await pusher.authorizeChannel(socketId, channelName) : await pusher.authenticate(socketId, channelName);

	return NextResponse.json(authPayload);
}
