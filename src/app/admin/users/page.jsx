import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Shield, Sparkles, Users } from "lucide-react";
import { AdminUsersInfiniteTable } from "@/features/admin/users/components/admin-users-infinite-table";
import { buildAdminUsersWhere, getAdminUsersPage, parseAdminUsersParams } from "@/features/admin/users/server/admin-users-list";

export default async function UsersPage({ searchParams }) {
	const session = await auth();
	const params = await searchParams;
	const { q, role, membership, verified, sort, dir } = parseAdminUsersParams(params);
	const where = buildAdminUsersWhere({ q, role, membership, verified });

	const [initialData, totalCount, verifiedCount, adminCount, instructorCount, paidCount] = await Promise.all([
		getAdminUsersPage(params),
		prisma.user.count(),
		prisma.user.count({ where: { emailVerified: { not: null } } }),
		prisma.user.count({ where: { role: "ADMIN" } }),
		prisma.user.count({ where: { role: "INSTRUCTOR" } }),
		prisma.user.count({ where: { membership: { in: ["ACADEMY", "PRIME"] } } }),
	]);

	function hrefWith(next) {
		const merged = {
			q,
			role,
			membership,
			verified,
			sort,
			dir,
			page: 1,
			...next,
		};
		const usp = new URLSearchParams();
		if (merged.q) usp.set("q", merged.q);
		if (merged.role !== "all") usp.set("role", merged.role);
		if (merged.membership !== "all") usp.set("membership", merged.membership);
		if (merged.verified !== "all") usp.set("verified", merged.verified);
		if (merged.sort !== "createdAt") usp.set("sort", merged.sort);
		if (merged.dir !== "desc") usp.set("dir", merged.dir);
		if (Number(merged.page) > 1) usp.set("page", String(merged.page));
		const qs = usp.toString();
		return qs ? `/admin/users?${qs}` : "/admin/users";
	}

	const queryString = hrefWith({ page: 1 }).split("?")[1] || "";
	const storageKey = `admin-users:${queryString || "default"}`;

	return (
		<div className="mx-auto flex min-h-[calc(100svh-5.625rem)] max-w-7xl flex-col space-y-6 bg-neutral-100 p-6 lg:p-8">
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<div className="rounded-lg border bg-white p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<p className="text-sm text-muted-foreground">Membres</p>
						<Users className="h-4 w-4 text-primary" />
					</div>
					<p className="mt-2 text-3xl font-bold">{totalCount}</p>
				</div>
				<div className="rounded-lg border bg-white p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<p className="text-sm text-muted-foreground">Emails vérifiés</p>
						<Shield className="h-4 w-4 text-primary" />
					</div>
					<p className="mt-2 text-3xl font-bold">{verifiedCount}</p>
				</div>
				<div className="rounded-lg border bg-white p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<p className="text-sm text-muted-foreground">Equipe</p>
						<Sparkles className="h-4 w-4 text-primary" />
					</div>
					<p className="mt-2 text-sm font-medium">
						{adminCount} admins • {instructorCount} instructeurs
					</p>
				</div>
				<div className="rounded-lg border bg-white p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<p className="text-sm text-muted-foreground">Abonnés payants</p>
						<Badge variant="outline">tiers</Badge>
					</div>
					<p className="mt-2 text-3xl font-bold">{paidCount}</p>
				</div>
			</div>

			<h2 className="text-3xl font-bold text-center">Liste des membres</h2>

			<div className="space-y-3 rounded-lg border bg-white p-3">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex flex-wrap justify-start items-center gap-2">
						<Link
							href={hrefWith({ role: "all", page: 1 })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${role === "all" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
						>
							Tous
						</Link>
						<Link
							href={hrefWith({ role: "STUDENT", page: 1 })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${role === "STUDENT" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
						>
							Étudiants
						</Link>
						<Link
							href={hrefWith({ role: "INSTRUCTOR", page: 1 })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${role === "INSTRUCTOR" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
						>
							Instructeurs
						</Link>
						<Link
							href={hrefWith({ role: "ADMIN", page: 1 })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${role === "ADMIN" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
						>
							Admins
						</Link>
						<Link
							href={hrefWith({ membership: "ACADEMY", page: 1 })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${membership === "ACADEMY" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
						>
							ACADEMY
						</Link>
						<Link
							href={hrefWith({ membership: "PRIME", page: 1 })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${membership === "PRIME" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
						>
							PRIME
						</Link>
						<Link
							href={hrefWith({ verified: "yes", page: 1 })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${verified === "yes" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
						>
							Email vérifié
						</Link>
					</div>

					<div className="flex justify-end items-center gap-2">
						<form
							action="/admin/users"
							className="relative"
						>
							<Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<input
								type="text"
								name="q"
								defaultValue={q}
								placeholder="Rechercher un membre"
								className="h-9 rounded-md border bg-background pl-8 pr-3 text-sm"
							/>
							{role !== "all" ? (
								<input
									type="hidden"
									name="role"
									value={role}
								/>
							) : null}
							{membership !== "all" ? (
								<input
									type="hidden"
									name="membership"
									value={membership}
								/>
							) : null}
							{verified !== "all" ? (
								<input
									type="hidden"
									name="verified"
									value={verified}
								/>
							) : null}
						</form>
						<Link
							href="/admin/users/new"
							className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground"
						>
							+ Ajouter un membre
						</Link>
					</div>
				</div>
			</div>

			{initialData.items.length === 0 ? (
				<Card className="p-12 text-center text-muted-foreground">Aucun membre pour ces filtres.</Card>
			) : (
				<AdminUsersInfiniteTable
					key={queryString || "users-default"}
					initialData={initialData}
					queryString={queryString}
					storageKey={storageKey}
					currentUserId={session?.user?.id}
					sort={sort}
					dir={dir}
					sortHrefs={{
						name: hrefWith({ sort: "name", dir: sort === "name" && dir === "asc" ? "desc" : "asc", page: 1 }),
						role: hrefWith({ sort: "role", dir: sort === "role" && dir === "asc" ? "desc" : "asc", page: 1 }),
						membership: hrefWith({ sort: "membership", dir: sort === "membership" && dir === "asc" ? "desc" : "asc", page: 1 }),
						email: hrefWith({ sort: "email", dir: sort === "email" && dir === "asc" ? "desc" : "asc", page: 1 }),
						emailVerified: hrefWith({ sort: "emailVerified", dir: sort === "emailVerified" && dir === "asc" ? "desc" : "asc", page: 1 }),
						createdAt: hrefWith({ sort: "createdAt", dir: sort === "createdAt" && dir === "asc" ? "desc" : "asc", page: 1 }),
					}}
				/>
			)}
		</div>
	);
}
