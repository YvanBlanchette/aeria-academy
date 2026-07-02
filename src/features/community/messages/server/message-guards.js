import { auth } from "@/auth";

export async function requireMessagingUser() {
	const session = await auth();
	if (!session?.user?.id) throw new Error("Non autorise");
	return session.user;
}
