import { notFound } from "next/navigation";
import Link from "next/link";
import {
	Mail,
	Phone,
	MapPin,
	Globe,
	Building2,
	CalendarDays,
	MessageSquare,
	ThumbsUp,
	PencilLine,
	Users,
	UserPlus,
	BriefcaseBusiness,
	GraduationCap,
	Ellipsis,
} from "lucide-react";
import { FaFacebookF, FaLinkedinIn, FaInstagram, FaYoutube, FaXTwitter, FaTiktok } from "react-icons/fa6";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizePublicVisibility } from "@/lib/profile-visibility";
import { canUserMessageTarget, canViewerSeeUserProfile, normalizeFriendshipPair } from "@/lib/social-graph";
import { formatSocialRelativeTime } from "@/lib/time";
import { CommunityPostComposer } from "@/components/community/community-post-composer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ProfileCoverControls } from "@/components/profile/profile-cover-controls";
import { acceptFriendRequest, blockUser, cancelFriendRequest, declineFriendRequest, sendFriendRequest, unblockUser, unfriendUser } from "./actions";

const SOCIAL_ICONS = {
	facebook: FaFacebookF,
	linkedin: FaLinkedinIn,
	instagram: FaInstagram,
	youtube: FaYoutube,
	twitter: FaXTwitter,
	tiktok: FaTiktok,
};

const SOCIAL_LABELS = {
	facebook: "Facebook",
	linkedin: "LinkedIn",
	instagram: "Instagram",
	youtube: "YouTube",
	twitter: "Twitter/X",
	tiktok: "TikTok",
};

function memberSinceLabel(dateValue) {
	if (!dateValue) return null;
	return new Date(dateValue).toLocaleDateString("fr-CA", {
		year: "numeric",
		month: "long",
	});
}

export async function generateMetadata({ params }) {
	const { username } = await params;
	const user = await prisma.user.findFirst({
		where: {
			OR: [{ username: { equals: username, mode: "insensitive" } }, { id: username }],
		},
		include: { profile: { include: { agency: true } } },
	});

	if (!user) {
		return { title: "Profil introuvable" };
	}

	return {
		title: `${user.name} | ÆRIA Voyages Academy`,
		description: user.profile?.bio?.slice(0, 160) || `Profil de ${user.name}`,
	};
}

