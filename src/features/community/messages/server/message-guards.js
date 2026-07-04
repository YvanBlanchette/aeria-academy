import { auth } from "@/auth";

export async function requireMessagingUser() {
	// Reused server-side auth gate for all messenger actions.
	const session = await auth();
	if (!session?.user?.id) throw new Error("Non autorise");
	return session.user;
}
