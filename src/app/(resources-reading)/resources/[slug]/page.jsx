import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Calendar, Crown, Lock } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessArticle, articleAccessBlockedInfo } from "@/lib/article-access";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArticleContent } from "@/components/articles/article-content";
import { ResourceReadingShell } from "@/components/resources/resource-reading-shell";
import { ContentProtection } from "@/components/ui/content-protection";

export async function generateMetadata({ params }) {
	const { slug } = await params;
	const article = await prisma.article.findUnique({
		where: { slug },
		select: { title: true, excerpt: true },
	});
	if (!article) return { title: "Article introuvable" };
	return {
		title: `${article.title} | ÆRIA Voyages Academy`,
		description: article.excerpt,
	};
}

const tierBadges = {
	FREE: { label: "Gratuit", variant: "secondary" },
	ACADEMY: { label: "Académie", variant: "default" },
	PRIME: { label: "Prime", variant: "outline" },
};

const PRIMARY_CATEGORY_MARKER = /<!--\s*primary-category:\s*([^>]+?)\s*-->/i;

function splitTagPath(tagName) {
	return tagName
		.split("/")
		.map((part) => part.trim())
		.filter(Boolean);
}

function extractPrimaryCategoryFromContent(content) {
	const match = content?.match(PRIMARY_CATEGORY_MARKER);
	return match?.[1]?.trim() || "";
}

function buildCategoryTree(tags) {
	const root = new Map();

	for (const tag of tags) {
		const parts = splitTagPath(tag.name);
		let level = root;
		let path = "";

		for (const part of parts) {
			path = path ? `${path} / ${part}` : part;
			if (!level.has(part)) {
				level.set(part, {
					name: part,
					path,
					count: 0,
					children: new Map(),
				});
			}

			const node = level.get(part);
			node.count += tag._count?.articles || 0;
			level = node.children;
		}
	}

	function normalize(mapNode) {
		return Array.from(mapNode.values())
			.sort((a, b) => a.name.localeCompare(b.name, "fr"))
			.map((node) => ({
				name: node.name,
				path: node.path,
				count: node.count,
				children: normalize(node.children),
			}));
	}

	return normalize(root);
}

