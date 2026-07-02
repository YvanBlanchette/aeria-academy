"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { renameUserRole } from "@/lib/helpers";
import { AdminTableLoadingRows } from "@/features/admin/shared/admin-table-loading-rows";
import { useInfiniteAdminList } from "@/features/admin/shared/use-infinite-admin-list";

function membershipBadgeVariant(tier) {
	if (tier === "PRIME") return "default";
	if (tier === "ACADEMY") return "secondary";
	return "outline";
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

export function AdminUsersInfiniteTable({ initialData, queryString, storageKey, currentUserId, sort, dir, sortHrefs }) {
	const { items, hasMore, isLoading, error, sentinelRef } = useInfiniteAdminList({
		endpoint: "/api/admin/users",
		queryString,
		storageKey,
		initialItems: initialData.items,
		initialPage: initialData.page,
		initialHasMore: initialData.hasMore,
	});

	return (
		<div className="flex flex-col gap-3 pb-8">
			<div className="flex items-center justify-between text-sm text-muted-foreground">
				<p>{initialData.filteredCount === 0 ? "Aucun résultat" : `${items.length} sur ${initialData.filteredCount} membres`}</p>
				<p>
					Tri: <span className="font-medium text-foreground">{sort}</span> ({dir})
				</p>
			</div>

			<div className="overflow-hidden rounded-lg border bg-white">
				<Table>
					<TableHeader className="bg-[#171717] text-white hover:pointer-events-none hover:bg-[#171717]">
						<TableRow>
							<TableHead className="border border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.name}
									label="Nom"
									active={sort === "name"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="border border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.role}
									label="Rôle"
									active={sort === "role"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="border border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.membership}
									label="Membership"
									active={sort === "membership"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="border border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.email}
									label="Courriel"
									active={sort === "email"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="border border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.emailVerified}
									label="Vérifié"
									active={sort === "emailVerified"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="border border-white text-center text-white">Stats</TableHead>
							<TableHead className="border border-white text-center text-white">
								<SortHeaderLink
									href={sortHrefs.createdAt}
									label="Inscrit"
									active={sort === "createdAt"}
									dir={dir}
								/>
							</TableHead>
							<TableHead className="text-center text-white">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{items.map((user) => (
							<TableRow key={user.id}>
								<TableCell className="border text-center">
									<Link
										href={`/admin/users/${user.id}`}
										className="font-medium hover:underline"
									>
										{user.name || "Sans nom"}
									</Link>
									{user.username ? <p className="text-xs text-muted-foreground">@{user.username}</p> : null}
								</TableCell>
								<TableCell className="border text-center">
									<Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>{renameUserRole(user.role)}</Badge>
								</TableCell>
								<TableCell className="border text-center">
									<Badge variant={membershipBadgeVariant(user.membership)}>{user.membership}</Badge>
								</TableCell>
								<TableCell className="border text-center">{user.email}</TableCell>
								<TableCell className="border text-center">
									<Badge variant={user.emailVerified ? "default" : "outline"}>{user.emailVerified ? "Oui" : "Non"}</Badge>
								</TableCell>
								<TableCell className="border text-center">
									<p className="text-xs">
										{user._count.enrollments} cours • {user._count.certificates} certifs
									</p>
								</TableCell>
								<TableCell className="border text-center">
									{new Date(user.createdAt).toLocaleDateString("fr-FR", {
										day: "2-digit",
										month: "2-digit",
										year: "numeric",
									})}
								</TableCell>
								<TableCell className="border text-center">
									<UserRowActions
										user={user}
										isSelf={user.id === currentUserId}
									/>
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
