import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Clock3, MessageSquare, UserCheck, UserPlus, X } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canUserMessageTarget } from "@/lib/social-graph";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function UserRow({ user, actions, subtitle, rightContent }) {
	const initials = initialsFromName(user?.name, user?.email);
	const profileHref = user?.username ? `/users/${user.username}` : null;

	return (
		<div className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3">
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
				{rightContent}
				{profileHref ? (
					<Button
						asChild
						variant="outline"
						size="sm"
					>
						<Link href={profileHref}>Profil</Link>
					</Button>
				) : null}
				{actions}
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
	const now = new Date();

	await prisma.communityNotification.updateMany({
		where: {
			recipientId: userId,
			type: "FRIEND_REQUEST",
			isRead: false,
		},
		data: {
			isRead: true,
			readAt: now,
		},
	});

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

	const friends = await Promise.all(
		friendships.map(async (friendship) => {
			const friend = friendship.userA.id === userId ? friendship.userB : friendship.userA;
			const canMessage = await canUserMessageTarget({
				senderId: userId,
				targetUserId: friend.id,
				targetMessagePermissionScope: friend.profile?.messagePermissionScope || "EVERYONE",
			});
			return { friendshipId: friendship.id, friend, canMessage };
		}),
	);

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
								return (
									<UserRow
										key={request.id}
										user={request.sender}
										subtitle="Veut devenir ton ami"
										actions={
											<>
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
													<Button
														type="submit"
														size="sm"
													>
														<Check className="mr-1.5 h-3.5 w-3.5" />
														Accepter
													</Button>
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
													<Button
														type="submit"
														variant="outline"
														size="sm"
													>
														<X className="mr-1.5 h-3.5 w-3.5" />
														Refuser
													</Button>
												</form>
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
													<Button
														type="submit"
														variant="outline"
														size="sm"
													>
														Bloquer
													</Button>
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
								return (
									<UserRow
										key={request.id}
										user={request.receiver}
										subtitle="En attente"
										actions={
											<>
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
													<Button
														type="submit"
														variant="outline"
														size="sm"
													>
														Annuler
													</Button>
												</form>
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
													<Button
														type="submit"
														variant="outline"
														size="sm"
													>
														Bloquer
													</Button>
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
							return (
								<UserRow
									key={friendshipId}
									user={friend}
									rightContent={
										canMessage ? (
											<Button
												asChild
												variant="outline"
												size="sm"
											>
												<Link href={`/community/messages?composeTo=${encodeURIComponent(username)}`}>
													<MessageSquare className="mr-1.5 h-3.5 w-3.5" />
													Message
												</Link>
											</Button>
										) : null
									}
									actions={
										<>
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
												<Button
													type="submit"
													variant="outline"
													size="sm"
												>
													Retirer
												</Button>
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
												<Button
													type="submit"
													variant="outline"
													size="sm"
												>
													Bloquer
												</Button>
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
