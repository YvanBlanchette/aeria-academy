import Link from "next/link";
import { notFound } from "next/navigation";
import { Search, UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewerSeeUserProfile } from "@/lib/social-graph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function initialsFromName(name, email) {
	return (name || email || "U")
		.split(" ")
		.map((s) => s.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export async function generateMetadata({ params }) {
	const { username } = await params;
	return {
		title: `Relations de @${username} | ÆRIA`,
	};
}

export default async function PublicFollowingPage({ params }) {
	const { username } = await params;
	const session = await auth();
	const currentUserId = session?.user?.id || null;

	const targetUser = await prisma.user.findFirst({
		where: {
			OR: [{ username: { equals: username, mode: "insensitive" } }, { id: username }],
		},
		select: {
			id: true,
			username: true,
			name: true,
			profile: { select: { publicProfile: true, profileVisibilityScope: true } },
		},
	});

	const visibilityScope = targetUser?.profile?.profileVisibilityScope || (targetUser?.profile?.publicProfile ? "PUBLIC" : "MEMBERS");
	const canViewProfile = targetUser
		? await canViewerSeeUserProfile({
				viewerId: currentUserId,
				targetUserId: targetUser.id,
				targetProfileVisibilityScope: visibilityScope,
			})
		: false;

	if (!targetUser || !canViewProfile) {
		notFound();
	}

	const following = await prisma.userFriendship.findMany({
		where: {
			OR: [{ userAId: targetUser.id }, { userBId: targetUser.id }],
		},
		orderBy: { createdAt: "desc" },
		take: 100,
		include: {
			userA: {
				select: {
					id: true,
					name: true,
					email: true,
					username: true,
					image: true,
					profile: { select: { publicProfile: true, jobTitle: true, company: true } },
				},
			},
			userB: {
				select: {
					id: true,
					name: true,
					email: true,
					username: true,
					image: true,
					profile: { select: { publicProfile: true, jobTitle: true, company: true } },
				},
			},
		},
	});

	return (
		<div className="min-h-screen bg-[#f0f2f5] pb-12 pt-8">
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<Card className="overflow-hidden rounded-3xl border-0 bg-white shadow-sm">
					<CardHeader className="border-b bg-white px-6 py-5">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<CardTitle className="text-2xl">Relations</CardTitle>
								<p className="mt-1 text-sm text-muted-foreground">
									{following.length} ami(s) pour {targetUser.name || `@${targetUser.username}`}
								</p>
							</div>
							<div className="flex items-center gap-3 rounded-full bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
								<Search className="h-4 w-4" />
								<span>Découvrir des profils</span>
							</div>
						</div>
					</CardHeader>
					<CardContent className="p-4 sm:p-6">
						<div className="mb-5 flex flex-wrap items-center gap-2 border-b pb-4">
							<Badge
								variant="outline"
								className="rounded-full px-3 py-1"
							>
								<Link href={`/users/${targetUser.username || username}/followers`}>Amis</Link>
							</Badge>
							<Badge className="rounded-full px-3 py-1">Relations</Badge>
						</div>

						{following.length === 0 ? (
							<div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center text-muted-foreground">
								<UserPlus className="mx-auto mb-3 h-8 w-8 opacity-50" />
								<p>Aucune relation pour le moment.</p>
							</div>
						) : (
							<div className="grid gap-4 md:grid-cols-2">
								{following.map((item) => {
									const f = item.userA.id === targetUser.id ? item.userB : item.userA;
									const initials = initialsFromName(f.name, f.email);
									return (
										<div
											key={item.id}
											className="rounded-2xl border bg-background p-4 transition-colors hover:bg-muted/20"
										>
											<div className="flex items-start justify-between gap-3">
												<div className="flex min-w-0 items-center gap-3">
													<Avatar className="h-14 w-14 rounded-2xl">
														<AvatarImage src={f.image || ""} />
														<AvatarFallback>{initials}</AvatarFallback>
													</Avatar>
													<div className="min-w-0">
														<p className="truncate text-base font-semibold text-foreground">{f.name || f.email}</p>
														{f.profile?.jobTitle ? (
															<p className="truncate text-sm text-muted-foreground">
																{f.profile.jobTitle}
																{f.profile.company ? ` • ${f.profile.company}` : ""}
															</p>
														) : (
															<p className="text-sm text-muted-foreground">Membre de la communauté</p>
														)}
													</div>
												</div>
												{f.profile?.publicProfile && f.username ? (
													<Button
														asChild
														size="sm"
														variant="outline"
														className="rounded-full"
													>
														<Link href={`/users/${f.username}`}>Voir profil</Link>
													</Button>
												) : (
													<Badge
														variant="outline"
														className="rounded-full"
													>
														Profil privé
													</Badge>
												)}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
