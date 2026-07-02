"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AgencyRowActions } from "@/components/admin/agency-row-actions";
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

export function AdminAgenciesInfiniteTable({ initialData, queryString, storageKey, sort, dir, sortHrefs }) {
	const { items, hasMore, isLoading, error, sentinelRef } = useInfiniteAdminList({
		endpoint: "/api/admin/agencies",
		queryString,
		storageKey,
		initialItems: initialData.items,
		initialPage: initialData.page,
		initialHasMore: initialData.hasMore,
	});

	return (
		<div className="flex flex-col gap-3 pb-8">
			<div className="flex items-center justify-between text-sm text-muted-foreground">
				<p>{initialData.filteredCount === 0 ? "Aucun résultat" : `${items.length} sur ${initialData.filteredCount} agences`}</p>
				<p>
					Tri: <span className="font-medium text-foreground">{sort}</span> ({dir})
				</p>
			</div>
			<div className="overflow-hidden rounded-lg border bg-white">
				<Table>
					<TableHeader className="bg-[#171717] text-white hover:pointer-events-none hover:bg-[#171717]">
						<TableRow>
							<TableHead className="border-r border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.name}
									label="Agence"
									active={sort === "name"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="border-r border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.city}
									label="Localisation"
									active={sort === "city"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="border-r border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.members}
									label="Membres"
									active={sort === "members"}
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
							<TableHead className="border-r border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.createdAt}
									label="Créée le"
									active={sort === "createdAt"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="border-r border-white text-center text-white">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{items.map((agency) => (
							<TableRow key={agency.id}>
								<TableCell className="border text-center">
									<Link
										href={`/admin/agencies/${agency.id}`}
										className="flex items-center gap-3 hover:underline"
									>
										{agency.logoUrl ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img
												src={agency.logoUrl}
												alt={agency.name}
												className="h-10 w-10 shrink-0 rounded object-cover"
											/>
										) : (
											<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
												<Building2 className="h-5 w-5 text-muted-foreground" />
											</div>
										)}
										<div>
											<p className="font-medium">{agency.name}</p>
										</div>
									</Link>
								</TableCell>
								<TableCell className="border text-center">
									{agency.city || "—"}
									{agency.province ? `, ${agency.province}` : ""}
								</TableCell>
								<TableCell className="border text-center">{agency._count.members}</TableCell>
								<TableCell className="border text-center">
									<Badge variant={agency.approved ? "default" : "secondary"}>{agency.approved ? "Approuvée" : "En attente"}</Badge>
								</TableCell>
								<TableCell className="border text-center">{new Date(agency.createdAt).toLocaleDateString("fr-FR")}</TableCell>
								<TableCell className="border text-center">
									<AgencyRowActions agency={agency} />
								</TableCell>
							</TableRow>
						))}
						{isLoading ? <AdminTableLoadingRows columns={6} /> : null}
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
