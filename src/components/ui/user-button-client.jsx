"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FaUser } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { BiSolidMessageRoundedDetail } from "react-icons/bi";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { FaCog, FaSignOutAlt, FaTachometerAlt, FaUsers, FaUserShield } from "react-icons/fa";

export function UserButtonClient({ user: userProp, size }) {
	const { user: sessionUser, isSignedIn } = useCurrentUser();
	const user =
		userProp ||
		(isSignedIn
			? {
					id: sessionUser?.id,
					name: sessionUser?.fullName,
					email: sessionUser?.email,
					image: sessionUser?.imageUrl,
					role: sessionUser?.role,
				}
			: null);

	const avatar = user?.image || "/images/avatar-placeholder.png";
	const dashboardURL = "/dashboard";
	const communityURL = "/community";
	const messengerURL = "/community/messages";
	const profileSlug = user?.username || user?.id;
	const profileURL = profileSlug ? `/users/${profileSlug}` : "/profile";

	const userInitials = user?.name
		? user.name
				.split(" ")
				.map((name) => name.charAt(0))
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: "?";

	function handleSignOut() {
		signOut({ callbackUrl: "/" });
	}

	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="rounded-full cursor-pointer"
				>
					<Avatar size={size}>
						<AvatarImage
							src={avatar}
							alt={user?.name}
						/>
						<AvatarFallback>{userInitials}</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-50"
				align="end"
			>
				<DropdownMenuGroup>
					<DropdownMenuLabel
						asChild
						className="cursor-pointer"
					>
						<div className="space-y-1 text-center cursor-default pb-2 pt-4">
							<p className="text-xs font-medium leading-none text-neutral-900">{user?.name ? user.name : "Invité"}</p>
							<p className="text-[10px] leading-none text-muted-foreground">{user?.email ? user.email : "Connectez-vous pour continuer."}</p>
						</div>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						asChild
						className="cursor-pointer py-2 px-4 rounded-none hover:bg-neutral-900 text-muted-foreground "
					>
						<Link
							href={profileURL}
							className="flex items-center gap-2"
						>
							<FaUser className="h-2.5 w-2.5" />
							Profil
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem
						asChild
						className="cursor-pointer py-2 px-4 rounded-none hover:bg-neutral-900 text-muted-foreground"
					>
						<Link
							href={dashboardURL}
							className="flex items-center gap-2"
						>
							<FaTachometerAlt className="h-2.5 w-2.5" />
							Tableau de bord
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem
						asChild
						className="cursor-pointer py-2 px-4 rounded-none hover:bg-neutral-900 text-muted-foreground"
					>
						<Link
							href={communityURL}
							className="flex items-center gap-2"
						>
							<FaUsers className="h-2.5 w-2.5" />
							Communauté ÆRIA
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem
						asChild
						className="cursor-pointer py-2 px-4 rounded-none hover:bg-neutral-900 text-muted-foreground"
					>
						<Link
							href={messengerURL}
							className="flex items-center gap-2"
						>
							<BiSolidMessageRoundedDetail />
							ÆRIA Messenger
						</Link>
					</DropdownMenuItem>
					{user?.role === "ADMIN" && (
						<DropdownMenuItem
							asChild
							className="cursor-pointer py-2 px-4 rounded-none hover:bg-neutral-900 text-muted-foreground"
						>
							<Link
								href="/admin"
								className="flex items-center gap-2"
							>
								<FaUserShield />
								Administration
							</Link>
						</DropdownMenuItem>
					)}
					{user?.role === "ADMIN" && (
						<DropdownMenuItem
							asChild
							className="cursor-pointer py-2 px-4 rounded-none hover:bg-neutral-900 text-muted-foreground"
						>
							<Link
								href="/admin/settings"
								className="flex items-center gap-2"
							>
								<FaCog className="h-2.5 w-2.5" />
								Paramètres
							</Link>
						</DropdownMenuItem>
					)}
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						variant="destructive"
						onClick={handleSignOut}
						className="cursor-pointer py-2 px-4 rounded-none hover:bg-neutral-900 text-muted-foreground"
					>
						<FaSignOutAlt className="h-2.5 w-2.5" />
						Déconnexion
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
