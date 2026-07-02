import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Search, ShieldCheck, Users, UserRoundCheck } from "lucide-react";
import { AdminAgenciesInfiniteTable } from "@/features/admin/agencies/components/admin-agencies-infinite-table";
import { buildAdminAgenciesWhere, getAdminAgenciesPage, parseAdminAgenciesParams } from "@/features/admin/agencies/server/admin-agencies-list";

export const metadata = {
	title: "Agences — AERIA Admin",
};

export default async function AdminAgenciesPage({ searchParams }) {
	const params = await searchParams;
	const { q, status, sort, dir } = parseAdminAgenciesParams(params);
	const where = buildAdminAgenciesWhere({ q, status });

	const [initialData, totalCount, approvedCount, pendingCount, totalMembers] = await Promise.all([
		getAdminAgenciesPage(params),
		prisma.agency.count(),
		prisma.agency.count({ where: { approved: true } }),
		prisma.agency.count({ where: { approved: false } }),
		prisma.userProfile.count({ where: { agencyId: { not: null } } }),
	]);

	function hrefWith(next) {
		const merged = { q, status, sort, dir, page: 1, ...next };
		const usp = new URLSearchParams();
		if (merged.q) usp.set("q", merged.q);
		if (merged.status && merged.status !== "all") usp.set("status", merged.status);
		if (merged.sort && merged.sort !== "createdAt") usp.set("sort", merged.sort);
		if (merged.dir && merged.dir !== "desc") usp.set("dir", merged.dir);
		if (merged.page && Number(merged.page) > 1) usp.set("page", String(merged.page));
		const qs = usp.toString();
		return qs ? `/admin/agencies?${qs}` : "/admin/agencies";
	}

	function getSortHref(column) {
		const isCurrent = sort === column;
		const nextDir = isCurrent && dir === "asc" ? "desc" : "asc";
		return hrefWith({ sort: column, dir: nextDir, page: 1 });
	}

	const queryString = hrefWith({ page: 1 }).split("?")[1] || "";
	const storageKey = `admin-agencies:${queryString || "default"}`;

	const stats = [
		{ label: "Agences", value: totalCount, icon: Building2 },
		{ label: "Approuvées", value: approvedCount, icon: ShieldCheck },
		{ label: "En attente", value: pendingCount, icon: UserRoundCheck },
		{ label: "Membres rattachés", value: totalMembers, icon: Users },
	];

	return (
		<div className="mx-auto flex min-h-[calc(100svh-5.625rem)] max-w-7xl flex-col space-y-6 bg-neutral-100 p-6 lg:p-8">
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{stats.map(({ label, value, icon: Icon }) => (
					<div
						key={label}
						className="rounded-lg border bg-white p-4 shadow-sm"
					>
						<div className="flex items-center justify-between">
							<p className="text-sm text-muted-foreground">{label}</p>
							<Icon className="h-4 w-4 text-primary" />
						</div>
						<p className="mt-2 text-3xl font-bold">{value}</p>
					</div>
				))}
			</div>

			<h2 className="text-3xl font-bold text-center">Gestion des agences</h2>
			<div className="flex flex-col gap-3 rounded-lg border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-wrap gap-2">
					<Link
						href={hrefWith({ status: "all" })}
						className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
							status === "all" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
						}`}
					>
						Toutes
					</Link>
					<Link
						href={hrefWith({ status: "pending" })}
						className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
							status === "pending" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
						}`}
					>
						En attente
						{pendingCount > 0 && (
							<Badge
								variant="destructive"
								className="ml-2"
							>
								{pendingCount}
							</Badge>
						)}
					</Link>
					<Link
						href={hrefWith({ status: "approved" })}
						className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
							status === "approved" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
						}`}
					>
						Approuvées
					</Link>
				</div>
				<div className="flex items-center gap-2">
					<form
						action="/admin/agencies"
						className="relative"
					>
						<Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
						<input
							type="text"
							name="q"
							defaultValue={q}
							placeholder="Rechercher une agence"
							className="h-9 rounded-md border bg-background pl-8 pr-3 text-sm"
						/>
						{status !== "all" ? (
							<input
								type="hidden"
								name="status"
								value={status}
							/>
						) : null}
					</form>
					<Link
						href="/admin/agencies/new"
						className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground"
					>
						+ Créer une agence
					</Link>
				</div>
			</div>

			{initialData.items.length === 0 ? (
				<Card className="p-12 text-center">
					<Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
					<p className="text-muted-foreground">
						{status === "pending"
							? "Aucune agence en attente de validation"
							: status === "approved"
								? "Aucune agence approuvée"
								: "Aucune agence pour le moment"}
					</p>
				</Card>
			) : (
				<AdminAgenciesInfiniteTable
					key={queryString || "agencies-default"}
					initialData={initialData}
					queryString={queryString}
					storageKey={storageKey}
					sort={sort}
					dir={dir}
					sortHrefs={{
						name: getSortHref("name"),
						city: getSortHref("city"),
						members: getSortHref("members"),
						status: getSortHref("status"),
						createdAt: getSortHref("createdAt"),
					}}
				/>
			)}
		</div>
	);
}
