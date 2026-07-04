import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Building2, Globe, MapPin, MessageCircle, ThumbsUp } from "lucide-react";
import { BiSolidSend } from "react-icons/bi";
import { FaXmark } from "react-icons/fa6";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCommunityEnabled } from "@/lib/platform-settings";
import { formatSocialRelativeTime } from "@/lib/time";
import { CommunityPostComposer } from "@/components/community/community-post-composer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createCommunityComment, deleteCommunityPost, toggleCommunityPostLike } from "../../actions";

export async function generateMetadata({ params }) {
	const { slug } = await params;
	const agency = await prisma.agency.findFirst({
		where: {
			slug: { equals: slug, mode: "insensitive" },
			approved: true,
		},
		select: { name: true, description: true },
	});

	if (!agency) return { title: "Page d'agence introuvable" };

	return {
		title: `${agency.name} | Communauté`,
		description: agency.description || `Page officielle de ${agency.name}`,
	};
}

function initialsFromName(name, email) {
	return (name || email || "U")
		.split(" ")
		.map((s) => s.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export default async function CommunityAgencyPage({ params }) {
	const session = await auth();
	if (!session?.user?.id) redirect("/login");

	const communityEnabled = await getCommunityEnabled();
	if (!communityEnabled) redirect("/community-disabled");

	const { slug } = await params;
	const agency = await prisma.agency.findFirst({
		where: {
			slug: { equals: slug, mode: "insensitive" },
			approved: true,
		},
		select: {
			id: true,
			slug: true,
			name: true,
			description: true,
			logoUrl: true,
			city: true,
			province: true,
			websiteUrl: true,
			adminUserId: true,
			_count: {
				select: {
					members: true,
					communityPosts: true,
				},
			},
		},
	});

	if (!agency) notFound();

	const [currentMember, posts] = await Promise.all([
		prisma.user.findUnique({
			where: { id: session.user.id },
			select: {
				id: true,
				name: true,
				email: true,
				image: true,
				profile: {
					select: {
						agencyId: true,
					},
				},
			},
		}),
		prisma.communityPost.findMany({
			where: { agencyId: agency.id },
			orderBy: [{ createdAt: "desc" }],
			take: 20,
			include: {
				author: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
						username: true,
						profile: { select: { jobTitle: true } },
					},
				},
				likes: {
					where: { userId: session.user.id },
					select: { id: true },
				},
				_count: { select: { likes: true, comments: true } },
				comments: {
					orderBy: { createdAt: "asc" },
					take: 6,
					include: {
						author: {
							select: {
								id: true,
								name: true,
								email: true,
								image: true,
								username: true,
							},
						},
					},
				},
			},
		}),
	]);

	const isCommunityAdmin = session.user.role === "ADMIN";
	const isAgencyMember = currentMember?.profile?.agencyId === agency.id;
	const canPostAsAgency = isAgencyMember || isCommunityAdmin;

	return (
		<div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
			{/* AGENCY HEADER */}
			<Card className="overflow-hidden rounded-3xl border-0 bg-white shadow-sm">
				<div className="h-24 bg-linear-to-r from-amber-700 via-amber-500 to-orange-300" />
				<CardContent className="space-y-3 p-5 sm:p-6">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div className="flex items-start gap-3">
							{agency.logoUrl ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={agency.logoUrl}
									alt={agency.name}
									className="-mt-12 h-20 w-20 rounded-2xl border-4 border-white object-cover bg-white"
								/>
							) : (
								<div className="-mt-12 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-muted">
									<Building2 className="h-7 w-7 text-muted-foreground" />
								</div>
							)}
							<div>
								<h1 className="text-xl font-semibold text-foreground sm:text-2xl">{agency.name}</h1>
								<p className="text-sm text-muted-foreground">{[agency.city, agency.province].filter(Boolean).join(", ") || "Agence membre"}</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Button
								asChild
								variant="outline"
								size="sm"
								className="rounded-full"
							>
								<Link href="/community/agencies">Toutes les pages</Link>
							</Button>
							<Button
								asChild
								size="sm"
								className="rounded-full"
							>
								<Link href="/community">Fil communauté</Link>
							</Button>
						</div>
					</div>
					{agency.description ? <p className="whitespace-pre-wrap text-sm text-foreground/90">{agency.description}</p> : null}
					<div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
						<p>{agency._count.members} membre(s)</p>
						<p>{agency._count.communityPosts} publication(s)</p>
						{agency.websiteUrl ? (
							<Link
								href={agency.websiteUrl}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1 transition-colors hover:text-primary"
							>
								<Globe className="h-3.5 w-3.5" />
								Site web
							</Link>
						) : null}
					</div>
				</CardContent>
			</Card>

			{/* AGENCY POST COMPOSER */}
			{canPostAsAgency ? (
				<Card className="rounded-3xl border-0 bg-white shadow-sm">
					<CardContent className="space-y-3 px-5 py-4 sm:px-6">
						<CommunityPostComposer
							user={{ ...currentMember, agencyPostingId: agency.id }}
							placeholder={`Publier sur la page de ${agency.name}`}
							submitLabel="Publier"
							cardStyle="agency"
						/>
					</CardContent>
				</Card>
			) : null}

			{/* AGENCY POSTS */}
			<div className="space-y-4">
				{posts.length === 0 ? (
					<Card className="rounded-3xl border-0 bg-white shadow-sm">
						<CardContent className="p-10 text-center text-sm text-muted-foreground">Aucune publication sur cette page pour le moment.</CardContent>
					</Card>
				) : (
					posts.map((post) => {
						const hasLiked = post.likes.length > 0;
						const canDeletePost = isCommunityAdmin || post.authorId === session.user.id || agency.adminUserId === session.user.id;
						const postAuthorSlug = post.author.username || post.author.id;
						const postAuthorInitials = initialsFromName(post.author.name, post.author.email);

						return (
							<Card
								key={post.id}
								className="overflow-hidden rounded-3xl border-0 bg-white shadow-sm"
							>
								<CardContent className="space-y-5 p-0 pb-2">
									{/* POST HEADER */}
									<div className="group/post flex items-start gap-3 px-5 pt-3 sm:px-6">
										<Link
											href={`/users/${postAuthorSlug}`}
											className="rounded-full transition-all duration-150 hover:opacity-90 hover:ring-2 hover:ring-primary/20"
										>
											<Avatar className="h-12 w-12">
												<AvatarImage src={post.author.image || ""} />
												<AvatarFallback>{postAuthorInitials}</AvatarFallback>
											</Avatar>
										</Link>
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2">
												<Link
													href={`/users/${postAuthorSlug}`}
													className="font-medium text-foreground transition-colors duration-150 hover:text-primary hover:underline"
												>
													{post.author.name || post.author.email}
												</Link>
												<span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
													Publication agence
												</span>
											</div>
											<p className="text-xs text-muted-foreground">
												{formatSocialRelativeTime(post.createdAt)}
												{post.author.profile?.jobTitle ? ` · ${post.author.profile.jobTitle}` : ""}
											</p>
										</div>

										{canDeletePost ? (
											<form action={deleteCommunityPost}>
												<input
													type="hidden"
													name="postId"
													value={post.id}
												/>
												<Button
													type="submit"
													variant="ghost"
													className="absolute right-3 top-3 rounded-full bg-transparent text-neutral-400 opacity-0 transition-all group-hover/post:opacity-100 group-focus-within/post:opacity-100 hover:bg-transparent hover:text-neutral-800"
												>
													<FaXmark className="h-6 w-6" />
												</Button>
											</form>
										) : null}
									</div>

									{/* POST CONTENT */}
									<div className="space-y-3 px-5 sm:px-6">
										<p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">{post.content}</p>
										{post.imageUrl ? (
											<div className="overflow-hidden rounded-xl border bg-muted">
												{/* eslint-disable-next-line @next/next/no-img-element */}
												<img
													src={post.imageUrl}
													alt="Illustration de publication"
													className="max-h-105 w-full object-cover"
												/>
											</div>
										) : null}
									</div>

									{/* POST ACTIONS */}
									<div className="flex flex-wrap items-center gap-4 border-t px-6 pt-4">
										<form action={toggleCommunityPostLike.bind(null, post.id)}>
											<Button
												size="sm"
												variant={hasLiked ? "default" : "outline"}
												className="rounded-full"
											>
												<ThumbsUp className="h-3.5 w-3.5" />
												J&apos;aime · {post._count.likes}
											</Button>
										</form>
										<p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
											<MessageCircle className="h-3.5 w-3.5" />
											{post._count.comments} commentaire(s)
										</p>
									</div>

									{/* POST COMMENTS */}
									<div className="space-y-2 px-5 sm:px-6">
										{post.comments.map((comment) => (
											<div
												key={comment.id}
												className="mb-5 rounded-2xl border bg-neutral-100 p-3 shadow-inner"
											>
												<p className="mb-1 text-xs text-muted-foreground">
													{comment.author.name || comment.author.email} · {formatSocialRelativeTime(comment.createdAt)}
												</p>
												<p className="whitespace-pre-wrap text-sm">{comment.content}</p>
											</div>
										))}
										<form
											action={createCommunityComment}
											className="relative flex h-8 items-center gap-2 py-2"
										>
											<Avatar className="h-8 w-8">
												<AvatarImage src={session.user.image || ""} />
												<AvatarFallback>{initialsFromName(session.user.name, session.user.email)}</AvatarFallback>
											</Avatar>
											<input
												type="hidden"
												name="postId"
												value={post.id}
											/>
											<Input
												name="content"
												placeholder="Laisser un commentaire..."
												required
												minLength={2}
												maxLength={1500}
												className="h-8 rounded-full bg-neutral-100 px-3 shadow-inner focus:ring-0 focus-visible:ring-0"
											/>
											<Button
												type="submit"
												variant="ghost"
												className="absolute right-0 top-1/2 rounded-lg bg-transparent px-4 text-neutral-400 transition-all hover:bg-transparent hover:text-neutral-800"
											>
												<BiSolidSend className="h-6 w-6" />
											</Button>
										</form>
									</div>
								</CardContent>
							</Card>
						);
					})
				)}
			</div>
		</div>
	);
}
