import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TagsManager } from "@/components/admin/tags-manager";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, Tag, Tags } from "lucide-react";

export const metadata = { title: "Tags — AERIA Admin" };

const PAGE_SIZE = 20;
const SORT_FIELDS = ["name", "usage", "createdAt"];

function parseTagParams(params) {
	const q = typeof params?.q === "string" ? params.q.trim() : "";
	const sort = SORT_FIELDS.includes(params?.sort) ? params.sort : "usage";
	const dir = params?.dir === "asc" || params?.dir === "desc" ? params.dir : "desc";
	const rawPage = Number(params?.page);
	const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
	return { q, sort, dir, page };
}

function SortHeaderLink({ href, label, active, dir }) {
	return (
		<Link
			href={href}
			className="inline-flex items-center justify-center gap-1 hover:opacity-90"
		>
			<span>{label}</span>
			{active ? dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5" />}
		</Link>
	);
}

export default async function AdminTagsPage({ searchParams }) {
	const params = await searchParams;
	const { q, sort, dir, page } = parseTagParams(params);

	const where = q
		? {
				OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }],
			}
		: {};

	const orderBy =
		sort === "name" ? [{ name: dir }, { createdAt: "desc" }] : sort === "createdAt" ? [{ createdAt: dir }] : [{ articles: { _count: dir } }, { name: "asc" }];

	const [tags, filteredCount, totalCount, usedCount, linkCount] = await Promise.all([
		prisma.tag.findMany({
			where,
			include: {
				_count: { select: { articles: true } },
			},
			orderBy,
			skip: (page - 1) * PAGE_SIZE,
			take: PAGE_SIZE,
		}),
		prisma.tag.count({ where }),
		prisma.tag.count(),
		prisma.tag.count({ where: { articles: { some: {} } } }),
		prisma.articleTag.count(),
	]);

	const unusedCount = Math.max(0, totalCount - usedCount);
	const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
	const safePage = Math.min(page, totalPages);
	const pageStart = filteredCount === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
	const pageEnd = Math.min(safePage * PAGE_SIZE, filteredCount);

	function hrefWith(next) {
		const merged = { q, sort, dir, page, ...next };
		const usp = new URLSearchParams();
		if (merged.q) usp.set("q", merged.q);
		if (merged.sort !== "usage") usp.set("sort", merged.sort);
		if (merged.dir !== "desc") usp.set("dir", merged.dir);
		if (Number(merged.page) > 1) usp.set("page", String(merged.page));
		const qs = usp.toString();
		return qs ? `/admin/articles/tags?${qs}` : "/admin/articles/tags";
	}

	return (
		<div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-transparent">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<Link
					href="/admin/articles"
					className="text-sm text-muted-foreground hover:underline"
				>
					← Retour aux articles
				</Link>
				<Button
					asChild
					variant="outline"
					size="sm"
				>
					<Link href="/admin/articles/new">+ Nouvel article</Link>
				</Button>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<div className="rounded-lg border bg-white p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<p className="text-sm text-muted-foreground">Tags</p>
						<Tags className="h-4 w-4 text-primary" />
					</div>
					<p className="mt-2 text-3xl font-bold">{totalCount}</p>
				</div>
				<div className="rounded-lg border bg-white p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<p className="text-sm text-muted-foreground">Avec articles</p>
						<Tag className="h-4 w-4 text-primary" />
					</div>
					<p className="mt-2 text-3xl font-bold">{usedCount}</p>
				</div>
				<div className="rounded-lg border bg-white p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<p className="text-sm text-muted-foreground">Sans article</p>
						<Badge variant="outline">nettoyage</Badge>
					</div>
					<p className="mt-2 text-3xl font-bold">{unusedCount}</p>
				</div>
				<div className="rounded-lg border bg-white p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<p className="text-sm text-muted-foreground">Liaisons tag/article</p>
						<Badge variant="secondary">pivot</Badge>
					</div>
					<p className="mt-2 text-3xl font-bold">{linkCount}</p>
				</div>
			</div>

			<Card className="rounded-lg border bg-white">
				<CardHeader className="pb-2">
					<CardTitle className="text-xl">Explorateur de tags</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<form
							action="/admin/articles/tags"
							className="relative"
						>
							<Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<input
								type="text"
								name="q"
								defaultValue={q}
								placeholder="Rechercher un tag"
								className="h-9 rounded-md border bg-neutral-100 pl-8 pr-3 text-sm shadow-inner"
							/>
							{sort !== "usage" ? (
								<input
									type="hidden"
									name="sort"
									value={sort}
								/>
							) : null}
							{dir !== "desc" ? (
								<input
									type="hidden"
									name="dir"
									value={dir}
								/>
							) : null}
						</form>
						<div className="text-sm text-muted-foreground">{filteredCount === 0 ? "Aucun résultat" : `${pageStart}-${pageEnd} sur ${filteredCount} tags`}</div>
					</div>

					<div className="overflow-x-auto rounded-md border">
						<table className="w-full text-sm">
							<thead className="bg-[#171717] text-white">
								<tr>
									<th className="px-3 py-2 text-left">
										<SortHeaderLink
											href={hrefWith({ sort: "name", dir: sort === "name" && dir === "asc" ? "desc" : "asc", page: 1 })}
											label="Tag"
											active={sort === "name"}
											dir={dir}
										/>
									</th>
									<th className="px-3 py-2 text-left">Slug</th>
									<th className="px-3 py-2 text-center">
										<SortHeaderLink
											href={hrefWith({ sort: "usage", dir: sort === "usage" && dir === "asc" ? "desc" : "asc", page: 1 })}
											label="Articles"
											active={sort === "usage"}
											dir={dir}
										/>
									</th>
									<th className="px-3 py-2 text-center">
										<SortHeaderLink
											href={hrefWith({ sort: "createdAt", dir: sort === "createdAt" && dir === "asc" ? "desc" : "asc", page: 1 })}
											label="Créé le"
											active={sort === "createdAt"}
											dir={dir}
										/>
									</th>
									<th className="px-3 py-2 text-center">Voir</th>
								</tr>
							</thead>
							<tbody>
								{tags.length === 0 ? (
									<tr>
										<td
											colSpan={5}
											className="px-3 py-6 text-center text-muted-foreground"
										>
											Aucun tag trouvé.
										</td>
									</tr>
								) : (
									tags.map((tagItem) => (
										<tr
											key={tagItem.id}
											className="border-t bg-white"
										>
											<td className="px-3 py-2">
												<Badge
													variant="outline"
													style={
														tagItem.color
															? {
																	backgroundColor: tagItem.color,
																	color: "#fff",
																	borderColor: tagItem.color,
																}
															: undefined
													}
												>
													{tagItem.name}
												</Badge>
											</td>
											<td className="px-3 py-2 text-muted-foreground">/{tagItem.slug}</td>
											<td className="px-3 py-2 text-center">{tagItem._count.articles}</td>
											<td className="px-3 py-2 text-center text-muted-foreground">{new Date(tagItem.createdAt).toLocaleDateString("fr-FR")}</td>
											<td className="px-3 py-2 text-center">
												<Button
													asChild
													variant="ghost"
													size="sm"
												>
													<Link href={`/admin/articles?tag=${tagItem.slug}`}>Articles</Link>
												</Button>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{totalPages > 1 ? (
						<div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
							<Button
								variant="outline"
								size="sm"
								disabled={safePage <= 1}
								asChild={safePage > 1}
							>
								{safePage > 1 ? (
									<Link href={hrefWith({ page: safePage - 1 })}>
										<ChevronLeft className="mr-1 h-4 w-4" /> Précédent
									</Link>
								) : (
									<span>
										<ChevronLeft className="mr-1 h-4 w-4" /> Précédent
									</span>
								)}
							</Button>

							<div className="text-sm text-muted-foreground">
								Page {safePage} sur {totalPages}
							</div>

							<Button
								variant="outline"
								size="sm"
								disabled={safePage >= totalPages}
								asChild={safePage < totalPages}
							>
								{safePage < totalPages ? (
									<Link href={hrefWith({ page: safePage + 1 })}>
										Suivant <ChevronRight className="ml-1 h-4 w-4" />
									</Link>
								) : (
									<span>
										Suivant <ChevronRight className="ml-1 h-4 w-4" />
									</span>
								)}
							</Button>
						</div>
					) : null}
				</CardContent>
			</Card>

			<div className="space-y-4">
				<h2 className="text-xl font-semibold">Gestionnaire</h2>
				<TagsManager tags={tags} />
			</div>
		</div>
	);
}
