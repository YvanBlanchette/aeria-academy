"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/logo";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarTrigger, SidebarFooter } from "@/components/ui/sidebar";
import { adminSidebarNavItems as navItems } from "@/lib/data/navigation";
import { UserButtonClient } from "../ui/user-button-client";
import { CommunityNotificationsMenu } from "../community/community-notifications-menu";
import MessengerButton from "../community/community-messenger-button";

export function AdminSidebar({ user, children }) {
	const pathname = usePathname();
	const activeItem = navItems.find((item) => (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href))) || navItems[0];

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
					<div className="">
						{navItems.map((item) => {
							const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
							const Icon = item.icon;
							return (
								<Link
									key={item.href}
									href={item.href}
									className={cn(
										"flex items-center gap-3 px-5 py-5 text-sm transition-all",
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
				<SidebarFooter className="border-t border-sidebar-border flex flex-col items-center justify-between gap-2 pt-5 px-0 bg-white">
					<Badge
						variant="outline"
						className="mx-2 mb-1 justify-center bg-primary text-white"
					>
						Accès administrateur
					</Badge>
					<Button
						variant="ghost"
						className="flex items-center justify-center gap-2 py-6 hover:bg-neutral-300 rounded-none w-full"
						onClick={() => signOut({ callbackUrl: "/" })}
					>
						<LogOut className="h-4 w-4" />
						Déconnexion
					</Button>
				</SidebarFooter>
			</Sidebar>

			<SidebarInset className="h-svh overflow-hidden md:m-0 md:rounded-none md:shadow-none">
				{/* NAVIGATION BAR */}
				<header className="sticky top-0 z-10 flex h-22.5 items-center border-b border-border/70 bg-white shadow-xl">
					<div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 lg:px-8">
						<div className="flex items-center gap-3">
							<SidebarTrigger />
							<div>
								<p className="text-sm font-medium text-muted-foreground">Administration</p>

								<h1 className="text-xl font-semibold">{activeItem.label}</h1>
							</div>
						</div>
						{user && (
							<div className="flex items-center gap-4 mr-6">
								<MessengerButton />
								<CommunityNotificationsMenu />
								<UserButtonClient
									user={user}
									size="lg"
								/>
							</div>
						)}
					</div>
				</header>

				{/* CONTENT */}
				<main className="flex-1 overflow-y-auto bg-neutral-100">{children}</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
