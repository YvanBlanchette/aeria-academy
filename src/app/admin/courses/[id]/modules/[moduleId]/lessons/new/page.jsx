import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LessonForm } from "@/components/admin/lesson-form";
import { Card } from "@/components/ui/card";

export default async function NewLessonPage({ params }) {
	const { id: courseId, moduleId } = await params;

	const mod = await prisma.module.findUnique({
		where: { id: moduleId },
		select: { id: true, title: true, courseId: true },
	});
	if (!mod || mod.courseId !== courseId) notFound();

	return (
		<div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-neutral-100">
			{/* LESSON TOPBAR */}
			<div>
				<Link
					href={`/admin/courses/${courseId}/modules/${moduleId}`}
					className="text-sm text-muted-foreground hover:underline"
				>
					← Retour au module: {mod.title}
				</Link>
				<h1 className="mt-2 text-2xl font-bold">Nouvelle leçon</h1>
			</div>

			<Card className="w-full p-6 shadow-sm">
				<LessonForm
					courseId={courseId}
					moduleId={moduleId}
				/>
			</Card>
		</div>
	);
}
