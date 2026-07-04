import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { ContentProtection } from "@/components/ui/content-protection";
import { QuizAttemptForm } from "@/components/users/quiz-attempt-form";

function normalizeQuizPolicy(rawSettings) {
	const enableQuizRetakes = rawSettings?.enableQuizRetakes !== false;
	const parsedLimit = Number.parseInt(String(rawSettings?.quizRetakeLimit ?? "3"), 10);
	const quizRetakeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 3;

	return {
		enableQuizRetakes,
		quizRetakeLimit,
	};
}

export default async function QuizAttemptPage({ params }) {
	const session = await auth();
	const { courseId, quizId } = await params;

	const [quiz, attempts, settingsRow] = await Promise.all([
		prisma.quiz.findUnique({
			where: { id: quizId },
			include: {
				module: {
					select: {
						id: true,
						title: true,
						courseId: true,
						lessons: {
							orderBy: { order: "asc" },
							select: { id: true },
						},
					},
				},
				questions: {
					orderBy: { order: "asc" },
					select: {
						id: true,
						text: true,
						order: true,
						options: {
							select: {
								id: true,
								text: true,
							},
						},
					},
				},
			},
		}),
		prisma.quizAttempt.findMany({
			where: {
				quizId,
				userId: session.user.id,
			},
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				score: true,
				passed: true,
				createdAt: true,
			},
		}),
		prisma.platformSettings.findUnique({
			where: { id: "global" },
			select: { data: true },
		}),
	]);

	if (!quiz || quiz.module.courseId !== courseId) {
		notFound();
	}

	const policy = normalizeQuizPolicy(settingsRow?.data);
	const attemptsUsed = attempts.length;
	const attemptsRemaining = policy.enableQuizRetakes ? Math.max(0, policy.quizRetakeLimit - attemptsUsed) : attemptsUsed > 0 ? 0 : 1;
	const canAttempt = attemptsRemaining > 0;
	const bestScore = attempts.length ? Math.max(...attempts.map((attempt) => attempt.score)) : null;
	const hasPassed = attempts.some((attempt) => attempt.passed);
	const backLessonId = quiz.module.lessons[quiz.module.lessons.length - 1]?.id || null;

	return (
		<ContentProtection>
			<div className="container mx-auto w-[92%] max-w-5xl space-y-5 py-4 sm:w-[90%] sm:space-y-6 sm:py-6 lg:w-full">
				<Card className="space-y-4 rounded bg-white px-4 py-5 shadow-md sm:px-6 sm:py-7 lg:px-12 lg:py-10">
					{/* QUIZ TOPBAR */}
					<div className="flex flex-wrap items-center justify-between gap-2">
						<Link
							href={backLessonId ? `/learn/${courseId}/${backLessonId}` : `/learn/${courseId}`}
							className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
						>
							<ArrowLeft className="h-4 w-4" /> Retour au module
						</Link>
						{hasPassed ? (
							<span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
								<Trophy className="h-3.5 w-3.5" /> Quiz deja reussi
							</span>
						) : null}
					</div>

					{/* QUIZ HEADER */}
					<div>
						<h1 className="text-xl font-bold leading-tight sm:text-2xl lg:text-3xl">{quiz.title}</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							{quiz.questions.length} question(s) · Seuil de reussite {quiz.passingScore}%
						</p>
						{bestScore !== null ? <p className="text-sm text-muted-foreground">Meilleur score: {bestScore}%</p> : null}
					</div>

					<QuizAttemptForm
						courseId={courseId}
						quiz={quiz}
						canAttempt={canAttempt}
						attemptsUsed={attemptsUsed}
						attemptsRemaining={attemptsRemaining}
						enableQuizRetakes={policy.enableQuizRetakes}
					/>
				</Card>
			</div>
		</ContentProtection>
	);
}
