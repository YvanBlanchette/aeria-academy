"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/logo";
import { UserButtonClient } from "@/components/ui/user-button-client";
import { CommunityNotificationsMenu } from "@/components/community/community-notifications-menu";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarTrigger, SidebarFooter } from "@/components/ui/sidebar";
import { userSidebarNavItems as navItems } from "@/lib/data/navigation";

const membershipLabel = {
	FREE: { label: "Gratuit", variant: "outline" },
	ACADEMY: { label: "Académie", variant: "default" },
	PRIME: { label: "Prime", variant: "secondary" },
};

export function UserSidebar({ user, children, communityEnabled = true }) {
	const pathname = usePathname();
	const filteredNavItems = navItems.filter((item) => (item.href === "/community" ? communityEnabled : true));
	const withAdminShortcut =
		user?.role === "ADMIN"
			? [filteredNavItems[0], { href: "/admin", label: "Administration", icon: filteredNavItems[0]?.icon }, ...filteredNavItems.slice(1)]
			: filteredNavItems;
	const activeItem =
		withAdminShortcut.find((item) => (item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href))) || withAdminShortcut[0];
	const tier = membershipLabel[user.membership] || membershipLabel.FREE;

	return (
		<SidebarProvider
			defaultOpen
			style={{
				"--sidebar-width": "22.5rem",
				"--sidebar-width-mobile": "22.5rem",
			}}
		>
			<Sidebar
				variant="inset"
				collapsible="offcanvas"
				className="border-r border-sidebar-border shadow-xl bg-white p-0 m-0"
			>
				<SidebarHeader className="flex h-22.5 items-center justify-center border-b border-sidebar-border bg-white">
					<Logo
						locale="fr"
						scrolled
					/>
				</SidebarHeader>
				<SidebarContent className="bg-white">
					<div>
						{withAdminShortcut.map((item) => {
							const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
							const Icon = item.icon;
							return (
								<Link
									key={item.href}
									href={item.href}
									className={cn(
										"flex items-center gap-3 px-6 py-5 text-sm transition-all",
										isActive ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-neutral-200",
									)}
								>
									<Icon className="h-4 w-4" />
									{item.label}
								</Link>
							);
						})}
					</div>
				</SidebarContent>
				<SidebarFooter className="border-t border-sidebar-border flex flex-col items-center justify-between gap-2 py-4 px-0 bg-white">
					<Badge
						variant={tier.variant}
						className="mx-2 mb-1 justify-center"
					>
						Abonnement: {tier.label}
					</Badge>
					<Button
						asChild
						variant="ghost"
						className="flex items-center justify-center gap-3 py-4 hover:bg-neutral-300 rounded-none w-full"
					>
						<Link href="/">
							<BookOpen className="h-4 w-4" />
							Retour au site
						</Link>
					</Button>
				</SidebarFooter>
			</Sidebar>

			<SidebarInset className="h-svh overflow-hidden md:m-0 md:rounded-none md:shadow-none">
				<header className="sticky top-0 z-10 flex h-22.5 items-center border-b border-border/70 bg-white shadow-xl">
					<div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 lg:px-8">
						<div className="flex items-center gap-3">
							<SidebarTrigger />
							<div>
								<p className="text-sm font-medium text-muted-foreground">Espace membre</p>
								<h1 className="text-xl font-semibold">{activeItem.label}</h1>
							</div>
						</div>
						{user && (
							<div className="flex items-center gap-4 mr-6">
								<CommunityNotificationsMenu />
								<UserButtonClient
									user={user}
									size="lg"
								/>
							</div>
						)}
					</div>
				</header>
				<main className="dashboard-shell flex-1 overflow-y-auto bg-neutral-100">{children}</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
