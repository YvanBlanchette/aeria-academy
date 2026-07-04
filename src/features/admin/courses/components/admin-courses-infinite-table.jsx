"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CourseRowActions } from "@/components/admin/course-row-actions";
import { markdownToExcerpt } from "@/lib/markdown-excerpt";
import { AdminTableLoadingRows } from "@/features/admin/shared/admin-table-loading-rows";
import { useInfiniteAdminList } from "@/features/admin/shared/use-infinite-admin-list";

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

export function AdminCoursesInfiniteTable({ initialData, queryString, storageKey, sort, dir, sortHrefs }) {
	const { items, hasMore, isLoading, error, sentinelRef } = useInfiniteAdminList({
		endpoint: "/api/admin/courses",
		queryString,
		storageKey,
		initialItems: initialData.items,
		initialPage: initialData.page,
		initialHasMore: initialData.hasMore,
	});

	return (
		<div className="flex flex-col gap-3 pb-8">
			<div className="flex items-center justify-between text-sm text-muted-foreground">
				<p>{initialData.filteredCount === 0 ? "Aucun résultat" : `${items.length} sur ${initialData.filteredCount} cours`}</p>
				<p>
					Tri: <span className="font-medium text-foreground">{sort}</span> ({dir})
				</p>
			</div>
			<div className="overflow-hidden rounded-lg border bg-white shadow-sm">
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
							<TableHead className="border border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.status}
									label="Statut"
									active={sort === "status"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="border border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.type}
									label="Type"
									active={sort === "type"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="border border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.price}
									label="Prix"
									active={sort === "price"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="border border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.modules}
									label="Modules"
									active={sort === "modules"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="border border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.enrollments}
									label="Inscrits"
									active={sort === "enrollments"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="border border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.createdAt}
									label="Créé le"
									active={sort === "createdAt"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="text-center text-white">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{items.map((course) => (
							<TableRow key={course.id}>
								<TableCell className="border text-center">
									<Link
										href={`/admin/courses/${course.id}`}
										className="font-medium hover:underline"
									>
										{course.title}
									</Link>
									<p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{markdownToExcerpt(course.description, 140)}</p>
								</TableCell>
								<TableCell className="border text-center">
									<Badge variant={course.published ? "default" : "secondary"}>{course.published ? "Publié" : "Brouillon"}</Badge>
								</TableCell>
								<TableCell className="border text-center">
									<Badge variant={course.price > 0 ? "default" : "outline"}>{course.price > 0 ? "Payant" : "Gratuit"}</Badge>
								</TableCell>
								<TableCell className="border text-center">{(course.price / 100).toFixed(2)} $</TableCell>
								<TableCell className="border text-center">{course._count.modules}</TableCell>
								<TableCell className="border text-center">{course._count.enrollments}</TableCell>
								<TableCell className="border text-center">{new Date(course.createdAt).toLocaleDateString("fr-CA")}</TableCell>
								<TableCell className="border text-center">
									<CourseRowActions course={course} />
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
