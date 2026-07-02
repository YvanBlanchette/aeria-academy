import Link from "next/link";
import { Button } from "./ui/button";
import { UserButtonClient } from "./ui/user-button-client";
import { CommunityNotificationsMenu } from "./community/community-notifications-menu";
import { auth } from "@/auth";

const DashboardLayoutRight = async ({ children, title, subtitle, btnLabel, btnLink }) => {
	const session = await auth();
	const user = session?.user;

	return (
		<div className="flex flex-col h-screen">
			<div className="sticky top-0 z-10 flex items-center px-8 justify-between border-b border-border/70 h-22.5 bg-background/80 backdrop-blur-xl">
				<div className="flex items-center gap-4">
					<div>
						<h1 className="text-3xl font-bold">{title}</h1>
						<p className="text-muted-foreground">{subtitle}</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					{btnLabel && (
						<Button asChild>
							<Link href={btnLink}>{btnLabel}</Link>
						</Button>
					)}
					{user && (
						<div className="flex items-center gap-4 mr-4">
							<CommunityNotificationsMenu />
							<UserButtonClient
								user={user}
								size="lg"
							/>
						</div>
					)}
				</div>
			</div>
			<div className="dashboard-shell p-8 bg-linear-to-b from-background via-background to-muted/30 h-[calc(100vh-90px)] w-full overflow-auto">{children}</div>
		</div>
	);
};
export default DashboardLayoutRight;
