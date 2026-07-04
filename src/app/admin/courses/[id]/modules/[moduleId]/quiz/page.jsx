import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { QuizEditor } from "@/components/admin/quiz-editor";

export default async function QuizPage({ params }) {
	const { id: courseId, moduleId } = await params;

	const mod = await prisma.module.findUnique({
		where: { id: moduleId },
		select: {
			id: true,
			title: true,
			courseId: true,
		},
	});

	if (!mod || mod.courseId !== courseId) notFound();

	const quiz = await prisma.quiz.upsert({
		where: { moduleId },
		update: {},
		create: {
			title: `Quiz du module: ${mod.title}`,
			passingScore: 70,
			moduleId,
		},
		include: {
			questions: {
				orderBy: { order: "asc" },
				include: { options: true },
			},
		},
	});

	return (
		<div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-neutral-100">
			<div>
				<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
					<Link
						href={`/admin/courses/${courseId}`}
						className="hover:underline"
					>
						Cours
					</Link>
					<span>/</span>
					<Link
						href={`/admin/courses/${courseId}/modules/${moduleId}`}
						className="hover:underline"
					>
						{mod.title}
					</Link>
					<span>/</span>
					<span>Quiz</span>
				</div>
				<h1 className="mt-2 text-3xl font-bold">Quiz du module</h1>
			</div>
			<QuizEditor
				courseId={courseId}
				moduleId={moduleId}
				quiz={quiz}
			/>
		</div>
	);
}
