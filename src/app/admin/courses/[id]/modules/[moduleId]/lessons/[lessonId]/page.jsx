import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LessonForm } from "@/components/admin/lesson-form";
import { Card } from "@/components/ui/card";

export default async function EditLessonPage({ params }) {
	const { id: courseId, moduleId, lessonId } = await params;

	const lesson = await prisma.lesson.findUnique({
		where: { id: lessonId },
		include: { module: { select: { id: true, title: true, courseId: true } } },
	});
	if (!lesson || lesson.moduleId !== moduleId || lesson.module.courseId !== courseId) notFound();

	return (
		<div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-neutral-100">
			{/* LESSON TOPBAR */}
			<div>
				<Link
					href={`/admin/courses/${courseId}/modules/${moduleId}`}
					className="text-sm text-muted-foreground hover:underline"
				>
					← Retour au module: {lesson.module.title}
				</Link>
				<h1 className="mt-2 text-2xl font-bold">Modifier la leçon</h1>
			</div>

			<Card className="w-full p-6 shadow-sm">
				<LessonForm
					courseId={courseId}
					moduleId={moduleId}
					lesson={lesson}
				/>
			</Card>
		</div>
	);
}
