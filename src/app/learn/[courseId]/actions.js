"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

function normalizeQuizPolicy(rawSettings) {
	const enableQuizRetakes = rawSettings?.enableQuizRetakes !== false;
	const parsedLimit = Number.parseInt(String(rawSettings?.quizRetakeLimit ?? "3"), 10);
	const quizRetakeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 3;
	const enableCertificates = rawSettings?.enableCertificates !== false;

	return {
		enableQuizRetakes,
		quizRetakeLimit,
		enableCertificates,
	};
}

export async function markLessonComplete(courseId, lessonId) {
	const session = await auth();
	if (!session) return { error: "Non authentifié" };

	// Vérifier que l'utilisateur est inscrit au cours
	const enrollment = await prisma.enrollment.findUnique({
		where: {
			userId_courseId: { userId: session.user.id, courseId },
		},
	});
	if (!enrollment) return { error: "Non inscrit à ce cours" };

	const existingProgress = await prisma.lessonProgress.findUnique({
		where: {
			userId_lessonId: { userId: session.user.id, lessonId },
		},
	});

	const shouldComplete = !existingProgress?.completed;

	await prisma.lessonProgress.upsert({
		where: {
			userId_lessonId: { userId: session.user.id, lessonId },
		},
		update: { completed: shouldComplete, completedAt: shouldComplete ? new Date() : null },
		create: {
			userId: session.user.id,
			lessonId,
			completed: shouldComplete,
			completedAt: shouldComplete ? new Date() : null,
		},
	});

	revalidatePath(`/learn/${courseId}`);
	return { success: true, completed: shouldComplete };
}

export async function submitQuizAttempt(courseId, quizId, answersByQuestionId) {
	const session = await auth();
	if (!session) return { error: "Non authentifie" };

	const enrollment = await prisma.enrollment.findUnique({
		where: {
			userId_courseId: { userId: session.user.id, courseId },
		},
	});
	if (!enrollment) return { error: "Non inscrit a ce cours" };

	const [quiz, existingAttempts, settingsRow] = await Promise.all([
		prisma.quiz.findUnique({
			where: { id: quizId },
			include: {
				module: { select: { id: true, courseId: true } },
				questions: {
					orderBy: { order: "asc" },
					include: {
						options: {
							select: {
								id: true,
								isCorrect: true,
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
			select: { id: true, score: true, passed: true, createdAt: true },
			orderBy: { createdAt: "desc" },
		}),
		prisma.platformSettings.findUnique({
			where: { id: "global" },
			select: { data: true },
		}),
	]);

	if (!quiz || quiz.module.courseId !== courseId) {
		return { error: "Quiz introuvable" };
	}

	const policy = normalizeQuizPolicy(settingsRow?.data);
	if (!policy.enableQuizRetakes && existingAttempts.length > 0) {
		return { error: "Les reprises de quiz sont desactivees" };
	}

	if (policy.enableQuizRetakes && existingAttempts.length >= policy.quizRetakeLimit) {
		return { error: `Nombre maximum de tentatives atteint (${policy.quizRetakeLimit})` };
	}

	if (!quiz.questions.length) {
		return { error: "Ce quiz ne contient pas encore de questions" };
	}

	const safeAnswers = answersByQuestionId && typeof answersByQuestionId === "object" ? answersByQuestionId : {};

	let correctCount = 0;
	for (const question of quiz.questions) {
		const selectedIds = Array.isArray(safeAnswers[question.id]) ? safeAnswers[question.id].map(String).sort() : [];
		const expectedIds = question.options
			.filter((option) => option.isCorrect)
			.map((option) => option.id)
			.sort();

		const isCorrect = selectedIds.length === expectedIds.length && selectedIds.every((value, index) => value === expectedIds[index]);
		if (isCorrect) {
			correctCount += 1;
		}
	}

	const score = Math.round((correctCount / quiz.questions.length) * 100);
	const passed = score >= quiz.passingScore;

	const attempt = await prisma.quizAttempt.create({
		data: {
			userId: session.user.id,
			quizId,
			score,
			passed,
			answers: safeAnswers,
		},
		select: {
			id: true,
			createdAt: true,
		},
	});

	revalidatePath(`/learn/${courseId}/quiz/${quizId}`);

	let certificateUnlocked = false;
	let certificateId = null;

	if (passed && policy.enableCertificates) {
		const courseQuizzes = await prisma.quiz.findMany({
			where: {
				module: {
					courseId,
				},
			},
			select: {
				id: true,
			},
		});

		if (courseQuizzes.length > 0) {
			const passedAttempts = await prisma.quizAttempt.findMany({
				where: {
					userId: session.user.id,
					passed: true,
					quizId: {
						in: courseQuizzes.map((quiz) => quiz.id),
					},
				},
				select: {
					quizId: true,
				},
				distinct: ["quizId"],
			});

			const allCourseQuizzesPassed = passedAttempts.length >= courseQuizzes.length;

			if (allCourseQuizzesPassed) {
				const certificate = await prisma.certificate.upsert({
					where: {
						userId_courseId: {
							userId: session.user.id,
							courseId,
						},
					},
					update: {},
					create: {
						userId: session.user.id,
						courseId,
					},
					select: {
						id: true,
						issuedAt: true,
					},
				});

				certificateUnlocked = true;
				certificateId = certificate.id;
				revalidatePath("/dashboard");
				revalidatePath("/dashboard/certificates");
			}
		}
	}

	return {
		success: true,
		attemptId: attempt.id,
		score,
		passed,
		passingScore: quiz.passingScore,
		correctCount,
		totalQuestions: quiz.questions.length,
		attemptsUsed: existingAttempts.length + 1,
		attemptsRemaining: policy.enableQuizRetakes ? Math.max(0, policy.quizRetakeLimit - (existingAttempts.length + 1)) : 0,
		enableQuizRetakes: policy.enableQuizRetakes,
		certificateUnlocked,
		certificateId,
	};
}
