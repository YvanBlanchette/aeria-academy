import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCommunityEnabled } from "@/lib/platform-settings";
import { formatSocialRelativeTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { CommunityPostComposer } from "@/components/community/community-post-composer";
import { CommunityStoriesStrip } from "@/components/community/community-stories-strip";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, ThumbsUp } from "lucide-react";
import { BiSolidSend } from "react-icons/bi";
import { FaXmark } from "react-icons/fa6";
import {
	createCommunityComment,
	deleteCommunityComment,
	deleteCommunityPost,
	toggleCommunityPostLike,
	updateCommunityComment,
	updateCommunityPost,
} from "./actions";

export const metadata = {
	title: "Communauté | ÆRIA Voyages Academy",
	description: "Fil de la communauté ÆRIA Voyages",
};

const PAGE_SIZE = 10;

function normalizePage(value) {
	const parsed = Number.parseInt(String(value || "1"), 10);
	if (Number.isNaN(parsed) || parsed < 1) return 1;
	return parsed;
}

function normalizeFocusPost(value) {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	return trimmed;
}

function normalizeQuery(value) {
	if (typeof value !== "string") return "";
	return value.trim();
}

function initialsFromName(name, email) {
	return (name || email || "U")
		.split(" ")
		.map((s) => s.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export default async function CommunityPage({ searchParams }) {
	const session = await auth();
	if (!session?.user?.id) redirect("/login?callbackUrl=/community");
	const communityEnabled = await getCommunityEnabled();
	if (!communityEnabled) redirect("/community-disabled");
	const resolvedSearchParams = await searchParams;
	const focusPostId = normalizeFocusPost(resolvedSearchParams?.focusPost);
	const query = normalizeQuery(resolvedSearchParams?.q);
	const postWhere = query
		? {
				content: {
					contains: query,
					mode: "insensitive",
				},
			}
		: undefined;

	if (focusPostId && !resolvedSearchParams?.page) {
		const focusedPost = await prisma.communityPost.findUnique({
			where: { id: focusPostId },
			select: { createdAt: true },
		});

		if (focusedPost) {
			const newerPostsCount = await prisma.communityPost.count({
				where: { createdAt: { gt: focusedPost.createdAt } },
			});
			const targetPage = Math.floor(newerPostsCount / PAGE_SIZE) + 1;
			const targetParams = new URLSearchParams();
			if (targetPage > 1) targetParams.set("page", String(targetPage));
			const targetQuery = targetParams.toString();
			const targetPath = targetQuery ? `/community?${targetQuery}#post-${focusPostId}` : `/community#post-${focusPostId}`;
			redirect(targetPath);
		}
	}

	const page = normalizePage(resolvedSearchParams?.page);
	const skip = (page - 1) * PAGE_SIZE;

	const hrefWith = ({ nextPage = page } = {}) => {
		const params = new URLSearchParams();
		if (query) params.set("q", query);
		if (nextPage > 1) params.set("page", String(nextPage));
		const query = params.toString();
		return query ? `/community?${query}` : "/community";
	};

	const userId = session.user.id;
	const isAdmin = session.user.role === "ADMIN";

	const [posts, totalPosts, currentMember, communityStories] = await Promise.all([
		prisma.communityPost.findMany({
			where: postWhere,
			orderBy: [{ createdAt: "desc" }],
			take: PAGE_SIZE,
			skip,
			include: {
				author: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
						username: true,
						profile: { select: { publicProfile: true, jobTitle: true, company: true } },
					},
				},
				likes: {
					where: { userId },
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
								profile: { select: { publicProfile: true } },
							},
						},
					},
				},
			},
		}),
		prisma.communityPost.count({ where: postWhere }),
		prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				email: true,
				image: true,
				username: true,
				profile: {
					select: {
						jobTitle: true,
						company: true,
					},
				},
			},
		}),
		prisma.communityStory.findMany({
			where: {
				expiresAt: { gt: new Date() },
			},
			orderBy: [{ createdAt: "desc" }],
			include: {
				author: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
						username: true,
						profile: { select: { publicProfile: true, jobTitle: true, company: true } },
					},
				},
				views: {
					where: { userId },
					select: { id: true },
				},
			},
		}),
	]);

	const totalPages = Math.max(1, Math.ceil(totalPosts / PAGE_SIZE));
	const hasPrevPage = page > 1;
	const hasNextPage = page < totalPages;

	return (
		<div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
			<div className="space-y-5">
				<Card className="overflow-hidden rounded-3xl border-0 bg-white shadow-sm">
					<CardContent className="space-y-3 px-5 py-4 sm:px-6 sm:py-4">
						<CommunityPostComposer
							user={currentMember}
							placeholder="Qu'est-ce que tu veux partager avec la communauté aujourd'hui ?"
							submitLabel="Publier"
						/>
					</CardContent>
				</Card>

				<CardContent className="">
					<CommunityStoriesStrip
						stories={communityStories}
						currentUser={currentMember}
					/>
				</CardContent>

				<div className="space-y-4">
					{posts.length === 0 ? (
						// POSTS EMPTY STATE
						<Card className="rounded-3xl border-0 bg-white shadow-sm">
							<CardContent className="p-12 text-center text-muted-foreground">
								{query ? `Aucun resultat pour "${query}".` : "Aucune publication pour le moment. Sois la première personne à lancer une discussion."}
							</CardContent>
						</Card>
					) : (
						// POSTS LIST
						posts.map((post) => {
							const hasLiked = post.likes.length > 0;
							const canModeratePost = isAdmin || post.authorId === userId;
							const authorInitials = initialsFromName(post.author.name, post.author.email);
							const postAuthorSlug = post.author.username || post.author.id;
							const canVisitPostAuthorProfile = Boolean(postAuthorSlug);
							const PostAuthorLinkWrapper = canVisitPostAuthorProfile ? Link : "div";
							return (
								// POST
								<Card
									id={`post-${post.id}`}
									key={post.id}
									className="overflow-hidden rounded-3xl border-0 bg-white shadow-sm relative"
								>
									<CardContent className="space-y-5 p-0 pb-2">
										{/* POST HEADER */}
										<div className=" group/post flex items-start gap-3 px-5 pt-3 sm:px-6">
											<PostAuthorLinkWrapper
												{...(canVisitPostAuthorProfile
													? {
															href: `/users/${postAuthorSlug}`,
															className: "rounded-full transition-all duration-150 hover:opacity-90 hover:ring-2 hover:ring-primary/20",
														}
													: {
															className: "rounded-full",
														})}
											>
												<Avatar className="h-12 w-12">
													<AvatarImage src={post.author.image || ""} />
													<AvatarFallback>{authorInitials}</AvatarFallback>
												</Avatar>
											</PostAuthorLinkWrapper>
											<div className="min-w-0 flex-1">
												<div className="flex flex-wrap items-center gap-2">
													{canVisitPostAuthorProfile ? (
														<Link
															href={`/users/${postAuthorSlug}`}
															className="font-medium text-foreground transition-colors duration-150 hover:text-primary hover:underline"
														>
															{post.author.name || post.author.email}
														</Link>
													) : (
														<p className="font-medium">{post.author.name || post.author.email}</p>
													)}
												</div>
												<p className="text-xs text-muted-foreground">
													{formatSocialRelativeTime(post.createdAt)}
													{post.author.profile?.jobTitle ? ` · ${post.author.profile.jobTitle}` : ""}
												</p>
											</div>

											{canModeratePost ? (
												<form action={deleteCommunityPost}>
													<input
														type="hidden"
														name="postId"
														value={post.id}
													/>
													<Button
														type="submit"
														variant="ghost"
														className="rounded-full absolute right-3 top-3 text-neutral-400 hover:text-neutral-800 transition-all opacity-0 group-hover/post:opacity-100 bg-transparent hover:bg-transparent"
													>
														<FaXmark className="h-6 w-6" />
													</Button>
												</form>
											) : null}
										</div>

										{/* POST CONTENT */}
										<div className="space-y-3 px-5 sm:px-6">
											{/* POST TEXT */}
											<p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">{post.content}</p>

											{/* POST IMAGE */}
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
										<div className="flex flex-wrap items-center gap-4 border-t pt-4 px-6">
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
											<p className="text-xs text-muted-foreground inline-flex items-center gap-1">
												<MessageCircle className="h-3.5 w-3.5" />
												{post._count.comments} commentaire(s)
											</p>
										</div>

										{/* POST COMMENTS */}
										<div className="space-y-2 px-5 sm:px-6">
											{post.comments.map((comment) => {
												const canModerateComment = isAdmin || comment.authorId === userId;
												const commentAuthorInitials = initialsFromName(comment.author.name, comment.author.email);
												const commentAuthorSlug = comment.author.username || comment.author.id;
												const canVisitCommentAuthorProfile = Boolean(commentAuthorSlug);
												const CommentAuthorLinkWrapper = canVisitCommentAuthorProfile ? Link : "div";
												return (
													<div
														key={comment.id}
														className="rounded-2xl border bg-neutral-100 shadow-inner p-3 relative group/comment mb-5"
													>
														<div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
															<CommentAuthorLinkWrapper
																{...(canVisitCommentAuthorProfile
																	? {
																			href: `/users/${commentAuthorSlug}`,
																			className: "rounded-full transition-all duration-150 hover:opacity-90 hover:ring-2 hover:ring-primary/20",
																		}
																	: {
																			className: "rounded-full",
																		})}
															>
																<Avatar className="h-5 w-5">
																	<AvatarImage src={comment.author.image || ""} />
																	<AvatarFallback>{commentAuthorInitials}</AvatarFallback>
																</Avatar>
															</CommentAuthorLinkWrapper>
															{canVisitCommentAuthorProfile ? (
																<Link
																	href={`/users/${commentAuthorSlug}`}
																	className="font-medium text-foreground transition-colors duration-150 hover:text-primary hover:underline"
																>
																	{comment.author.name || comment.author.email}
																</Link>
															) : (
																<span>{comment.author.name || comment.author.email}</span>
															)}
															<span>· {formatSocialRelativeTime(comment.createdAt)}</span>
														</div>
														<p className="text-sm whitespace-pre-wrap">{comment.content}</p>
														{canModerateComment ? (
															<div className="mt-2 flex flex-wrap items-center gap-2">
																{/* <details className="rounded-lg border px-3 py-1.5 text-xs">
																	<summary className="cursor-pointer">Edit</summary>
																	<form
																		action={updateCommunityComment}
																		className="mt-2 flex items-center gap-2"
																	>
																		<input
																			type="hidden"
																			name="commentId"
																			value={comment.id}
																		/>
																		<Input
																			name="content"
																			defaultValue={comment.content}
																			required
																			minLength={2}
																			maxLength={1500}
																		/>
																		<Button
																			type="submit"
																			size="sm"
																			variant="secondary"
																			className="rounded-full"
																		>
																			OK
																		</Button>
																	</form>
																</details> */}
																<form
																	action={deleteCommunityComment}
																	className=""
																>
																	<input
																		type="hidden"
																		name="commentId"
																		value={comment.id}
																	/>
																	<Button
																		type="submit"
																		variant="ghost"
																		className="opacity-0 group-hover/comment:opacity-100 transition-all rounded-full absolute right-1 top-1 text-neutral-400 hover:text-neutral-800"
																	>
																		<FaXmark className="h-4 w-4" />
																	</Button>
																</form>
															</div>
														) : null}
													</div>
												);
											})}

											{/* COMMENT FORM */}
											<form
												action={createCommunityComment}
												className="flex items-center gap-2 py-2 relative h-8"
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
													className="bg-neutral-100 shadow-inner rounded-full px-3 h-8 active:ring-0 focus:ring-0 focus-visible:ring-0"
												/>
												<Button
													type="submit"
													variant="ghost"
													className="rounded-lg px-4 bg-transparent absolute right-0 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-800 hover:bg-transparent transition-all"
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

				{totalPages > 1 ? (
					<Card className="rounded-3xl border-0 bg-white shadow-sm">
						<CardContent className="flex items-center justify-between p-5">
							{hasPrevPage ? (
								<Button
									asChild
									variant="outline"
									size="sm"
									className="rounded-full"
								>
									<Link href={hrefWith({ nextPage: page - 1 })}>Précédent</Link>
								</Button>
							) : (
								<span className="text-sm text-muted-foreground">Précédent</span>
							)}

							<p className="text-sm text-muted-foreground">
								Page {page} sur {totalPages}
							</p>

							{hasNextPage ? (
								<Button
									asChild
									variant="outline"
									size="sm"
									className="rounded-full"
								>
									<Link href={hrefWith({ nextPage: page + 1 })}>Suivant</Link>
								</Button>
							) : (
								<span className="text-sm text-muted-foreground">Suivant</span>
							)}
						</CardContent>
					</Card>
				) : null}
			</div>
		</div>
	);
}
