import { notFound, redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canAccessCourse } from "@/lib/access";
import { LearnShell } from "@/components/users/learn-shell";
import { UserWatermark } from "@/components/users/user-watermark";
import { NotificationsProviderWithToasts } from "@/features/community/notifications/notifications-provider-with-toasts";

export default async function LearnLayout({ children, params }) {
	const { courseId } = await params;
	const session = await auth();
	if (!session) redirect(`/login?callbackUrl=/learn/${courseId}`);

	const freshUser = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: {
			id: true,
			name: true,
			email: true,
			image: true,
			role: true,
			membership: true,
		},
	});

	const course = await prisma.course.findUnique({
		where: { id: courseId },
		include: {
			modules: {
				orderBy: { order: "asc" },
				include: {
					lessons: { orderBy: { order: "asc" } },
					quiz: { select: { id: true } },
				},
			},
		},
	});
	if (!course) notFound();

	const access = await canAccessCourse(session.user, course);
	if (!access.allowed) {
		redirect(`/courses/${course.slug}`);
	}

	await prisma.enrollment.upsert({
		where: { userId_courseId: { userId: session.user.id, courseId } },
		update: {},
		create: { userId: session.user.id, courseId },
	});

	const progress = await prisma.lessonProgress.findMany({
		where: {
			userId: session.user.id,
			lesson: { module: { courseId } },
			completed: true,
		},
		select: { lessonId: true },
	});
	const completedSet = Array.from(new Set(progress.map((p) => p.lessonId)));

	// Lecture du cookie pour persister l'état de la sidebar entre les pages
	const cookieStore = await cookies();
	const headersList = await headers();

	// Détecte mobile via user-agent
	const userAgent = headersList.get("user-agent") || "";
	const isMobile = /android|iphone|ipad|ipod|mobile/i.test(userAgent);

	// Sur mobile : sidebar fermée par défaut
	// Sur desktop : suit le cookie (ou ouverte si pas de cookie)
	const cookieValue = cookieStore.get("sidebar_state")?.value;
	const sidebarOpen = isMobile ? false : cookieValue !== "false";

	return (
		<NotificationsProviderWithToasts userId={session.user.id}>
			<LearnShell
				course={course}
				completedSet={completedSet}
				defaultOpen={sidebarOpen}
				session={{ ...session, user: freshUser || session.user }}
			>
				<UserWatermark user={freshUser || session.user} />
				{children}
			</LearnShell>
		</NotificationsProviderWithToasts>
	);
}
