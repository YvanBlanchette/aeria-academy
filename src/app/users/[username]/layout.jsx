import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SocialShell } from "@/components/social/social-shell";
import { buildSocialTabs } from "@/lib/data/navigation";
import { auth } from "@/auth";
import { getCommunityEnabled } from "@/lib/platform-settings";
import { NotificationsProviderWithToasts } from "@/features/community/notifications/notifications-provider-with-toasts";

export default async function PublicUserLayout({ children, params }) {
	const session = await auth();
	const communityEnabled = await getCommunityEnabled();
	const notificationsEnabled = Boolean(session?.user?.id) && communityEnabled;
	const { username } = await params;
	const targetUser = await prisma.user.findFirst({
		where: {
			OR: [{ username: { equals: username, mode: "insensitive" } }, { id: username }],
		},
		select: {
			id: true,
			username: true,
		},
	});

	if (!targetUser) {
		notFound();
	}

	const profileSlug = targetUser.username || username;

	return (
		<NotificationsProviderWithToasts
			enabled={notificationsEnabled}
			userId={session?.user?.id || null}
		>
			<SocialShell tabs={buildSocialTabs(profileSlug)}>{children}</SocialShell>
		</NotificationsProviderWithToasts>
	);
}
