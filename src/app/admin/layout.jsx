import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminSidebar } from "@/components/admin/sidebar";
import { NotificationsProviderWithToasts } from "@/features/community/notifications/notifications-provider-with-toasts";
import { getCommunityEnabled } from "@/lib/platform-settings";

export default async function AdminLayout({ children }) {
	const session = await auth();

	if (!session || session.user.role !== "ADMIN") {
		redirect("/");
	}

	const communityEnabled = await getCommunityEnabled();

	return (
		<NotificationsProviderWithToasts enabled={communityEnabled}>
			<AdminSidebar user={session.user}>{children}</AdminSidebar>
		</NotificationsProviderWithToasts>
	);
}
