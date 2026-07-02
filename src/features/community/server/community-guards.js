import { auth } from "@/auth";
import { getCommunityEnabled } from "@/lib/platform-settings";

export async function requireCommunityUser() {
	const session = await auth();
	if (!session?.user?.id) throw new Error("Non autorise");
	const communityEnabled = await getCommunityEnabled();
	if (!communityEnabled) throw new Error("La communauté est actuellement désactivée");
	return session.user;
}

export function canModerateCommunityContent(user, authorId) {
	return user.id === authorId || user.role === "ADMIN";
}
