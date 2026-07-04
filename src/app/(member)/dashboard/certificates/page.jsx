import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, CalendarCheck, ChevronLeft, ChevronRight, Download, FileBadge2, Search } from "lucide-react";

export const metadata = { title: "Certificats | ÆRIA Voyages Academy" };

const PAGE_SIZE = 9;
const SORT_FIELDS = ["recent", "oldest", "title", "progress"];

function parseParams(params) {
	const q = typeof params?.q === "string" ? params.q.trim() : "";
	const status = params?.status === "certified" || params?.status === "ready" || params?.status === "in_progress" ? params.status : "all";
	const sort = SORT_FIELDS.includes(params?.sort) ? params.sort : "recent";
	const parsedPage = Number(params?.page);
	const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
	return { q, status, sort, page };
}

export default async function CertificatesPage({ searchParams }) {
	const session = await auth();
	if (!session?.user?.id) {
		redirect("/login?callbackUrl=/dashboard/certificates");
	}

	const params = await searchParams;
	const { q, status, sort, page } = parseParams(params);
	const userId = session.user.id;

	const courseFilter = q
		? {
				course: {
					title: { contains: q, mode: "insensitive" },
				},
			}
		: {};

	const [enrollments, certificates] = await Promise.all([
		prisma.enrollment.findMany({
			where: { userId, ...courseFilter },
			include: {
				course: {
					select: {
						id: true,
						slug: true,
						title: true,
						modules: {
							select: {
								lessons: { select: { id: true } },
								quiz: { select: { id: true } },
							},
						},
					},
				},
			},
			orderBy: { enrolledAt: "desc" },
		}),
		prisma.certificate.findMany({
			where: { userId, ...courseFilter },
			include: {
				course: {
					select: {
						id: true,
						slug: true,
						title: true,
						modules: {
							select: {
								lessons: { select: { id: true } },
								quiz: { select: { id: true } },
							},
						},
					},
				},
			},
			orderBy: { issuedAt: "desc" },
		}),
	]);

	const courseMap = new Map();

	for (const enrollment of enrollments) {
		courseMap.set(enrollment.courseId, {
			courseId: enrollment.course.id,
			courseSlug: enrollment.course.slug,
			courseTitle: enrollment.course.title,
			enrolledAt: enrollment.enrolledAt,
			certificateIssuedAt: null,
			certificateId: null,
			totalLessons: enrollment.course.modules.reduce((sum, mod) => sum + mod.lessons.length, 0),
			totalQuizzes: enrollment.course.modules.reduce((sum, mod) => sum + (mod.quiz ? 1 : 0), 0),
		});
	}

	for (const certificate of certificates) {
		const existing = courseMap.get(certificate.courseId);
		const totalLessons = certificate.course.modules.reduce((sum, mod) => sum + mod.lessons.length, 0);
		if (existing) {
			existing.certificateIssuedAt = certificate.issuedAt;
			existing.certificateId = certificate.id;
		} else {
			courseMap.set(certificate.courseId, {
				courseId: certificate.course.id,
				courseSlug: certificate.course.slug,
				courseTitle: certificate.course.title,
				enrolledAt: certificate.issuedAt,
				certificateIssuedAt: certificate.issuedAt,
				certificateId: certificate.id,
				totalLessons: totalLessons,
				totalQuizzes: certificate.course.modules.reduce((sum, mod) => sum + (mod.quiz ? 1 : 0), 0),
			});
		}
	}

	const courseIds = Array.from(courseMap.keys());

	const progressRows =
		courseIds.length > 0
			? await prisma.lessonProgress.findMany({
					where: {
						userId,
						completed: true,
						lesson: {
							module: {
								courseId: { in: courseIds },
							},
						},
					},
					select: {
						completedAt: true,
						lesson: {
							select: {
								module: { select: { courseId: true } },
							},
						},
					},
				})
			: [];

	const progressMap = new Map();
	for (const row of progressRows) {
		const courseId = row.lesson.module.courseId;
		const existing = progressMap.get(courseId) || { completedLessons: 0, lastCompletedAt: null };
		existing.completedLessons += 1;
		if (row.completedAt && (!existing.lastCompletedAt || row.completedAt > existing.lastCompletedAt)) {
			existing.lastCompletedAt = row.completedAt;
		}
		progressMap.set(courseId, existing);
	}

	const passedQuizRows =
		courseIds.length > 0
			? await prisma.quizAttempt.findMany({
					where: {
						userId,
						passed: true,
						quiz: {
							module: {
								courseId: { in: courseIds },
							},
						},
					},
					select: {
						quizId: true,
						createdAt: true,
						quiz: {
							select: {
								module: { select: { courseId: true } },
							},
						},
					},
					distinct: ["quizId"],
				})
			: [];

	const passedQuizMap = new Map();
	for (const row of passedQuizRows) {
		const courseId = row.quiz.module.courseId;
		const existing = passedQuizMap.get(courseId) || { passedQuizIds: new Set(), lastPassedAt: null };
		existing.passedQuizIds.add(row.quizId);
		if (!existing.lastPassedAt || row.createdAt > existing.lastPassedAt) {
			existing.lastPassedAt = row.createdAt;
		}
		passedQuizMap.set(courseId, existing);
	}

	const allItems = Array.from(courseMap.values()).map((item) => {
		const progress = progressMap.get(item.courseId);
		const completedLessons = progress?.completedLessons || 0;
		const quizProgress = passedQuizMap.get(item.courseId);
		const completedQuizzes = quizProgress?.passedQuizIds?.size || 0;
		const progressPercent = item.totalQuizzes > 0 ? Math.min(100, Math.round((completedQuizzes / item.totalQuizzes) * 100)) : 0;
		const statusKey = item.certificateIssuedAt ? "certified" : item.totalQuizzes > 0 && completedQuizzes >= item.totalQuizzes ? "ready" : "in_progress";
		const sortDate = item.certificateIssuedAt || quizProgress?.lastPassedAt || progress?.lastCompletedAt || item.enrolledAt;

		return {
			...item,
			completedLessons,
			completedQuizzes,
			progressPercent,
			statusKey,
			sortDate,
		};
	});

	const filteredItems = status === "all" ? allItems : allItems.filter((item) => item.statusKey === status);

	filteredItems.sort((a, b) => {
		if (sort === "title") return a.courseTitle.localeCompare(b.courseTitle, "fr");
		if (sort === "oldest") return new Date(a.sortDate).getTime() - new Date(b.sortDate).getTime();
		if (sort === "progress") return b.progressPercent - a.progressPercent;
		return new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime();
	});

	const totalFiltered = filteredItems.length;
	const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
	const safePage = Math.min(page, totalPages);
	const start = (safePage - 1) * PAGE_SIZE;
	const pageItems = filteredItems.slice(start, start + PAGE_SIZE);
	const pageStart = totalFiltered === 0 ? 0 : start + 1;
	const pageEnd = Math.min(start + PAGE_SIZE, totalFiltered);

	const certificatesCount = allItems.filter((item) => item.statusKey === "certified").length;
	const readyCount = allItems.filter((item) => item.statusKey === "ready").length;
	const inProgressCount = allItems.filter((item) => item.statusKey === "in_progress").length;
	const certificateHistory = certificates
		.map((entry) => ({
			id: entry.id,
			courseId: entry.course.id,
			courseSlug: entry.course.slug,
			courseTitle: entry.course.title,
			issuedAt: entry.issuedAt,
		}))
		.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

	function hrefWith(next) {
		const merged = { q, status, sort, page, ...next };
		const usp = new URLSearchParams();
		if (merged.q) usp.set("q", merged.q);
		if (merged.status && merged.status !== "all") usp.set("status", merged.status);
		if (merged.sort && merged.sort !== "recent") usp.set("sort", merged.sort);
		if (merged.page && Number(merged.page) > 1) usp.set("page", String(merged.page));
		const qs = usp.toString();
		return qs ? `/dashboard/certificates?${qs}` : "/dashboard/certificates";
	}

	return (
		<div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<div className="rounded-lg border bg-card p-4">
					<p className="text-xs text-muted-foreground">Certificats obtenus</p>
					<p className="mt-2 text-3xl font-bold">{certificatesCount}</p>
				</div>
				<div className="rounded-lg border bg-card p-4">
					<p className="text-xs text-muted-foreground">Prêts à certifier</p>
					<p className="mt-2 text-3xl font-bold">{readyCount}</p>
				</div>
				<div className="rounded-lg border bg-card p-4">
					<p className="text-xs text-muted-foreground">En cours</p>
					<p className="mt-2 text-3xl font-bold">{inProgressCount}</p>
				</div>
			</div>

			<div className="rounded-lg border bg-card p-3 space-y-3">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-wrap gap-2 items-center">
						<Link
							href={hrefWith({ status: "all", page: 1 })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${status === "all" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
						>
							Tous
						</Link>
						<Link
							href={hrefWith({ status: "certified", page: 1 })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${status === "certified" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
						>
							Certifiés
						</Link>
						<Link
							href={hrefWith({ status: "ready", page: 1 })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${status === "ready" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
						>
							Prêts
						</Link>
						<Link
							href={hrefWith({ status: "in_progress", page: 1 })}
							className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${status === "in_progress" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
						>
							En cours
						</Link>
					</div>

					<form
						action="/dashboard/certificates"
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
						{sort !== "recent" ? (
							<input
								type="hidden"
								name="sort"
								value={sort}
							/>
						) : null}
					</form>
				</div>

				<div className="flex items-center justify-between text-sm text-muted-foreground">
					<p>{totalFiltered === 0 ? "Aucun résultat" : `${pageStart}-${pageEnd} sur ${totalFiltered} cours`}</p>
					<div className="flex items-center gap-2">
						<span>Trier:</span>
						<Link
							href={hrefWith({ sort: "recent", page: 1 })}
							className={`px-2 py-1 rounded ${sort === "recent" ? "bg-muted text-foreground" : "hover:bg-muted/70"}`}
						>
							Récents
						</Link>
						<Link
							href={hrefWith({ sort: "oldest", page: 1 })}
							className={`px-2 py-1 rounded ${sort === "oldest" ? "bg-muted text-foreground" : "hover:bg-muted/70"}`}
						>
							Anciens
						</Link>
						<Link
							href={hrefWith({ sort: "title", page: 1 })}
							className={`px-2 py-1 rounded ${sort === "title" ? "bg-muted text-foreground" : "hover:bg-muted/70"}`}
						>
							Titre
						</Link>
						<Link
							href={hrefWith({ sort: "progress", page: 1 })}
							className={`px-2 py-1 rounded ${sort === "progress" ? "bg-muted text-foreground" : "hover:bg-muted/70"}`}
						>
							Progression
						</Link>
					</div>
				</div>
			</div>

			{allItems.length === 0 ? (
				<Card>
					<CardContent className="p-12 text-center space-y-4">
						<Award className="h-12 w-12 text-muted-foreground mx-auto" />
						<p className="text-muted-foreground">
							Aucun certificat pour le moment. Termine un cours et passe son quiz de validation pour obtenir ton premier certificat.
						</p>
						<Button asChild>
							<Link href="/dashboard/courses">Continuer ma formation</Link>
						</Button>
					</CardContent>
				</Card>
			) : pageItems.length === 0 ? (
				<Card>
					<CardContent className="p-10 text-center space-y-3">
						<p className="text-muted-foreground">Aucun cours ne correspond à tes filtres.</p>
						<Button
							asChild
							variant="outline"
						>
							<Link href="/dashboard/certificates">Réinitialiser les filtres</Link>
						</Button>
					</CardContent>
				</Card>
			) : (
				<>
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{pageItems.map((item) => (
							<Card key={item.courseId}>
								<CardContent className="p-5 space-y-4">
									<div className="flex items-start justify-between gap-3">
										<div>
											<h3 className="font-semibold line-clamp-2">{item.courseTitle}</h3>
											<p className="text-xs text-muted-foreground mt-1">
												{item.completedLessons} / {item.totalLessons} leçons complétées
											</p>
											<p className="text-xs text-muted-foreground mt-1">
												{item.completedQuizzes} / {item.totalQuizzes} quiz réussi(s)
											</p>
										</div>
										{item.statusKey === "certified" ? (
											<Badge className="gap-1">
												<FileBadge2 className="h-3.5 w-3.5" /> Certifié
											</Badge>
										) : item.statusKey === "ready" ? (
											<Badge variant="secondary">Prêt</Badge>
										) : (
											<Badge variant="outline">En cours</Badge>
										)}
									</div>

									<div className="space-y-1.5">
										<div className="flex items-center justify-between text-xs">
											<span className="text-muted-foreground">Validation quiz</span>
											<span className="font-medium">{item.progressPercent}%</span>
										</div>
										<Progress
											value={item.progressPercent}
											className="h-1.5"
										/>
									</div>

									<div className="text-xs text-muted-foreground space-y-1">
										{item.certificateIssuedAt ? (
											<p className="inline-flex items-center gap-1">
												<CalendarCheck className="h-3.5 w-3.5" />
												Certificat obtenu le{" "}
												{new Date(item.certificateIssuedAt).toLocaleDateString("fr-FR", {
													day: "numeric",
													month: "long",
													year: "numeric",
												})}
											</p>
										) : item.statusKey === "ready" ? (
											<p>Tous les quiz du cours sont réussis. Le certificat est maintenant disponible.</p>
										) : item.totalQuizzes === 0 ? (
											<p>Ce parcours n&apos;a pas encore de quiz configuré pour la certification.</p>
										) : (
											<p>Continue ce parcours pour débloquer ton certificat.</p>
										)}
									</div>

									<div className="flex items-center justify-between pt-2 border-t">
										{item.statusKey === "certified" ? (
											<div className="flex w-full items-center justify-between gap-2">
												<Button
													asChild
													variant="outline"
													size="sm"
												>
													<Link href={`/learn/${item.courseId}`}>Revoir le cours</Link>
												</Button>
												<Button
													asChild
													size="sm"
												>
													<Link href={`/api/certificates/${item.certificateId}/download`}>
														<Download className="h-3.5 w-3.5" /> Télécharger
													</Link>
												</Button>
											</div>
										) : (
											<>
												<Button
													asChild
													variant="default"
													size="sm"
												>
													<Link href={`/learn/${item.courseId}`}>Continuer</Link>
												</Button>
												<Link
													href={`/courses/${item.courseSlug}`}
													className="text-xs text-muted-foreground hover:underline"
												>
													Voir la fiche
												</Link>
											</>
										)}
									</div>
								</CardContent>
							</Card>
						))}
					</div>

					{totalPages > 1 ? (
						<div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
							<Button
								variant="outline"
								size="sm"
								disabled={safePage <= 1}
								asChild={safePage > 1}
							>
								{safePage > 1 ? (
									<Link href={hrefWith({ page: safePage - 1 })}>
										<ChevronLeft className="h-4 w-4" /> Précédent
									</Link>
								) : (
									<span className="inline-flex items-center gap-1">
										<ChevronLeft className="h-4 w-4" /> Précédent
									</span>
								)}
							</Button>

							<div className="text-sm text-muted-foreground">
								Page <span className="font-medium text-foreground">{safePage}</span> / {totalPages}
							</div>

							<Button
								variant="outline"
								size="sm"
								disabled={safePage >= totalPages}
								asChild={safePage < totalPages}
							>
								{safePage < totalPages ? (
									<Link href={hrefWith({ page: safePage + 1 })}>
										Suivant <ChevronRight className="h-4 w-4" />
									</Link>
								) : (
									<span className="inline-flex items-center gap-1">
										Suivant <ChevronRight className="h-4 w-4" />
									</span>
								)}
							</Button>
						</div>
					) : null}

					{certificateHistory.length > 0 ? (
						<Card>
							<CardContent className="p-5 space-y-4">
								<div className="flex items-center justify-between">
									<h2 className="text-base font-semibold">Historique des certifications</h2>
									<span className="text-xs text-muted-foreground">{certificateHistory.length} certificat(s)</span>
								</div>
								<div className="space-y-2">
									{certificateHistory.slice(0, 10).map((entry) => (
										<div
											key={entry.id}
											className="rounded-md border p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
										>
											<div>
												<p className="text-sm font-medium">{entry.courseTitle}</p>
												<p className="text-xs text-muted-foreground">
													Obtenu le{" "}
													{new Date(entry.issuedAt).toLocaleDateString("fr-FR", {
														day: "numeric",
														month: "long",
														year: "numeric",
													})}
												</p>
											</div>
											<div className="flex items-center gap-2">
												<Button
													asChild
													variant="outline"
													size="sm"
												>
													<Link href={`/api/certificates/${entry.id}/download`}>
														<Download className="h-3.5 w-3.5" /> PDF
													</Link>
												</Button>
												<Link
													href={`/courses/${entry.courseSlug}`}
													className="text-xs text-muted-foreground hover:underline"
												>
													Fiche cours
												</Link>
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					) : null}
				</>
			)}
		</div>
	);
}
