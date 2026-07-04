import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { BookOpen, CircleDollarSign, GraduationCap, Search, Sparkles } from "lucide-react";
import { AdminCoursesInfiniteTable } from "@/features/admin/courses/components/admin-courses-infinite-table";
import { buildAdminCoursesWhere, getAdminCoursesPage, parseAdminCoursesParams } from "@/features/admin/courses/server/admin-courses-list";

export default async function CoursesListPage({ searchParams }) {
	const params = await searchParams;
	const { q, status, pricing, sort, dir } = parseAdminCoursesParams(params);
	const where = buildAdminCoursesWhere({ q, status, pricing });

	const [initialData, totalCourses, publishedCourses, draftCourses, freeCourses, paidCourses, enrollmentsTotal] = await Promise.all([
		getAdminCoursesPage(params),
		prisma.course.count(),
		prisma.course.count({ where: { published: true } }),
		prisma.course.count({ where: { published: false } }),
		prisma.course.count({ where: { price: 0 } }),
		prisma.course.count({ where: { price: { gt: 0 } } }),
		prisma.enrollment.count(),
	]);

	function hrefWith(next) {
		const merged = { q, status, pricing, sort, dir, page: 1, ...next };
		const usp = new URLSearchParams();
		if (merged.q) usp.set("q", merged.q);
		if (merged.status && merged.status !== "all") usp.set("status", merged.status);
		if (merged.pricing && merged.pricing !== "all") usp.set("pricing", merged.pricing);
		if (merged.sort && merged.sort !== "createdAt") usp.set("sort", merged.sort);
		if (merged.dir && merged.dir !== "desc") usp.set("dir", merged.dir);
		if (merged.page && Number(merged.page) > 1) usp.set("page", String(merged.page));
		const qs = usp.toString();
		return qs ? `/admin/courses?${qs}` : "/admin/courses";
	}

	function getSortHref(column) {
		const isCurrent = sort === column;
		const nextDir = isCurrent && dir === "asc" ? "desc" : "asc";
		return hrefWith({ sort: column, dir: nextDir, page: 1 });
	}

	const queryString = hrefWith({ page: 1 }).split("?")[1] || "";
	const storageKey = `admin-courses:${queryString || "default"}`;

	const stats = [
		{ label: "Cours total", value: totalCourses, icon: BookOpen },
		{ label: "Publiés", value: publishedCourses, icon: Sparkles },
		{ label: "Inscriptions", value: enrollmentsTotal, icon: GraduationCap },
		{ label: "Monétisation", value: `${paidCourses}/${freeCourses}`, icon: CircleDollarSign },
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

			<div className="space-y-4">
				<h2 className="text-3xl font-bold text-center">Liste des cours</h2>

				<div className="flex flex-col gap-3 rounded-lg border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-wrap gap-2">
						<Link
							href={hrefWith({ status: "all" })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
								status === "all" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
							}`}
						>
							Tous
						</Link>
						<Link
							href={hrefWith({ status: "draft" })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
								status === "draft" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
							}`}
						>
							Brouillons
						</Link>
						<Link
							href={hrefWith({ status: "published" })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
								status === "published" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
							}`}
						>
							Publiés
						</Link>
						<span className="h-8 w-px bg-neutral-300 mx-6" />
						<Link
							href={hrefWith({ pricing: "free" })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
								pricing === "free" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
							}`}
						>
							Gratuits
						</Link>
						<Link
							href={hrefWith({ pricing: "paid" })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
								pricing === "paid" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
							}`}
						>
							Payants
						</Link>
					</div>

					<div className="flex items-center gap-2">
						<form
							action="/admin/courses"
							className="relative"
						>
							<Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<input
								type="text"
								name="q"
								defaultValue={q}
								placeholder="Rechercher un cours"
								className="h-9 rounded-md border bg-background pl-8 pr-3 text-sm"
							/>
							{status !== "all" ? (
								<input
									type="hidden"
									name="status"
									value={status}
								/>
							) : null}
							{pricing !== "all" ? (
								<input
									type="hidden"
									name="pricing"
									value={pricing}
								/>
							) : null}
						</form>
						<Link
							href="/admin/courses/new"
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground`}
						>
							+ Créer un cours
						</Link>
					</div>
				</div>

				{initialData.items.length === 0 ? (
					<div className="rounded-lg border border-dashed p-12 text-center">
						<p className="text-muted-foreground">Aucun cours pour le moment</p>
						<Button
							asChild
							className="mt-4"
						>
							<Link href="/admin/courses/new">Créer le premier cours</Link>
						</Button>
					</div>
				) : (
					<AdminCoursesInfiniteTable
						key={queryString || "courses-default"}
						initialData={initialData}
						queryString={queryString}
						storageKey={storageKey}
						sort={sort}
						dir={dir}
						sortHrefs={{
							title: getSortHref("title"),
							status: getSortHref("status"),
							type: getSortHref("type"),
							price: getSortHref("price"),
							modules: getSortHref("modules"),
							enrollments: getSortHref("enrollments"),
							createdAt: getSortHref("createdAt"),
						}}
					/>
				)}
			</div>
		</div>
	);
}
