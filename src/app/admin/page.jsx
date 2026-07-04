import Link from "next/link";
import {
	Activity,
	AlertTriangle,
	ArrowRight,
	BookOpen,
	Building2,
	FileText,
	GraduationCap,
	Mail,
	Server,
	Settings2,
	ShieldCheck,
	UserPlus,
	Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AdminDashboard() {
	const now = new Date();
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	const fourteenDaysAgo = new Date(now);
	fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
	const sevenDaysAgo = new Date(now);
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

	const [
		coursesCount,
		publishedCoursesCount,
		modulesCount,
		lessonsCount,
		studentsCount,
		adminsCount,
		instructorsCount,
		enrollmentsCount,
		enrollmentsLast30Days,
		agenciesCount,
		pendingAgenciesCount,
		articlesCount,
		publishedArticlesCount,
		draftArticlesCount,
		contactMessagesCount,
		recentContactMessagesCount,
		certificatesCount,
		recentUsers,
		recentEnrollments,
		recentEnrollmentEvents,
		recentMessageEvents,
		topCoursesAggregate,
		topAuthorsAggregate,
		recentArticles,
		recentContactMessages,
		recentSettingsAudit,
		platformSettingsRow,
	] = await Promise.all([
		prisma.course.count(),
		prisma.course.count({ where: { published: true } }),
		prisma.module.count(),
		prisma.lesson.count(),
		prisma.user.count({ where: { role: "STUDENT" } }),
		prisma.user.count({ where: { role: "ADMIN" } }),
		prisma.user.count({ where: { role: "INSTRUCTOR" } }),
		prisma.enrollment.count(),
		prisma.enrollment.count({ where: { enrolledAt: { gte: thirtyDaysAgo } } }),
		prisma.agency.count(),
		prisma.agency.count({ where: { approved: false } }),
		prisma.article.count(),
		prisma.article.count({ where: { published: true } }),
		prisma.article.count({ where: { published: false } }),
		prisma.contactMessage.count(),
		prisma.contactMessage.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
		prisma.certificate.count(),
		prisma.user.findMany({
			orderBy: { createdAt: "desc" },
			take: 6,
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				membership: true,
				createdAt: true,
			},
		}),
		prisma.enrollment.findMany({
			orderBy: { enrolledAt: "desc" },
			take: 6,
			select: {
				id: true,
				enrolledAt: true,
				user: { select: { id: true, name: true, email: true } },
				course: { select: { id: true, title: true, published: true } },
			},
		}),
		prisma.enrollment.findMany({
			where: { enrolledAt: { gte: fourteenDaysAgo } },
			select: { enrolledAt: true },
		}),
		prisma.contactMessage.findMany({
			where: { createdAt: { gte: fourteenDaysAgo } },
			select: { createdAt: true },
		}),
		prisma.enrollment.groupBy({
			by: ["courseId"],
			_count: { _all: true },
			orderBy: { _count: { courseId: "desc" } },
			take: 5,
		}),
		prisma.article.groupBy({
			by: ["authorId"],
			where: { published: true },
			_count: { _all: true },
			orderBy: { _count: { authorId: "desc" } },
			take: 5,
		}),
		prisma.article.findMany({
			orderBy: { updatedAt: "desc" },
			take: 6,
			select: {
				id: true,
				title: true,
				slug: true,
				published: true,
				updatedAt: true,
				author: {
					select: {
						name: true,
						email: true,
					},
				},
			},
		}),
		prisma.contactMessage.findMany({
			orderBy: { createdAt: "desc" },
			take: 5,
			select: {
				id: true,
				fullName: true,
				email: true,
				subject: true,
				locale: true,
				createdAt: true,
			},
		}),
		prisma.adminSettingsAuditLog.findMany({
			orderBy: { createdAt: "desc" },
			take: 5,
			select: {
				id: true,
				action: true,
				createdAt: true,
				actor: { select: { name: true, email: true } },
			},
		}),
		prisma.platformSettings.findUnique({
			where: { id: "global" },
			select: { data: true },
		}),
	]);

	const topCourseIds = topCoursesAggregate.map((item) => item.courseId);
	const topAuthorIds = topAuthorsAggregate.map((item) => item.authorId).filter(Boolean);

	const [topCoursesRows, topAuthorsRows] = await Promise.all([
		topCourseIds.length > 0
			? prisma.course.findMany({
					where: { id: { in: topCourseIds } },
					select: { id: true, title: true, published: true },
				})
			: Promise.resolve([]),
		topAuthorIds.length > 0
			? prisma.user.findMany({
					where: { id: { in: topAuthorIds } },
					select: { id: true, name: true, email: true },
				})
			: Promise.resolve([]),
	]);

	const topCoursesMap = new Map(topCoursesRows.map((row) => [row.id, row]));
	const topAuthorsMap = new Map(topAuthorsRows.map((row) => [row.id, row]));

	const topCourses = topCoursesAggregate.map((item) => ({
		courseId: item.courseId,
		title: topCoursesMap.get(item.courseId)?.title || "Cours supprimé",
		published: Boolean(topCoursesMap.get(item.courseId)?.published),
		count: item._count._all,
	}));

	const topAuthors = topAuthorsAggregate.map((item) => ({
		authorId: item.authorId,
		name: topAuthorsMap.get(item.authorId)?.name || topAuthorsMap.get(item.authorId)?.email || "Auteur inconnu",
		email: topAuthorsMap.get(item.authorId)?.email || "-",
		count: item._count._all,
	}));

	function buildDailySeries(rows, dateKey, days = 14) {
		const counts = new Map();
		for (const row of rows) {
			const day = new Date(row[dateKey]).toISOString().slice(0, 10);
			counts.set(day, (counts.get(day) || 0) + 1);
		}

		const series = [];
		for (let i = days - 1; i >= 0; i -= 1) {
			const date = new Date(now);
			date.setDate(date.getDate() - i);
			const day = date.toISOString().slice(0, 10);
			series.push({
				day,
				label: new Intl.DateTimeFormat("fr-CA", { day: "2-digit", month: "2-digit" }).format(date),
				count: counts.get(day) || 0,
			});
		}

		return series;
	}

	const enrollmentTrend = buildDailySeries(recentEnrollmentEvents, "enrolledAt", 14);
	const messageTrend = buildDailySeries(recentMessageEvents, "createdAt", 14);
	const enrollmentTrendMax = Math.max(1, ...enrollmentTrend.map((d) => d.count));
	const messageTrendMax = Math.max(1, ...messageTrend.map((d) => d.count));

	let dbHealthy = true;
	try {
		await prisma.$queryRaw`SELECT 1`;
	} catch {
		dbHealthy = false;
	}

	const maintenanceMode = Boolean(platformSettingsRow?.data?.maintenanceMode);

	const totalUsers = studentsCount + adminsCount + instructorsCount;
	const publicationRate = coursesCount > 0 ? Math.round((publishedCoursesCount / coursesCount) * 100) : 0;
	const articlePublicationRate = articlesCount > 0 ? Math.round((publishedArticlesCount / articlesCount) * 100) : 0;

	const kpis = [
		{
			label: "Utilisateurs",
			value: totalUsers,
			detail: `${studentsCount} étudiants • ${adminsCount} admins • ${instructorsCount} instructeurs`,
			icon: Users,
		},
		{
			label: "Cours",
			value: coursesCount,
			detail: `${publishedCoursesCount} publiés (${publicationRate}%)`,
			icon: BookOpen,
		},
		{
			label: "Inscriptions",
			value: enrollmentsCount,
			detail: `+${enrollmentsLast30Days} sur 30 jours`,
			icon: GraduationCap,
		},
		{
			label: "Agences",
			value: agenciesCount,
			detail: `${pendingAgenciesCount} en attente`,
			icon: Building2,
		},
		{
			label: "Articles",
			value: articlesCount,
			detail: `${draftArticlesCount} brouillons (${articlePublicationRate}% publiés)`,
			icon: FileText,
		},
		{
			label: "Support",
			value: contactMessagesCount,
			detail: `${recentContactMessagesCount} nouveaux (7 jours)`,
			icon: Mail,
		},
	];

	const alerts = [
		pendingAgenciesCount > 0 ? { text: `${pendingAgenciesCount} agence(s) à valider`, href: "/admin/agencies?filter=pending" } : null,
		draftArticlesCount > 0 ? { text: `${draftArticlesCount} article(s) en brouillon`, href: "/admin/articles?filter=draft" } : null,
		publishedCoursesCount === 0 ? { text: "Aucun cours publié actuellement", href: "/admin/courses" } : null,
		recentContactMessagesCount > 0 ? { text: `${recentContactMessagesCount} nouveau(x) message(s) de contact`, href: "/admin" } : null,
	].filter(Boolean);

	function formatDate(date) {
		return new Intl.DateTimeFormat("fr-CA", {
			dateStyle: "medium",
			timeStyle: "short",
		}).format(new Date(date));
	}

	function roleLabel(role) {
		switch (role) {
			case "ADMIN":
				return "Admin";
			case "INSTRUCTOR":
				return "Instructeur";
			default:
				return "Étudiant";
		}
	}

	return (
		<div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-linear-to-br from-neutral-100 via-neutral-100 to-neutral-200/60">
			{/* DASHBOARD HERO */}
			<div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<h1 className="text-2xl font-semibold">Dashboard Admin</h1>
						<p className="text-sm text-muted-foreground">Cockpit global de l&apos;académie: croissance, contenu, membres et opérations.</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button
							asChild
							className="shadow-sm active:shadow-inner"
						>
							<Link href="/admin/courses/new">Créer un cours</Link>
						</Button>
						<Button
							variant="outline"
							asChild
							className="shadow-sm active:shadow-inner"
						>
							<Link href="/admin/articles/new">Nouvel article</Link>
						</Button>
						<Button
							variant="outline"
							asChild
							className="shadow-sm active:shadow-inner"
						>
							<Link href="/admin/settings">
								<Settings2 className="mr-2 h-4 w-4" />
								Paramètres
							</Link>
						</Button>
					</div>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{kpis.map(({ label, value, detail, icon: Icon }) => (
					<Card
						key={label}
						className="shadow-sm border-neutral-200 bg-white/95"
					>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
							<Icon className="h-4 w-4 text-primary" />
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold">{value}</div>
							<p className="mt-2 text-xs text-muted-foreground">{detail}</p>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
				<div className="space-y-6">
					<Card className="shadow-sm border-neutral-200">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Activity className="h-5 w-5" />
								Tendances 14 jours
							</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-6 lg:grid-cols-2 bg-neutral-50/60">
							<div>
								<p className="mb-3 text-sm font-medium">Inscriptions</p>
								<div className="flex h-28 items-end gap-1 rounded-md border bg-white p-2 shadow-inner">
									{enrollmentTrend.map((point) => (
										<div
											key={point.day}
											title={`${point.label}: ${point.count}`}
											className="group flex-1"
										>
											<div
												className="w-full rounded-sm bg-primary/80 transition-colors group-hover:bg-primary"
												style={{ height: `${Math.max(8, Math.round((point.count / enrollmentTrendMax) * 100))}%` }}
											/>
										</div>
									))}
								</div>
								<p className="mt-2 text-xs text-muted-foreground">Total période: {enrollmentTrend.reduce((sum, d) => sum + d.count, 0)} inscriptions</p>
							</div>
							<div>
								<p className="mb-3 text-sm font-medium">Messages support</p>
								<div className="flex h-28 items-end gap-1 rounded-md border bg-white p-2 shadow-inner">
									{messageTrend.map((point) => (
										<div
											key={point.day}
											title={`${point.label}: ${point.count}`}
											className="group flex-1"
										>
											<div
												className="w-full rounded-sm bg-amber-500/80 transition-colors group-hover:bg-amber-500"
												style={{ height: `${Math.max(8, Math.round((point.count / messageTrendMax) * 100))}%` }}
											/>
										</div>
									))}
								</div>
								<p className="mt-2 text-xs text-muted-foreground">Total période: {messageTrend.reduce((sum, d) => sum + d.count, 0)} messages</p>
							</div>
						</CardContent>
					</Card>

					<Card className="shadow-sm border-neutral-200">
						<CardHeader>
							<CardTitle>Activité récente</CardTitle>
						</CardHeader>
						<CardContent className="space-y-5 bg-neutral-50/40">
							<div>
								<div className="mb-2 flex items-center justify-between">
									<p className="text-sm font-medium">Nouveaux utilisateurs</p>
									<Button
										variant="ghost"
										size="sm"
										asChild
										className="shadow-sm active:shadow-inner"
									>
										<Link href="/admin/users">
											Voir tout <ArrowRight className="ml-1 h-4 w-4" />
										</Link>
									</Button>
								</div>
								<div className="space-y-2">
									{recentUsers.map((user) => (
										<div
											key={user.id}
											className="flex items-center justify-between rounded-md border bg-white px-3 py-2 shadow-sm"
										>
											<div>
												<p className="text-sm font-medium">{user.name || user.email}</p>
												<p className="text-xs text-muted-foreground">{user.email}</p>
											</div>
											<div className="text-right">
												<Badge variant="outline">{roleLabel(user.role)}</Badge>
												<p className="mt-1 text-[11px] text-muted-foreground">{formatDate(user.createdAt)}</p>
											</div>
										</div>
									))}
								</div>
							</div>

							<div>
								<div className="mb-2 flex items-center justify-between">
									<p className="text-sm font-medium">Dernières inscriptions</p>
									<Button
										variant="ghost"
										size="sm"
										asChild
										className="shadow-sm active:shadow-inner"
									>
										<Link href="/admin/courses">
											Cours <ArrowRight className="ml-1 h-4 w-4" />
										</Link>
									</Button>
								</div>
								<div className="space-y-2">
									{recentEnrollments.map((enrollment) => (
										<div
											key={enrollment.id}
											className="flex items-center justify-between rounded-md border bg-white px-3 py-2 shadow-sm"
										>
											<div>
												<p className="text-sm font-medium">{enrollment.user?.name || enrollment.user?.email}</p>
												<p className="text-xs text-muted-foreground">{enrollment.course?.title || "Cours supprimé"}</p>
											</div>
											<div className="text-right">
												<Badge variant={enrollment.course?.published ? "default" : "secondary"}>{enrollment.course?.published ? "Publié" : "Brouillon"}</Badge>
												<p className="mt-1 text-[11px] text-muted-foreground">{formatDate(enrollment.enrolledAt)}</p>
											</div>
										</div>
									))}
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="shadow-sm border-neutral-200">
						<CardHeader>
							<CardTitle>Performance contenu</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-6 lg:grid-cols-2 bg-neutral-50/40">
							<div>
								<p className="mb-2 text-sm font-medium">Top cours (inscriptions)</p>
								<div className="space-y-2">
									{topCourses.length === 0 ? (
										<p className="text-sm text-muted-foreground">Aucune donnée d&apos;inscription disponible.</p>
									) : (
										topCourses.map((course) => (
											<Link
												key={course.courseId}
												href={`/admin/courses/${course.courseId}`}
												className="flex items-center justify-between rounded-md border bg-white px-3 py-2 shadow-sm hover:bg-muted/40"
											>
												<div className="min-w-0">
													<p className="truncate text-sm font-medium">{course.title}</p>
													<p className="text-[11px] text-muted-foreground">{course.published ? "Publié" : "Brouillon"}</p>
												</div>
												<Badge>{course.count}</Badge>
											</Link>
										))
									)}
								</div>
							</div>
							<div>
								<p className="mb-2 text-sm font-medium">Top auteurs (articles publiés)</p>
								<div className="space-y-2">
									{topAuthors.length === 0 ? (
										<p className="text-sm text-muted-foreground">Aucune publication auteur disponible.</p>
									) : (
										topAuthors.map((author) => (
											<div
												key={author.authorId}
												className="flex items-center justify-between rounded-md border bg-white px-3 py-2 shadow-sm"
											>
												<div className="min-w-0">
													<p className="truncate text-sm font-medium">{author.name}</p>
													<p className="truncate text-[11px] text-muted-foreground">{author.email}</p>
												</div>
												<Badge variant="secondary">{author.count}</Badge>
											</div>
										))
									)}
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="space-y-6">
					<Card className="shadow-sm border-neutral-200">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Server className="h-5 w-5" />
								Statut infrastructure
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 bg-neutral-50/30">
							<div className="flex items-center justify-between rounded-md border bg-white px-3 py-2 shadow-inner">
								<p className="text-sm">Base de données</p>
								<Badge variant={dbHealthy ? "default" : "destructive"}>{dbHealthy ? "OK" : "Erreur"}</Badge>
							</div>
							<div className="flex items-center justify-between rounded-md border bg-white px-3 py-2 shadow-inner">
								<p className="text-sm">Connectivité</p>
								<p className="text-sm font-medium">Probe SQL exécuté</p>
							</div>
							<div className="flex items-center justify-between rounded-md border bg-white px-3 py-2 shadow-inner">
								<p className="text-sm">Mode maintenance</p>
								<Badge variant={maintenanceMode ? "destructive" : "secondary"}>{maintenanceMode ? "Actif" : "Inactif"}</Badge>
							</div>
							<div className="flex items-center justify-between rounded-md border bg-white px-3 py-2 shadow-inner">
								<p className="text-sm">Couverture contenu</p>
								<p className="text-sm font-medium">
									{modulesCount} modules • {lessonsCount} leçons
								</p>
							</div>
						</CardContent>
					</Card>

					<Card className="shadow-sm border-neutral-200">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<AlertTriangle className="h-5 w-5 text-amber-500" />
								Alertes opérationnelles
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{alerts.length === 0 ? (
								<p className="rounded-md border bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Aucune alerte prioritaire pour le moment.</p>
							) : (
								alerts.map((alert) => (
									<Link
										key={alert.text}
										href={alert.href}
										className="flex items-center justify-between rounded-md border bg-white px-3 py-2 text-sm hover:bg-muted/40"
									>
										<span>{alert.text}</span>
										<ArrowRight className="h-4 w-4 text-muted-foreground" />
									</Link>
								))
							)}
						</CardContent>
					</Card>

					<Card className="shadow-sm border-neutral-200">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Mail className="h-5 w-5" />
								File support récente
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 bg-neutral-50/30">
							{recentContactMessages.length === 0 ? (
								<p className="text-sm text-muted-foreground">Aucun message récent.</p>
							) : (
								recentContactMessages.map((message) => (
									<div
										key={message.id}
										className="rounded-md border bg-white px-3 py-2 shadow-inner"
									>
										<div className="flex items-center justify-between gap-2">
											<p className="truncate text-sm font-medium">{message.fullName}</p>
											<Badge variant="outline">{message.locale.toUpperCase()}</Badge>
										</div>
										<p className="truncate text-xs text-muted-foreground">{message.subject}</p>
										<p className="mt-1 text-[11px] text-muted-foreground">
											{message.email} • {formatDate(message.createdAt)}
										</p>
									</div>
								))
							)}
						</CardContent>
					</Card>

					<Card className="shadow-sm border-neutral-200">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileText className="h-5 w-5" />
								Articles récents
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 bg-neutral-50/30">
							{recentArticles.map((article) => (
								<Link
									key={article.id}
									href={`/admin/articles/${article.id}`}
									className="block rounded-md border bg-white px-3 py-2 shadow-inner hover:bg-muted/40"
								>
									<div className="flex items-center justify-between gap-2">
										<p className="truncate text-sm font-medium">{article.title}</p>
										<Badge variant={article.published ? "default" : "secondary"}>{article.published ? "Publié" : "Brouillon"}</Badge>
									</div>
									<p className="mt-1 text-[11px] text-muted-foreground">
										par {article.author?.name || article.author?.email || "Auteur inconnu"} • {formatDate(article.updatedAt)}
									</p>
								</Link>
							))}
						</CardContent>
					</Card>

					<Card className="shadow-sm border-neutral-200">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<ShieldCheck className="h-5 w-5" />
								Audit paramètres
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 bg-neutral-50/30">
							{recentSettingsAudit.length === 0 ? (
								<p className="text-sm text-muted-foreground">Aucun événement audit enregistré.</p>
							) : (
								recentSettingsAudit.map((event) => (
									<div
										key={event.id}
										className="rounded-md border bg-white px-3 py-2 shadow-inner"
									>
										<div className="flex items-center justify-between gap-2">
											<Badge variant="outline">{event.action}</Badge>
											<p className="text-[11px] text-muted-foreground">{formatDate(event.createdAt)}</p>
										</div>
										<p className="mt-1 text-xs text-muted-foreground">{event.actor?.name || event.actor?.email || "Système"}</p>
									</div>
								))
							)}
							<Button
								variant="outline"
								className="w-full shadow-sm active:shadow-inner"
								asChild
							>
								<Link href="/admin/settings">Ouvrir les paramètres avancés</Link>
							</Button>
						</CardContent>
					</Card>

					<Card className="shadow-sm border-neutral-200">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<UserPlus className="h-5 w-5" />
								Raccourcis
							</CardTitle>
						</CardHeader>
						<CardContent className="grid grid-cols-1 gap-2 bg-neutral-50/30">
							<Button
								variant="outline"
								className="shadow-sm active:shadow-inner"
								asChild
							>
								<Link href="/admin/users/new">Créer un membre</Link>
							</Button>
							<Button
								variant="outline"
								className="shadow-sm active:shadow-inner"
								asChild
							>
								<Link href="/admin/agencies/new">Créer une agence</Link>
							</Button>
							<Button
								variant="outline"
								className="shadow-sm active:shadow-inner"
								asChild
							>
								<Link href="/admin/articles/tags">Gérer les tags d&apos;articles</Link>
							</Button>
							<div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground shadow-inner">
								Certificats émis: <span className="font-semibold text-foreground">{certificatesCount}</span>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