export default async function ArticleDetailPage({ params }) {
	const { slug } = await params;
	const session = await auth();
	if (!session) redirect(`/login?callbackUrl=/resources/${slug}`);

	const article = await prisma.article.findUnique({
		where: { slug },
		include: {
			tags: { include: { tag: true } },
			author: {
				select: {
					name: true,
					image: true,
					username: true,
					profile: { select: { publicProfile: true, jobTitle: true } },
				},
			},
		},
	});

	if (!article || !article.published) notFound();

	const access = canAccessArticle(session.user, article);
	const currentTagIds = article.tags.map((entry) => entry.tagId);
	const primaryCategoryFromContent = extractPrimaryCategoryFromContent(article.content);
	const hierarchicalPaths = article.tags
		.map(({ tag }) => splitTagPath(tag.name))
		.filter((parts) => parts.length > 1)
		.sort((a, b) => b.length - a.length);
	const preferredPath = primaryCategoryFromContent ? splitTagPath(primaryCategoryFromContent) : null;
	const preferredPathKey = preferredPath?.join(" / ");
	const primaryPath = preferredPathKey
		? hierarchicalPaths.find((parts) => parts.join(" / ") === preferredPathKey) || hierarchicalPaths[0] || []
		: hierarchicalPaths[0] || [];
	const activeCategoryPath = primaryPath.length > 0 ? primaryPath.join(" / ") : null;

	const allTags = await prisma.tag.findMany({
		include: { _count: { select: { articles: true } } },
		orderBy: { name: "asc" },
	});
	const categoryTree = buildCategoryTree(allTags);

	const sidebarCategoryResources =
		activeCategoryPath && access.allowed
			? await prisma.article.findMany({
					where: {
						published: true,
						tags: {
							some: {
								tag: {
									name: { startsWith: activeCategoryPath, mode: "insensitive" },
								},
							},
						},
					},
					select: {
						id: true,
						title: true,
						slug: true,
						requiredTier: true,
					},
					orderBy: { publishedAt: "desc" },
					take: 10,
				})
			: [];

	const relatedRaw = await prisma.article.findMany({
		where: {
			published: true,
			id: { not: article.id },
			OR: [{ tags: { some: { tagId: { in: currentTagIds } } } }, { requiredTier: article.requiredTier }],
		},
		include: {
			tags: { include: { tag: true } },
			author: { select: { name: true } },
		},
		orderBy: { publishedAt: "desc" },
		take: 3,
	});

	const relatedArticles = relatedRaw.map((entry) => ({
		article: entry,
		access: canAccessArticle(session.user, entry),
	}));

	if (!access.allowed) {
		const info = articleAccessBlockedInfo(access.reason, article);

		return (
			<div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
				<div className="mb-4">
					<Link
						href="/resources"
						className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"
					>
						<ArrowLeft className="h-4 w-4" />
						Retour aux ressources
					</Link>
				</div>

				<div className="max-w-3xl mx-auto">
					{article.coverImage && (
						<div className="aspect-video w-full overflow-hidden rounded-lg bg-muted mb-6 relative">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={article.coverImage}
								alt={article.title}
								className="h-full w-full object-cover"
							/>
							<div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent" />
						</div>
					)}

					{article.excerpt && <p className="text-lg text-muted-foreground mb-6 leading-relaxed">{article.excerpt}</p>}

					<Card className="border-amber-200 bg-amber-50">
						<CardContent className="p-8 text-center space-y-4">
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 mx-auto">
								{article.requiredTier === "PRIME" ? <Crown className="h-8 w-8 text-amber-600" /> : <Lock className="h-8 w-8 text-amber-600" />}
							</div>
							<div>
								<h2 className="text-xl font-bold">{info.title}</h2>
								<p className="text-muted-foreground mt-2 max-w-md mx-auto">{info.message}</p>
							</div>
							<Button
								asChild
								size="lg"
							>
								<Link href={info.cta.href}>{info.cta.label}</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	const authorInitials = article.author.name
		.split(" ")
		.map((s) => s.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);

	const tierBadge = tierBadges[article.requiredTier];
	const breadcrumbSegments = primaryPath.map((segment, index) => ({
		label: segment,
		path: primaryPath.slice(0, index + 1).join(" / "),
	}));
	const shellUser = {
		id: session.user.id,
		name: session.user.name,
		email: session.user.email,
		image: session.user.image,
	};

	return (
		<ContentProtection>
			<div className="space-y-6">
				<ResourceReadingShell
					categoryTree={categoryTree}
					activeCategoryPath={activeCategoryPath}
					sidebarCategoryResources={sidebarCategoryResources}
					currentArticleSlug={article.slug}
					title={article.title}
					breadcrumbSegments={breadcrumbSegments}
					user={shellUser}
					sidebarDefaultOpen={false}
				>
					<article className="min-w-0 p-6 lg:p-8">
						{article.coverImage && (
							<div className="mb-8 aspect-video w-full overflow-hidden rounded-lg bg-muted">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={article.coverImage}
									alt={article.title}
									className="h-full w-full object-cover"
								/>
							</div>
						)}

						<div className="mb-6 flex flex-wrap items-center gap-3 border-b pb-6">
							{article.author.profile?.publicProfile && article.author.username ? (
								<Link
									href={`/users/${article.author.username}`}
									className="flex items-center gap-2 hover:underline"
								>
									<Avatar className="h-9 w-9">
										<AvatarImage
											src={article.author.image}
											alt={article.author.name}
										/>
										<AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
									</Avatar>
									<div>
										<p className="text-sm font-medium">{article.author.name}</p>
										{article.author.profile?.jobTitle && <p className="text-xs text-muted-foreground">{article.author.profile.jobTitle}</p>}
									</div>
								</Link>
							) : (
								<div className="flex items-center gap-2">
									<Avatar className="h-9 w-9">
										<AvatarImage
											src={article.author.image}
											alt={article.author.name}
										/>
										<AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
									</Avatar>
									<div>
										<p className="text-sm font-medium">{article.author.name}</p>
									</div>
								</div>
							)}

							<div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
								<Calendar className="h-3.5 w-3.5" />
								<time>
									{new Date(article.publishedAt).toLocaleDateString("fr-FR", {
										day: "numeric",
										month: "long",
										year: "numeric",
									})}
								</time>
							</div>
						</div>

						<div className="mb-8 flex flex-wrap gap-2">
							{article.tags.map(({ tag }) => (
								<Link
									key={tag.id}
									href={`/resources?tag=${tag.slug}`}
								>
									<Badge
										variant="outline"
										className="cursor-pointer hover:bg-muted"
										style={
											tag.color
												? {
														backgroundColor: tag.color,
														color: "#fff",
														borderColor: tag.color,
													}
												: undefined
										}
									>
										{tag.name}
									</Badge>
								</Link>
							))}
							{article.requiredTier !== "FREE" && (
								<Badge
									variant={tierBadge.variant}
									className="gap-1"
								>
									{article.requiredTier === "PRIME" && <Crown className="h-3 w-3" />}
									{tierBadge.label}
								</Badge>
							)}
						</div>

						<div id="resource-reading-content">
							<ArticleContent content={article.content} />
						</div>

						<div className="mt-12 border-t pt-6">
							<Link
								href="/resources"
								className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
							>
								<ArrowLeft className="h-4 w-4" />
								Retour aux ressources
							</Link>
						</div>
					</article>
				</ResourceReadingShell>

				{relatedArticles.length > 0 ? (
					<section className="max-w-7xl mx-auto pt-2">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="text-xl font-semibold">Ressources similaires</h2>
							<Link
								href="/resources"
								className="text-sm text-muted-foreground hover:underline"
							>
								Voir toute la bibliothèque
							</Link>
						</div>
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{relatedArticles.map(({ article: related, access: relatedAccess }) => (
								<Link
									key={related.id}
									href={`/resources/${related.slug}`}
									className="group"
								>
									<Card className="h-full overflow-hidden transition-all hover:shadow-lg">
										<CardContent className="p-4 space-y-2">
											<div className="flex flex-wrap gap-1.5">
												{related.tags.slice(0, 2).map(({ tag }) => (
													<Badge
														key={tag.id}
														variant="outline"
														className="text-xs"
													>
														{tag.name}
													</Badge>
												))}
											</div>
											<h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">{related.title}</h3>
											<p className="text-xs text-muted-foreground line-clamp-2">{related.excerpt || "Ouvre cette ressource pour découvrir le contenu."}</p>
											<div className="pt-2 border-t text-xs text-muted-foreground flex items-center justify-between">
												<span>{related.author.name}</span>
												<span>{relatedAccess.allowed ? "Accès" : "Premium"}</span>
											</div>
										</CardContent>
									</Card>
								</Link>
							))}
						</div>
					</section>
				) : null}
			</div>
		</ContentProtection>
	);
}