export default async function PublicProfilePage({ params }) {
	const { username } = await params;
	const session = await auth();
	const currentUserId = session?.user?.id || null;

	const user = await prisma.user.findFirst({
		where: {
			OR: [{ username: { equals: username, mode: "insensitive" } }, { id: username }],
		},
		include: {
			profile: {
				include: { agency: true },
			},
		},
	});

	const visibilityScope = user?.profile?.profileVisibilityScope || (user?.profile?.publicProfile ? "PUBLIC" : "MEMBERS");
	const canViewProfile = user
		? await canViewerSeeUserProfile({
				viewerId: currentUserId,
				targetUserId: user.id,
				targetProfileVisibilityScope: visibilityScope,
			})
		: false;

	if (!user || !canViewProfile) {
		notFound();
	}

	const profile = user.profile ?? {};
	const agency = profile.agency ?? null;
	const socialLinks = profile.socialLinks && typeof profile.socialLinks === "object" ? profile.socialLinks : {};
	const publicVisibility = normalizePublicVisibility(profile.publicVisibility ?? null);
	const memberSince = memberSinceLabel(user.createdAt);
	const profileUsername = user.username || username;

	const [
		communityPostsCount,
		communityCommentsCount,
		receivedLikesCount,
		friendsCount,
		recentPosts,
		recentCertificates,
		friendshipRecord,
		outgoingFriendRequest,
		incomingFriendRequest,
		blockByCurrentUser,
		blockByTargetUser,
		canMessageTarget,
	] = await Promise.all([
		prisma.communityPost.count({ where: { authorId: user.id } }),
		prisma.communityComment.count({ where: { authorId: user.id } }),
		prisma.communityPostLike.count({ where: { post: { authorId: user.id } } }),
		prisma.userFriendship.count({
			where: {
				OR: [{ userAId: user.id }, { userBId: user.id }],
			},
		}),
		prisma.communityPost.findMany({
			where: { authorId: user.id },
			orderBy: { createdAt: "desc" },
			take: 10,
			select: {
				id: true,
				content: true,
				imageUrl: true,
				createdAt: true,
				_count: { select: { likes: true, comments: true } },
			},
		}),
		prisma.certificate.findMany({
			where: { userId: user.id },
			orderBy: { issuedAt: "desc" },
			take: 4,
			include: {
				course: { select: { title: true } },
			},
		}),
		currentUserId
			? prisma.userFriendship.findUnique({
					where: {
						userAId_userBId: {
							userAId: normalizeFriendshipPair(currentUserId, user.id)[0],
							userBId: normalizeFriendshipPair(currentUserId, user.id)[1],
						},
					},
					select: { id: true },
				})
			: Promise.resolve(null),
		currentUserId
			? prisma.userFriendRequest.findFirst({
					where: {
						senderId: currentUserId,
						receiverId: user.id,
						status: "PENDING",
					},
					select: { id: true },
				})
			: Promise.resolve(null),
		currentUserId
			? prisma.userFriendRequest.findFirst({
					where: {
						senderId: user.id,
						receiverId: currentUserId,
						status: "PENDING",
					},
					select: { id: true },
				})
			: Promise.resolve(null),
		currentUserId
			? prisma.userBlock.findFirst({
					where: {
						blockerId: currentUserId,
						blockedId: user.id,
					},
					select: { id: true },
				})
			: Promise.resolve(null),
		currentUserId
			? prisma.userBlock.findFirst({
					where: {
						blockerId: user.id,
						blockedId: currentUserId,
					},
					select: { id: true },
				})
			: Promise.resolve(null),
		currentUserId
			? canUserMessageTarget({
					senderId: currentUserId,
					targetUserId: user.id,
					targetMessagePermissionScope: user.profile?.messagePermissionScope || "EVERYONE",
				})
			: Promise.resolve(false),
	]);

	const isOwnProfile = !!currentUserId && currentUserId === user.id;
	const isFriend = !!friendshipRecord;
	const hasOutgoingFriendRequest = !!outgoingFriendRequest;
	const hasIncomingFriendRequest = !!incomingFriendRequest;
	const isBlockedByMe = !!blockByCurrentUser;
	const isBlockedByTarget = !!blockByTargetUser;
	const loginCallbackUrl = `/login?callbackUrl=/users/${profileUsername}`;
	const showJobTitle = isOwnProfile || publicVisibility.showJobTitle;
	const showCompany = isOwnProfile || publicVisibility.showCompany;
	const showBio = isOwnProfile || publicVisibility.showBio;
	const showWebsite = isOwnProfile || publicVisibility.showWebsite;
	const showSocialLinks = isOwnProfile || publicVisibility.showSocialLinks;
	const showAgency = isOwnProfile || publicVisibility.showAgency;
	const showCommunityStats = isOwnProfile || publicVisibility.showCommunityStats;
	const showCommunityPosts = isOwnProfile || publicVisibility.showCommunityPosts;
	const showCertificates = isOwnProfile || publicVisibility.showCertificates;
	const showFollowStats = isOwnProfile || publicVisibility.showFollowStats;
	const hasVisibleLinks = (showWebsite && profile.websiteUrl) || (showSocialLinks && Object.keys(socialLinks).length > 0);
	const hasPrivateContact = isOwnProfile && (user.email || profile.phone || profile.address || profile.city || profile.country || profile.postalCode);
	const profileTabs = [
		{ label: "Profil", href: `/users/${profileUsername}` },
		{ label: "Amis", href: `/users/${profileUsername}/followers` },
		{ label: "Relations", href: `/users/${profileUsername}/following` },
	];

	const initials = (user.name || user.email)
		.split(" ")
		.map((s) => s.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return (
		<div className="min-h-screen bg-[#f0f2f5] pb-12">
			<div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
				<section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
					<div className="relative h-64 bg-linear-to-r from-slate-900 via-amber-700 to-orange-300 sm:h-80 lg:h-96">
						{profile.coverImage ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={profile.coverImage}
								alt={`Couverture de ${user.name}`}
								className="h-full w-full object-cover"
							/>
						) : null}
						<div className="absolute inset-0 bg-linear-to-t from-black/45 via-black/10 to-transparent" />
						{isOwnProfile ? (
							<div className="absolute bottom-4 right-4 z-10">
								<ProfileCoverControls hasCover={Boolean(profile.coverImage)} />
							</div>
						) : null}
					</div>

					<div className="relative px-4 pb-5 sm:px-6 lg:px-8">
						<div className="-mt-16 flex flex-col gap-4 md:-mt-20 md:flex-row md:items-end md:justify-between">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-end">
								<Avatar className="h-32 w-32 border-4 border-white shadow-lg sm:h-40 sm:w-40">
									<AvatarImage
										src={user.image}
										alt={user.name}
									/>
									<AvatarFallback className="text-4xl">{initials}</AvatarFallback>
								</Avatar>

								<div className="space-y-1 pt-2 sm:pt-8 mt-14">
									<h1 className="text-3xl font-bold tracking-tight leading-tight text-foreground sm:text-4xl">{user.name}</h1>
									{showJobTitle && profile.jobTitle ? (
										<p className="text-base text-muted-foreground sm:text-lg">
											{profile.jobTitle}
											{showCompany && profile.company ? ` chez ${profile.company}` : ""}
										</p>
									) : null}
									<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
										{memberSince ? (
											<span className="inline-flex items-center gap-1">
												<CalendarDays className="h-4 w-4" />
												Membre depuis {memberSince}
											</span>
										) : null}
										{profile.city || profile.province || profile.country ? (
											<span className="inline-flex items-center gap-1">
												<MapPin className="h-4 w-4" />
												{[profile.city, profile.province, profile.country].filter(Boolean).join(", ")}
											</span>
										) : null}
									</div>
								</div>
							</div>

							<div className="flex flex-wrap items-center gap-2 md:justify-end">
								{isOwnProfile ? (
									<>
										<Button
											asChild
											variant="outline"
										>
											<Link href="/profile">Modifier le profil</Link>
										</Button>
									</>
								) : !currentUserId ? (
									<Button asChild>
										<Link href={loginCallbackUrl}>Se connecter pour interagir</Link>
									</Button>
								) : isBlockedByTarget ? (
									<Badge
										variant="secondary"
										className="rounded-full"
									>
										Tu ne peux pas interagir avec ce profil
									</Badge>
								) : isBlockedByMe ? (
									<form action={unblockUser}>
										<input
											type="hidden"
											name="targetUserId"
											value={user.id}
										/>
										<input
											type="hidden"
											name="username"
											value={profileUsername}
										/>
										<Button
											type="submit"
											variant="outline"
										>
											Débloquer
										</Button>
									</form>
								) : isFriend ? (
									<DropdownMenu modal={false}>
										<DropdownMenuTrigger asChild>
											<Button
												variant="outline"
												size="icon"
												className="rounded-full"
												aria-label="Actions du profil"
											>
												<Ellipsis className="h-5 w-5" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent
											align="end"
											className="w-56"
										>
											{canMessageTarget ? (
												<DropdownMenuItem asChild>
													<Link href={`/community/messages?composeTo=${encodeURIComponent(profileUsername)}`}>Message</Link>
												</DropdownMenuItem>
											) : null}
											{canMessageTarget ? <DropdownMenuSeparator /> : null}
											<form action={unfriendUser}>
												<input
													type="hidden"
													name="targetUserId"
													value={user.id}
												/>
												<input
													type="hidden"
													name="username"
													value={profileUsername}
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
													value={user.id}
												/>
												<input
													type="hidden"
													name="username"
													value={profileUsername}
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
										</DropdownMenuContent>
									</DropdownMenu>
								) : hasIncomingFriendRequest ? (
									<div className="flex flex-wrap items-center gap-2">
										<form action={acceptFriendRequest}>
											<input
												type="hidden"
												name="targetUserId"
												value={user.id}
											/>
											<input
												type="hidden"
												name="username"
												value={profileUsername}
											/>
											<Button type="submit">Accepter</Button>
										</form>
										<form action={declineFriendRequest}>
											<input
												type="hidden"
												name="targetUserId"
												value={user.id}
											/>
											<input
												type="hidden"
												name="username"
												value={profileUsername}
											/>
											<Button
												type="submit"
												variant="outline"
											>
												Refuser
											</Button>
										</form>
									</div>
								) : hasOutgoingFriendRequest ? (
									<form action={cancelFriendRequest}>
										<input
											type="hidden"
											name="targetUserId"
											value={user.id}
										/>
										<input
											type="hidden"
											name="username"
											value={profileUsername}
										/>
										<Button
											type="submit"
											variant="outline"
										>
											Demande envoyée (annuler)
										</Button>
									</form>
								) : (
									<div className="flex flex-wrap items-center gap-2">
										{canMessageTarget ? (
											<Button
												asChild
												variant="outline"
											>
												<Link href={`/community/messages?composeTo=${encodeURIComponent(profileUsername)}`}>Message</Link>
											</Button>
										) : null}
										<form action={sendFriendRequest}>
											<input
												type="hidden"
												name="targetUserId"
												value={user.id}
											/>
											<input
												type="hidden"
												name="username"
												value={profileUsername}
											/>
											<Button type="submit">Ajouter en ami</Button>
										</form>
									</div>
								)}
							</div>
						</div>

						<div className="mt-5 flex flex-wrap gap-5 border-t pt-4 text-sm text-muted-foreground">
							{showCommunityStats ? (
								<>
									<span className="inline-flex items-center gap-1.5">
										<PencilLine className="h-4 w-4" /> <strong className="text-foreground">{communityPostsCount}</strong> publications
									</span>
									<span className="inline-flex items-center gap-1.5">
										<MessageSquare className="h-4 w-4" /> <strong className="text-foreground">{communityCommentsCount}</strong> commentaires
									</span>
									<span className="inline-flex items-center gap-1.5">
										<ThumbsUp className="h-4 w-4" /> <strong className="text-foreground">{receivedLikesCount}</strong> j&apos;aime reçus
									</span>
								</>
							) : null}
							{showFollowStats ? (
								<>
									<span className="inline-flex items-center gap-1.5">
										<Users className="h-4 w-4" /> <strong className="text-foreground">{friendsCount}</strong> amis
									</span>
								</>
							) : null}
						</div>

						<div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
							{profileTabs.map((tab) => (
								<Button
									key={tab.href}
									asChild
									variant="ghost"
									className="rounded-full"
								>
									<Link href={tab.href}>{tab.label}</Link>
								</Button>
							))}
						</div>
					</div>
				</section>

				<div className="mt-6 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
					<div className="space-y-6">
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-base">À propos</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3 text-sm text-muted-foreground">
								{showBio && profile.bio ? <p className="whitespace-pre-wrap leading-relaxed text-foreground">{profile.bio}</p> : null}
								{showJobTitle && profile.jobTitle ? (
									<p className="inline-flex items-center gap-2">
										<BriefcaseBusiness className="h-4 w-4" /> {profile.jobTitle}
										{showCompany && profile.company ? ` chez ${profile.company}` : ""}
									</p>
								) : null}
								{showAgency && profile.agencyRole && agency ? (
									<p className="inline-flex items-center gap-2">
										<Building2 className="h-4 w-4" /> {profile.agencyRole}
									</p>
								) : null}
								{memberSince ? (
									<p className="inline-flex items-center gap-2">
										<CalendarDays className="h-4 w-4" /> Membre depuis {memberSince}
									</p>
								) : null}
								{!showBio && !showJobTitle && !showAgency && !memberSince ? <p>Aucune information à afficher pour le moment.</p> : null}
							</CardContent>
						</Card>

						{hasPrivateContact ? (
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-base">Coordonnées personnelles</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3 text-sm text-muted-foreground">
									{user.email ? (
										<p className="inline-flex items-center gap-2">
											<Mail className="h-4 w-4" /> {user.email}
										</p>
									) : null}
									{profile.phone ? (
										<p className="inline-flex items-center gap-2">
											<Phone className="h-4 w-4" /> {profile.phone}
										</p>
									) : null}
									{profile.address || profile.city || profile.province || profile.country ? (
										<p className="flex items-start gap-2">
											<MapPin className="mt-0.5 h-4 w-4 shrink-0" />{" "}
											{[profile.address, profile.city, profile.province, profile.country, profile.postalCode].filter(Boolean).join(", ")}
										</p>
									) : null}
								</CardContent>
							</Card>
						) : null}

						{hasVisibleLinks ? (
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-base">Liens</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									{showWebsite && profile.websiteUrl ? (
										<a
											href={profile.websiteUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-3 rounded-xl border p-3 text-sm hover:bg-muted/40"
										>
											<Globe className="h-4 w-4 text-muted-foreground" />
											<span className="truncate">{profile.websiteUrl}</span>
										</a>
									) : null}
									{showSocialLinks
										? Object.entries(socialLinks).map(([platform, url]) => {
												if (!url) return null;
												const Icon = SOCIAL_ICONS[platform];
												const label = SOCIAL_LABELS[platform] || platform;
												return (
													<a
														key={platform}
														href={url}
														target="_blank"
														rel="noopener noreferrer"
														className="flex items-center gap-3 rounded-xl border p-3 text-sm hover:bg-muted/40"
													>
														{Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : <Globe className="h-4 w-4 text-muted-foreground" />}
														<span className="truncate">{label}</span>
													</a>
												);
											})
										: null}
								</CardContent>
							</Card>
						) : null}

						{showAgency && agency && agency.approved ? (
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-base">Agence</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4 text-sm">
									<div className="flex items-start gap-4">
										{agency.logoUrl ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img
												src={agency.logoUrl}
												alt={agency.name}
												className="h-14 w-14 rounded-xl object-cover"
											/>
										) : (
											<div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
												<Building2 className="h-6 w-6 text-muted-foreground" />
											</div>
										)}
										<div>
											<p className="font-medium text-foreground">{agency.name}</p>
											{agency.city || agency.province ? (
												<p className="text-muted-foreground">{[agency.city, agency.province].filter(Boolean).join(", ")}</p>
											) : null}
										</div>
									</div>
									{agency.description ? <p className="whitespace-pre-wrap text-muted-foreground">{agency.description}</p> : null}
								</CardContent>
							</Card>
						) : null}

						{showCertificates && recentCertificates.length > 0 ? (
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-base">Certificats</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									{recentCertificates.map((certificate) => (
										<div
											key={certificate.id}
											className="rounded-xl border p-3"
										>
											<p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
												<GraduationCap className="h-4 w-4" /> {certificate.course.title}
											</p>
											<p className="mt-1 text-xs text-muted-foreground">{new Date(certificate.issuedAt).toLocaleDateString("fr-CA")}</p>
										</div>
									))}
								</CardContent>
							</Card>
						) : null}
					</div>

					<div className="space-y-6">
						{isOwnProfile ? (
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-base">Créer une publication</CardTitle>
								</CardHeader>
								<CardContent>
									<CommunityPostComposer
										user={user}
										placeholder="Quoi de neuf dans ton activité aujourd'hui ?"
										submitLabel="Publier"
										cardStyle="profile"
									/>
								</CardContent>
							</Card>
						) : null}

						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-base">Publications</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{showCommunityPosts ? (
									recentPosts.length === 0 ? (
										<p className="text-sm text-muted-foreground">Aucune publication pour le moment.</p>
									) : (
										recentPosts.map((post) => (
											<Link
												key={post.id}
												href={`/community?focusPost=${post.id}`}
												className="block rounded-2xl border bg-background p-4 transition-colors hover:bg-muted/30"
											>
												<p className="mb-2 text-xs text-muted-foreground">{formatSocialRelativeTime(post.createdAt)}</p>
												<p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{post.content}</p>
												{post.imageUrl ? (
													<div className="mt-3 overflow-hidden rounded-xl border bg-muted">
														{/* eslint-disable-next-line @next/next/no-img-element */}
														<img
															src={post.imageUrl}
															alt="Illustration de publication"
															className="max-h-112 w-full object-cover"
														/>
													</div>
												) : null}
												<p className="mt-3 text-xs text-muted-foreground">
													{post._count.likes} j&apos;aime • {post._count.comments} commentaires
												</p>
											</Link>
										))
									)
								) : (
									<p className="text-sm text-muted-foreground">Les publications de ce membre ne sont pas visibles publiquement.</p>
								)}
							</CardContent>
						</Card>
					</div>
				</div>

				<p className="pt-6 text-center text-xs text-muted-foreground">
					Propulsé par{" "}
					<Link
						href="/"
						className="font-medium hover:underline"
					>
						AERIA Academy
					</Link>
				</p>
			</div>
		</div>
	);
}
