import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, BookOpen, CheckCircle2, Clock3, FileBadge2, HelpCircle, Mail, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserForm } from "@/components/admin/user-form";
import { UserDeleteButton } from "@/components/admin/user-delete-button";
import { UserQuickActions } from "@/components/admin/user-quick-actions";
import { ManualCertificateGenerator } from "@/components/admin/manual-certificate-generator";
import { Button } from "@/components/ui/button";

export default async function UserDetailPage({ params }) {
	const { id } = await params;
	const session = await auth();

	const user = await prisma.user.findUnique({
		where: { id },
		include: {
			enrollments: {
				orderBy: { enrolledAt: "desc" },
				include: {
					course: {
						select: { id: true, title: true, slug: true },
					},
				},
			},
			quizAttempts: {
				orderBy: { createdAt: "desc" },
				take: 8,
				include: {
					quiz: {
						select: {
							title: true,
							module: {
								select: {
									course: {
										select: {
											id: true,
											title: true,
										},
									},
								},
							},
						},
					},
				},
			},
			certificates: {
				orderBy: { issuedAt: "desc" },
				take: 8,
				include: {
					course: {
						select: { id: true, title: true },
					},
				},
			},
			progress: {
				where: { completed: true },
				orderBy: { completedAt: "desc" },
				take: 8,
				include: {
					lesson: {
						select: {
							title: true,
							module: {
								select: {
									course: {
										select: {
											id: true,
											title: true,
										},
									},
								},
							},
						},
					},
				},
			},
			_count: {
				select: {
					enrollments: true,
					quizAttempts: true,
					certificates: true,
				},
			},
		},
	});

	if (!user) notFound();

	const isSelf = user.id === session.user.id;
	const initials = (user.name || user.email)
		.split(" ")
		.map((s) => s.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);

	const metadata = {
		title: user.name,
		subtitle: user.email,
		image: user.image,
		btnLabel: "← Retour aux utilisateurs",
		btnLink: "/admin/users",
	};

	const certificateCourseMap = new Map();
	for (const enrollment of user.enrollments) {
		certificateCourseMap.set(enrollment.course.id, {
			id: enrollment.course.id,
			title: enrollment.course.title,
			hasCertificate: false,
		});
	}
	for (const certificate of user.certificates) {
		const existing = certificateCourseMap.get(certificate.course.id);
		if (existing) {
			existing.hasCertificate = true;
		} else {
			certificateCourseMap.set(certificate.course.id, {
				id: certificate.course.id,
				title: certificate.course.title,
				hasCertificate: true,
			});
		}
	}
	const certificateCourses = Array.from(certificateCourseMap.values());

	const timeline = [
		...user.enrollments.map((item) => ({
			key: `enr-${item.id}`,
			type: "Inscription",
			icon: BookOpen,
			date: item.enrolledAt,
			label: `Inscription au cours \"${item.course.title}\"`,
			href: `/admin/courses/${item.course.id}`,
			detail: new Date(item.enrolledAt).toLocaleDateString("fr-FR"),
		})),
		...user.quizAttempts.map((item) => ({
			key: `quiz-${item.id}`,
			type: "Quiz",
			icon: HelpCircle,
			date: item.createdAt,
			label: `${item.quiz.title} (${item.score}%)`,
			href: item.quiz.module.course?.id ? `/admin/courses/${item.quiz.module.course.id}` : null,
			detail: item.passed ? "Réussi" : "Échoué",
		})),
		...user.certificates.map((item) => ({
			key: `cert-${item.id}`,
			type: "Certificat",
			icon: FileBadge2,
			date: item.issuedAt,
			label: `Certificat obtenu: ${item.course.title}`,
			href: `/admin/courses/${item.course.id}`,
			detail: new Date(item.issuedAt).toLocaleDateString("fr-FR"),
		})),
		...user.progress
			.filter((item) => item.completedAt)
			.map((item) => ({
				key: `prog-${item.id}`,
				type: "Progression",
				icon: CheckCircle2,
				date: item.completedAt,
				label: `Leçon complétée: ${item.lesson.title}`,
				href: item.lesson.module.course?.id ? `/admin/courses/${item.lesson.module.course.id}` : null,
				detail: item.lesson.module.course?.title || "Cours",
			})),
	]
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
		.slice(0, 15);

	return (
		<div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-neutral-100">
			<div className="flex items-center justify-end mb-2">
				<Link href={metadata.btnLink}>
					<Button className="rounded-sm">Retour aux Membres</Button>
				</Link>
			</div>
			<div className="space-y-8">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center gap-4">
							<Avatar className="h-14 w-14">
								<AvatarImage src={user.image || ""} />
								<AvatarFallback>{initials}</AvatarFallback>
							</Avatar>
							<div>
								<p className="text-lg font-semibold">{user.name || "Sans nom"}</p>
								<p className="text-sm text-muted-foreground">{user.email}</p>
								<div className="mt-1 flex items-center gap-2">
									<Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>{user.role}</Badge>
									<Badge variant="outline">{user.membership}</Badge>
									<Badge variant={user.emailVerified ? "default" : "outline"}>{user.emailVerified ? "Email vérifié" : "Email non vérifié"}</Badge>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Stats rapides */}
				<div className="grid gap-4 md:grid-cols-3">
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-muted-foreground">Inscriptions</p>
									<p className="text-2xl font-bold">{user._count.enrollments}</p>
								</div>
								<BookOpen className="h-8 w-8 text-muted-foreground" />
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-6">
							<div>
								<p className="text-sm text-muted-foreground">Quiz passés</p>
								<p className="text-2xl font-bold">{user._count.quizAttempts}</p>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-6">
							<div>
								<p className="text-sm text-muted-foreground">Certificats</p>
								<p className="text-2xl font-bold">{user._count.certificates}</p>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="grid gap-6 lg:grid-cols-3 h-full">
					<div className="lg:col-span-2 h-full">
						<UserForm
							user={user}
							currentUserId={session.user.id}
						/>

						<Card className="mt-6">
							<CardHeader>
								<CardTitle className="text-base">Timeline d&apos;activité</CardTitle>
							</CardHeader>
							<CardContent>
								{timeline.length === 0 ? (
									<p className="text-sm text-muted-foreground">Aucune activité récente.</p>
								) : (
									<ul className="space-y-3 text-sm">
										{timeline.map((entry) => {
											const Icon = entry.icon;
											return (
												<li
													key={entry.key}
													className="rounded-md border bg-background p-3"
												>
													<div className="flex items-start gap-3">
														<Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
														<div className="space-y-1">
															<p className="text-xs text-muted-foreground">{entry.type}</p>
															{entry.href ? (
																<Link
																	href={entry.href}
																	className="font-medium hover:underline"
																>
																	{entry.label}
																</Link>
															) : (
																<p className="font-medium">{entry.label}</p>
															)}
															<p className="text-xs text-muted-foreground">
																{entry.detail} • {new Date(entry.date).toLocaleDateString("fr-FR")}
															</p>
														</div>
													</div>
												</li>
											);
										})}
									</ul>
								)}
							</CardContent>
						</Card>
					</div>

					<div className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Actions rapides</CardTitle>
							</CardHeader>
							<CardContent>
								<UserQuickActions
									user={user}
									currentUserId={session.user.id}
								/>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-base">Generateur de certificat</CardTitle>
							</CardHeader>
							<CardContent>
								<ManualCertificateGenerator
									userId={user.id}
									courses={certificateCourses}
								/>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-base">Compte</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3 text-sm">
								<div className="flex items-start gap-2">
									<UserRound className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
									<div>
										<p className="font-medium">{user.username ? `@${user.username}` : "Aucun username"}</p>
										<p className="text-xs text-muted-foreground">Identifiant public</p>
									</div>
								</div>
								<div className="flex items-start gap-2">
									<Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
									<div>
										<p className="font-medium">{user.email}</p>
										<p className="text-xs text-muted-foreground">{user.emailVerified ? "Vérifié" : "Non vérifié"}</p>
									</div>
								</div>
								<div className="flex items-start gap-2">
									<Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
									<div>
										<p className="font-medium">
											{new Date(user.createdAt).toLocaleDateString("fr-FR", {
												day: "numeric",
												month: "long",
												year: "numeric",
											})}
										</p>
										<p className="text-xs text-muted-foreground">Date d&apos;inscription</p>
									</div>
								</div>
								<div className="flex items-start gap-2">
									<Clock3 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
									<div>
										<p className="font-medium">{user.membership}</p>
										<p className="text-xs text-muted-foreground">Plan actuel</p>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-base">Cours suivis ({user.enrollments.length})</CardTitle>
							</CardHeader>
							<CardContent>
								{user.enrollments.length === 0 ? (
									<p className="text-sm text-muted-foreground">Aucune inscription</p>
								) : (
									<ul className="space-y-2 text-sm">
										{user.enrollments.map((enr) => (
											<li key={enr.id}>
												<Link
													href={`/admin/courses/${enr.course.id}`}
													className="hover:underline"
												>
													{enr.course.title}
												</Link>
												<p className="text-xs text-muted-foreground">Inscrit le {new Date(enr.enrolledAt).toLocaleDateString("fr-FR")}</p>
											</li>
										))}
									</ul>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-base text-destructive">Zone dangereuse</CardTitle>
							</CardHeader>
							<CardContent>
								<UserDeleteButton
									user={user}
									disabled={isSelf}
									disabledReason="Impossible de te supprimer toi-même"
								/>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
