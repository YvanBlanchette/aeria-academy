import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3, Ellipsis, MessageSquare, UserCheck, UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MESSAGE_PERMISSION_SCOPE } from "@/lib/social-graph";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { acceptFriendRequest, blockUser, cancelFriendRequest, declineFriendRequest, unfriendUser } from "@/app/users/[username]/actions";

export const metadata = {
	title: "Amis | Communauté ÆRIA",
	description: "Gère tes demandes d'ami et tes relations",
};

function initialsFromName(name, email) {
	return (name || email || "U")
		.split(" ")
		.map((part) => part.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function UserRow({ user, subtitle, menuContent }) {
	const initials = initialsFromName(user?.name, user?.email);

	return (
		<div className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3 shadow-sm">
			<div className="flex min-w-0 items-center gap-3">
				<Avatar className="h-11 w-11 shrink-0">
					<AvatarImage src={user?.image || ""} />
					<AvatarFallback>{initials}</AvatarFallback>
				</Avatar>
				<div className="min-w-0">
					<p className="truncate text-sm font-medium">{user?.name || user?.email}</p>
					<p className="truncate text-xs text-muted-foreground">{subtitle || (user?.username ? `@${user.username}` : user?.email)}</p>
				</div>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				<DropdownMenu modal={false}>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="icon"
							className="h-9 w-9 rounded-full"
							aria-label="Actions utilisateur"
						>
							<Ellipsis className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="end"
						className="w-56"
					>
						{menuContent}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}

export default async function CommunityFriendsPage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect("/login?callbackUrl=/community/friends");
	}

	const userId = session.user.id;

	const [incoming, outgoing, friendships] = await Promise.all([
		prisma.userFriendRequest.findMany({
			where: {
				receiverId: userId,
				status: "PENDING",
			},
			orderBy: { createdAt: "desc" },
			include: {
				sender: {
					select: {
						id: true,
						name: true,
						email: true,
						username: true,
						image: true,
						profile: { select: { messagePermissionScope: true } },
					},
				},
			},
		}),
		prisma.userFriendRequest.findMany({
			where: {
				senderId: userId,
				status: "PENDING",
			},
			orderBy: { createdAt: "desc" },
			include: {
				receiver: {
					select: {
						id: true,
						name: true,
						email: true,
						username: true,
						image: true,
						profile: { select: { messagePermissionScope: true } },
					},
				},
			},
		}),
		prisma.userFriendship.findMany({
			where: {
				OR: [{ userAId: userId }, { userBId: userId }],
			},
			orderBy: { createdAt: "desc" },
			include: {
				userA: {
					select: {
						id: true,
						name: true,
						email: true,
						username: true,
						image: true,
						profile: { select: { messagePermissionScope: true } },
					},
				},
				userB: {
					select: {
						id: true,
						name: true,
						email: true,
						username: true,
						image: true,
						profile: { select: { messagePermissionScope: true } },
					},
				},
			},
		}),
	]);

	const friendIds = friendships.map((friendship) => (friendship.userA.id === userId ? friendship.userB.id : friendship.userA.id));
	const blocks =
		friendIds.length > 0
			? await prisma.userBlock.findMany({
					where: {
						OR: [
							{ blockerId: userId, blockedId: { in: friendIds } },
							{ blockerId: { in: friendIds }, blockedId: userId },
						],
					},
					select: {
						blockerId: true,
						blockedId: true,
					},
				})
			: [];

	const blockedFriendIds = new Set(blocks.map((block) => (block.blockerId === userId ? block.blockedId : block.blockerId)));

	const friends = friendships.map((friendship) => {
		const friend = friendship.userA.id === userId ? friendship.userB : friendship.userA;
		const permissionScope = friend.profile?.messagePermissionScope || MESSAGE_PERMISSION_SCOPE.EVERYONE;
		const canMessage = !blockedFriendIds.has(friend.id) && permissionScope !== MESSAGE_PERMISSION_SCOPE.NOBODY;
		return { friendshipId: friendship.id, friend, canMessage };
	});

	return (
		<div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
			<div className="grid gap-4 lg:grid-cols-2">
				<Card className="rounded-2xl border-0 bg-white shadow-sm">
					<CardHeader className="border-b pb-4">
						<CardTitle className="flex items-center gap-2 text-base">
							<UserPlus className="h-5 w-5" />
							Demandes reçues
							<Badge className="rounded-full">{incoming.length}</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 p-4">
						{incoming.length > 0 ? (
							incoming.map((request) => {
								const username = request.sender.username || request.sender.id;
								const profileHref = `/users/${encodeURIComponent(username)}`;
								return (
									<UserRow
										key={request.id}
										user={request.sender}
										subtitle="Veut devenir ton ami"
										menuContent={
											<>
												<DropdownMenuItem asChild>
													<Link href={profileHref}>Voir le profil</Link>
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<form action={acceptFriendRequest}>
													<input
														type="hidden"
														name="targetUserId"
														value={request.sender.id}
													/>
													<input
														type="hidden"
														name="username"
														value={username}
													/>
													<DropdownMenuItem asChild>
														<button
															type="submit"
															className="w-full cursor-pointer text-left"
														>
															Accepter
														</button>
													</DropdownMenuItem>
												</form>
												<form action={declineFriendRequest}>
													<input
														type="hidden"
														name="targetUserId"
														value={request.sender.id}
													/>
													<input
														type="hidden"
														name="username"
														value={username}
													/>
													<DropdownMenuItem asChild>
														<button
															type="submit"
															className="w-full cursor-pointer text-left"
														>
															Refuser
														</button>
													</DropdownMenuItem>
												</form>
												<DropdownMenuSeparator />
												<form action={blockUser}>
													<input
														type="hidden"
														name="targetUserId"
														value={request.sender.id}
													/>
													<input
														type="hidden"
														name="username"
														value={username}
													/>
													<DropdownMenuItem
														asChild
														className="text-red-600 focus:text-red-600"
													>
														<button
															type="submit"
															className="w-full cursor-pointer text-left"
														>
															Bloquer
														</button>
													</DropdownMenuItem>
												</form>
											</>
										}
									/>
								);
							})
						) : (
							<p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Aucune demande reçue.</p>
						)}
					</CardContent>
				</Card>

				<Card className="rounded-2xl border-0 bg-white shadow-sm">
					<CardHeader className="border-b pb-4">
						<CardTitle className="flex items-center gap-2 text-base">
							<Clock3 className="h-5 w-5" />
							Demandes envoyées
							<Badge
								variant="secondary"
								className="rounded-full"
							>
								{outgoing.length}
							</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 p-4">
						{outgoing.length > 0 ? (
							outgoing.map((request) => {
								const username = request.receiver.username || request.receiver.id;
								const profileHref = `/users/${encodeURIComponent(username)}`;
								return (
									<UserRow
										key={request.id}
										user={request.receiver}
										subtitle="En attente"
										menuContent={
											<>
												<DropdownMenuItem asChild>
													<Link href={profileHref}>Voir le profil</Link>
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<form action={cancelFriendRequest}>
													<input
														type="hidden"
														name="targetUserId"
														value={request.receiver.id}
													/>
													<input
														type="hidden"
														name="username"
														value={username}
													/>
													<DropdownMenuItem asChild>
														<button
															type="submit"
															className="w-full cursor-pointer text-left"
														>
															Annuler la demande
														</button>
													</DropdownMenuItem>
												</form>
												<DropdownMenuSeparator />
												<form action={blockUser}>
													<input
														type="hidden"
														name="targetUserId"
														value={request.receiver.id}
													/>
													<input
														type="hidden"
														name="username"
														value={username}
													/>
													<DropdownMenuItem
														asChild
														className="text-red-600 focus:text-red-600"
													>
														<button
															type="submit"
															className="w-full cursor-pointer text-left"
														>
															Bloquer
														</button>
													</DropdownMenuItem>
												</form>
											</>
										}
									/>
								);
							})
						) : (
							<p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Aucune demande envoyée.</p>
						)}
					</CardContent>
				</Card>
			</div>

			{/* FRIENDS LIST */}
			<Card className="mt-4 rounded-2xl border-0 bg-white shadow-sm">
				<CardHeader className="border-b pb-4">
					<CardTitle className="flex items-center gap-2 text-base">
						<UserCheck className="h-5 w-5" />
						Mes amis
						<Badge className="rounded-full">{friends.length}</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 p-4">
					{friends.length > 0 ? (
						friends.map(({ friendshipId, friend, canMessage }) => {
							const username = friend.username || friend.id;
							const profileHref = `/users/${encodeURIComponent(username)}`;
							return (
								<UserRow
									key={friendshipId}
									user={friend}
									menuContent={
										<>
											<DropdownMenuItem asChild>
												<Link href={profileHref}>Voir le profil</Link>
											</DropdownMenuItem>
											{canMessage ? (
												<DropdownMenuItem asChild>
													<Link href={`/community/messages?composeTo=${encodeURIComponent(username)}`}>Envoyer un message</Link>
												</DropdownMenuItem>
											) : null}
											<DropdownMenuSeparator />
											<form action={unfriendUser}>
												<input
													type="hidden"
													name="targetUserId"
													value={friend.id}
												/>
												<input
													type="hidden"
													name="username"
													value={username}
												/>
												<DropdownMenuItem asChild>
													<button
														type="submit"
														className="w-full cursor-pointer text-left"
													>
														Retirer des amis
													</button>
												</DropdownMenuItem>
											</form>
											<form action={blockUser}>
												<input
													type="hidden"
													name="targetUserId"
													value={friend.id}
												/>
												<input
													type="hidden"
													name="username"
													value={username}
												/>
												<DropdownMenuItem
													asChild
													className="text-red-600 focus:text-red-600"
												>
													<button
														type="submit"
														className="w-full cursor-pointer text-left"
													>
														Bloquer
													</button>
												</DropdownMenuItem>
											</form>
										</>
									}
								/>
							);
						})
					) : (
						<p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Aucun ami pour le moment.</p>
					)}
				</CardContent>
			</Card>

			<div className="mt-4">
				<Button
					asChild
					variant="outline"
				>
					<Link href="/community">Retour à la communauté</Link>
				</Button>
			</div>
		</div>
	);
}
