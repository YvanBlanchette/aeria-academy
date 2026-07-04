"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import Logo from "@/components/logo";
import MessengerButton from "@/components/community/community-messenger-button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { CommunityNotificationsMenu } from "@/components/community/community-notifications-menu";
import { UserButtonClient as UserButton } from "@/components/ui/user-button-client";
import { FaHouseChimney, FaUsers } from "react-icons/fa6";
import { FaUserCircle } from "react-icons/fa";
import { Building2, MessageSquare, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IoLogIn } from "react-icons/io5";

const TAB_ICONS = {
	home: FaHouseChimney,
	messages: MessageSquare,
	profile: FaUserCircle,
	users: FaUsers,
	building: Building2,
};

function isActiveTab(pathname, href) {
	return pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith(`${href}?`);
}

export function SocialShell({ tabs, children }) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { isLoaded, isSignedIn } = useCurrentUser();
	const activeTabHref = tabs.filter((tab) => isActiveTab(pathname, tab.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
	const activeQuery = searchParams.get("q") || "";
	const searchValue = pathname.startsWith("/community") ? activeQuery : "";
	const [searchBarOpen, setSearchBarOpen] = useState(false);
	const [incomingPendingCount, setIncomingPendingCount] = useState(0);

	useEffect(() => {
		if (!isSignedIn) {
			return;
		}

		let isMounted = true;

		async function loadFriendSummary() {
			try {
				const response = await fetch("/api/community/friends/summary", {
					cache: "no-store",
				});
				if (!response.ok) return;
				const payload = await response.json();
				if (!isMounted) return;
				setIncomingPendingCount(typeof payload.incomingPendingCount === "number" ? payload.incomingPendingCount : 0);
			} catch {
				if (!isMounted) return;
				setIncomingPendingCount(0);
			}
		}

		loadFriendSummary();
		const intervalId = window.setInterval(loadFriendSummary, 15000);

		function handleRefresh() {
			loadFriendSummary();
		}

		window.addEventListener("community-notifications:refresh", handleRefresh);

		return () => {
			isMounted = false;
			window.clearInterval(intervalId);
			window.removeEventListener("community-notifications:refresh", handleRefresh);
		};
	}, [isSignedIn]);

	return (
		<div className="min-h-screen bg-[#f0f2f5] text-foreground">
			<header className="sticky top-0 z-50 border-b border-border/70 bg-white/95 backdrop-blur shadow-lg">
				<div className="mx-auto grid grid-cols-5 h-16 w-full max-w-7xl items-center justify gap-3 px-4 sm:px-6 lg:px-8">
					<div className="col-span=1 flex items-center gap-3">
						<Logo
							variant="dark"
							size="sm"
							icon={true}
						/>
						<form
							action="/community"
							method="get"
							className={clsx(
								"hidden sm:flex items-center rounded-full bg-[#f0f2f5] h-9  transition-all duration-300 overflow-hidden",
								searchBarOpen ? "px-2 w-56 lg:w-72 justify-start" : "w-9 px-0 justify-center",
							)}
						>
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										onClick={() => setSearchBarOpen((open) => !open)}
										className="flex shrink-0 items-center justify-center text-muted-foreground cursor-pointer p-0 m-0 h-9 w-9"
										aria-label="Ouvrir la recherche"
									>
										<Search className="h-4 w-4" />
									</button>
								</TooltipTrigger>
								<TooltipContent side="bottom">
									<p>Rechercher</p>
								</TooltipContent>
							</Tooltip>

							<input
								type="search"
								name="q"
								defaultValue={searchValue}
								placeholder="Rechercher..."
								className={clsx(
									"ml-2 bg-transparent text-sm outline-none placeholder:text-muted-foreground transition-all duration-300",
									searchBarOpen ? "w-full block" : "hidden",
								)}
							/>
						</form>
					</div>

					<nav className="col-span-3 flex flex-1 items-center justify-center overflow-x-auto">
						<div className="flex min-w-max items-center gap-4 rounded-full bg-muted/40 p-1">
							{tabs.map((tab) => {
								const active = activeTabHref === tab.href;
								const TabIcon = tab.iconKey ? TAB_ICONS[tab.iconKey] : null;
								const isRelationsTab = tab.href === "/community/friends";
								return (
									<Tooltip
										key={tab.href}
										className="h-full"
									>
										<TooltipTrigger asChild>
											<Link
												href={tab.href}
												className={clsx(
													"group rounded-none text-neutral-700 hover:text-[#CE8500] px-10 py-5 h-full border-b-4 text-sm font-medium transition-colors flex items-center justify-center gap-1",
													active ? "border-[#CE8500] text-[#CE8500]" : "border-transparent hover:border-[#CE8500]",
												)}
											>
												<TabIcon className={clsx("mr-1 inline h-6 w-6 group-hover:text-[#CE8500]", active ? "text-[#CE8500]" : "text-neutral-700")} />

												{isRelationsTab && incomingPendingCount > 0 ? (
													<span
														className={clsx(
															"rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
															active ? "bg-white/20 text-white" : "bg-primary text-primary-foreground",
														)}
													>
														{incomingPendingCount > 99 ? "99+" : incomingPendingCount}
													</span>
												) : null}
											</Link>
										</TooltipTrigger>
										<TooltipContent side={"bottom"}>
											<span>{tab.label}</span>
										</TooltipContent>
									</Tooltip>
								);
							})}
						</div>
					</nav>

					<div className="flex shrink-0 justify-end items-center gap-3">
						{isLoaded && isSignedIn && (
							<>
								<MessengerButton />
								<CommunityNotificationsMenu />
							</>
						)}

						<div className="col-span-1 flex shrink-0 items-center justify-end gap-2">
							{!isLoaded ? <div className="h-9 w-9 rounded-full bg-muted animate-pulse" /> : <UserButton size="lg" />}
						</div>
					</div>
				</div>
			</header>

			{children}
		</div>
	);
}
