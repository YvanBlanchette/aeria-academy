import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCommunityEnabled } from "@/lib/platform-settings";
import { MemberLayoutSwitcher } from "@/components/users/member-layout-switcher";
import { NotificationsProviderWithToasts } from "@/features/community/notifications/notifications-provider-with-toasts";

export default async function UserLayout({ children }) {
	const session = await auth();
	if (!session?.user?.id) redirect("/login");
	const communityEnabled = await getCommunityEnabled();

	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: { id: true, name: true, email: true, image: true, membership: true, role: true, username: true },
	});

	if (!user) redirect("/login");

	return (
		<NotificationsProviderWithToasts
			enabled={communityEnabled}
			userId={session.user.id}
		>
			<MemberLayoutSwitcher
				user={user}
				communityEnabled={communityEnabled}
			>
				{children}
			</MemberLayoutSwitcher>
		</NotificationsProviderWithToasts>
	);
}
