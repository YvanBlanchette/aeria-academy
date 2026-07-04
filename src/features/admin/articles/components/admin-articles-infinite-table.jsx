"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArticleRowActions } from "@/components/admin/article-row-actions";
import { AdminTableLoadingRows } from "@/features/admin/shared/admin-table-loading-rows";
import { useInfiniteAdminList } from "@/features/admin/shared/use-infinite-admin-list";

const tierColors = {
	FREE: "outline",
	ACADEMY: "default",
	PRIME: "secondary",
};

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

export function AdminArticlesInfiniteTable({ initialData, queryString, storageKey, sort, dir, sortHrefs }) {
	const { items, hasMore, isLoading, error, sentinelRef } = useInfiniteAdminList({
		endpoint: "/api/admin/articles",
		queryString,
		storageKey,
		initialItems: initialData.items,
		initialPage: initialData.page,
		initialHasMore: initialData.hasMore,
	});

	return (
		<div className="flex flex-col gap-3 pb-8">
			<div className="flex items-center justify-between text-sm text-muted-foreground">
				<p>{initialData.filteredCount === 0 ? "Aucun résultat" : `${items.length} sur ${initialData.filteredCount} articles`}</p>
				<p>
					Tri: <span className="font-medium text-foreground">{sort}</span> ({dir})
				</p>
			</div>
			<div className="overflow-hidden rounded-lg border bg-card">
				<Table>
					<TableHeader className="bg-[#171717] text-white hover:pointer-events-none hover:bg-[#171717]">
						<TableRow>
							<TableHead className="border-r border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.title}
									label="Titre"
									active={sort === "title"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="border-r border-white text-center text-white">Tags</TableHead>
							<TableHead className="border-r border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.tier}
									label="Accès"
									active={sort === "tier"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="border-r border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.status}
									label="Statut"
									active={sort === "status"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="border-r border-white text-center text-white">Auteur</TableHead>
							<TableHead className="border-r border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.viewCount}
									label="Vues"
									active={sort === "viewCount"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="border-r border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.updatedAt}
									label="Mis à jour"
									active={sort === "updatedAt"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="border-r border-white text-center text-white">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{items.map((article) => (
							<TableRow
								key={article.id}
								className="overflow-x-hidden"
							>
								<TableCell className="border text-center">
									<Link
										href={`/admin/articles/${article.id}`}
										className="font-medium hover:underline"
									>
										{article.title}
									</Link>
								</TableCell>
								<TableCell className="border text-center">
									<div className="flex flex-wrap items-center justify-center gap-1">
										{article.tags.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : null}
										{article.tags.map(({ tag }) => (
											<Badge
												key={tag.id}
												variant="outline"
												style={tag.color ? { backgroundColor: tag.color, color: "#fff", borderColor: tag.color } : undefined}
											>
												{tag.name}
											</Badge>
										))}
									</div>
								</TableCell>
								<TableCell className="border text-center">
									<Badge variant={tierColors[article.requiredTier]}>
										{article.requiredTier === "FREE" ? "Gratuit" : article.requiredTier === "ACADEMY" ? "Académie" : "Prime"}
									</Badge>
								</TableCell>
								<TableCell className="border text-center">
									<Badge variant={article.published ? "default" : "secondary"}>{article.published ? "Publié" : "Brouillon"}</Badge>
								</TableCell>
								<TableCell className="border text-center text-sm">{article.author?.name || article.author?.email || "-"}</TableCell>
								<TableCell className="border text-center text-sm">{article.viewCount}</TableCell>
								<TableCell className="border text-center text-sm text-muted-foreground">{new Date(article.updatedAt).toLocaleDateString("fr-FR")}</TableCell>
								<TableCell className="border text-center">
									<ArticleRowActions article={article} />
								</TableCell>
							</TableRow>
						))}
						{isLoading ? <AdminTableLoadingRows columns={8} /> : null}
					</TableBody>
				</Table>
			</div>
			{error ? <div className="min-h-10 text-center text-sm text-muted-foreground">{error}</div> : null}
			<div
				ref={sentinelRef}
				className="h-1 w-full"
			/>
		</div>
	);
}
