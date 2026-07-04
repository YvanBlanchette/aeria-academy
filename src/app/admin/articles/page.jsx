import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Tags, TrendingUp } from "lucide-react";
import { AdminArticlesInfiniteTable } from "@/features/admin/articles/components/admin-articles-infinite-table";
import { buildAdminArticlesWhere, getAdminArticlesPage, parseAdminArticlesParams } from "@/features/admin/articles/server/admin-articles-list";

export const metadata = { title: "Articles — AERIA Admin" };

export default async function AdminArticlesPage({ searchParams }) {
	const params = await searchParams;
	const { q, status, tier, tag, sort, dir } = parseAdminArticlesParams(params);
	const where = buildAdminArticlesWhere({ q, status, tier, tag });

	const [initialData, totalCount, publishedCount, draftCount, freeCount, academyCount, primeCount] = await Promise.all([
		getAdminArticlesPage(params),
		prisma.article.count(),
		prisma.article.count({ where: { published: true } }),
		prisma.article.count({ where: { published: false } }),
		prisma.article.count({ where: { requiredTier: "FREE" } }),
		prisma.article.count({ where: { requiredTier: "ACADEMY" } }),
		prisma.article.count({ where: { requiredTier: "PRIME" } }),
	]);

	function hrefWith(next) {
		const merged = { q, status, tier, tag, sort, dir, page: 1, ...next };
		const usp = new URLSearchParams();
		if (merged.q) usp.set("q", merged.q);
		if (merged.status !== "all") usp.set("status", merged.status);
		if (merged.tier !== "all") usp.set("tier", merged.tier);
		if (merged.tag) usp.set("tag", merged.tag);
		if (merged.sort !== "updatedAt") usp.set("sort", merged.sort);
		if (merged.dir !== "desc") usp.set("dir", merged.dir);
		if (Number(merged.page) > 1) usp.set("page", String(merged.page));
		const qs = usp.toString();
		return qs ? `/admin/articles?${qs}` : "/admin/articles";
	}

	function sortHref(column) {
		const isCurrent = sort === column;
		const nextDir = isCurrent && dir === "asc" ? "desc" : "asc";
		return hrefWith({ sort: column, dir: nextDir, page: 1 });
	}

	const queryString = hrefWith({ page: 1 }).split("?")[1] || "";
	const storageKey = `admin-articles:${queryString || "default"}`;

	return (
		<div className="mx-auto flex min-h-[calc(100svh-5.625rem)] max-w-7xl flex-col space-y-6 bg-transparent p-6 lg:p-8">
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<div className="rounded-lg border bg-white p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<p className="text-sm text-muted-foreground">Articles</p>
						<FileText className="h-4 w-4 text-primary" />
					</div>
					<p className="mt-2 text-3xl font-bold">{totalCount}</p>
				</div>
				<div className="rounded-lg border bg-white p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<p className="text-sm text-muted-foreground">Publication</p>
						<TrendingUp className="h-4 w-4 text-primary" />
					</div>
					<p className="mt-2 text-3xl font-bold">{publishedCount}</p>
				</div>
				<div className="rounded-lg border bg-white p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<p className="text-sm text-muted-foreground">Accès</p>
						<Badge variant="outline">Tiers</Badge>
					</div>
					<p className="mt-2 text-sm font-medium">
						Gratuit: {freeCount} • Académie: {academyCount} • Prime: {primeCount}
					</p>
				</div>
				<div className="rounded-lg border bg-white p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<p className="text-sm text-muted-foreground">Résultats filtrés</p>
						<Tags className="h-4 w-4 text-primary" />
					</div>
					<p className="mt-2 text-3xl font-bold">{initialData.filteredCount}</p>
				</div>
			</div>

			<h2 className="text-3xl font-bold text-center">Liste des articles</h2>

			<div className="space-y-3 rounded-lg border bg-white p-3">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex flex-wrap justify-start items-center gap-2">
						<Link
							href={hrefWith({ status: "all", page: 1 })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
								status === "all" ? "bg-primary text-primary-foreground" : "bg-neutral-100 shadow-inner  hover:bg-neutral-100/70"
							}`}
						>
							Tous
						</Link>
						<Link
							href={hrefWith({ status: "draft", page: 1 })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
								status === "draft" ? "bg-primary text-primary-foreground" : "bg-neutral-100 shadow-inner  hover:bg-neutral-100/70"
							}`}
						>
							Brouillons
							{draftCount > 0 && (
								<Badge
									variant="secondary"
									className="ml-2"
								>
									{draftCount}
								</Badge>
							)}
						</Link>
						<Link
							href={hrefWith({ status: "published", page: 1 })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
								status === "published" ? "bg-primary text-primary-foreground" : "bg-neutral-100 shadow-inner  hover:bg-neutral-100/70"
							}`}
						>
							Publiés
						</Link>
						<span className="h-8 w-px bg-neutral-300 mx-6" />
						<Link
							href={hrefWith({ tier: "FREE", page: 1 })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
								tier === "FREE" ? "bg-primary text-primary-foreground" : "bg-neutral-100 shadow-inner  hover:bg-neutral-100/70"
							}`}
						>
							Gratuit
						</Link>
						<Link
							href={hrefWith({ tier: "ACADEMY", page: 1 })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
								tier === "ACADEMY" ? "bg-primary text-primary-foreground" : "bg-neutral-100 shadow-inner  hover:bg-neutral-100/70"
							}`}
						>
							Académie
						</Link>
						<Link
							href={hrefWith({ tier: "PRIME", page: 1 })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
								tier === "PRIME" ? "bg-primary text-primary-foreground" : "bg-neutral-100 shadow-inner  hover:bg-neutral-100/70"
							}`}
						>
							Prime
						</Link>
					</div>

					<div className="flex justify-end items-center gap-2">
						<form
							action="/admin/articles"
							className="relative"
						>
							<Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<input
								type="text"
								name="q"
								defaultValue={q}
								placeholder="Rechercher un article"
								className="h-9 rounded-md border bg-neutral-100 shadow-inner pl-8 pr-3 text-sm"
							/>
							{status !== "all" ? (
								<input
									type="hidden"
									name="status"
									value={status}
								/>
							) : null}
							{tier !== "all" ? (
								<input
									type="hidden"
									name="tier"
									value={tier}
								/>
							) : null}
							{tag ? (
								<input
									type="hidden"
									name="tag"
									value={tag}
								/>
							) : null}
						</form>
						<Link
							href="/admin/articles/new"
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground`}
						>
							+ Nouvel Article
						</Link>
						<Link
							href="/admin/articles/tags"
							className="px-3 py-1.5 rounded-md text-sm font-medium bg-neutral-100 shadow-inner hover:bg-neutral-100/70"
						>
							Gérer les tags →
						</Link>
					</div>
				</div>
			</div>

			{initialData.items.length === 0 ? (
				<Card className="p-12 text-center text-muted-foreground">Aucun article pour ces filtres.</Card>
			) : (
				<AdminArticlesInfiniteTable
					key={queryString || "articles-default"}
					initialData={initialData}
					queryString={queryString}
					storageKey={storageKey}
					sort={sort}
					dir={dir}
					sortHrefs={{
						title: hrefWith({ sort: "title", dir: sort === "title" && dir === "asc" ? "desc" : "asc", page: 1 }),
						tier: hrefWith({ sort: "tier", dir: sort === "tier" && dir === "asc" ? "desc" : "asc", page: 1 }),
						status: hrefWith({ sort: "status", dir: sort === "status" && dir === "asc" ? "desc" : "asc", page: 1 }),
						viewCount: hrefWith({ sort: "viewCount", dir: sort === "viewCount" && dir === "asc" ? "desc" : "asc", page: 1 }),
						updatedAt: hrefWith({ sort: "updatedAt", dir: sort === "updatedAt" && dir === "asc" ? "desc" : "asc", page: 1 }),
					}}
				/>
			)}
		</div>
	);
}
