"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sendLearningAchievementEmail } from "@/lib/server/learning-achievement-email";

const MODULE_COMPLETION_BADGE = "MODULE_COMPLETION";
const QUIZ_PASSED_BADGE = "QUIZ_PASSED";

function buildProfileUrl() {
	const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
	return new URL("/profile", baseUrl).toString();
}

function firstNameFromUser(user) {
	if (!user?.name) return "";
	return String(user.name).trim().split(" ")[0] || "";
}

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

	const [enrollment, lesson, existingProgress, user] = await Promise.all([
		prisma.enrollment.findUnique({
			where: {
				userId_courseId: { userId: session.user.id, courseId },
			},
		}),
		prisma.lesson.findUnique({
			where: { id: lessonId },
			select: {
				id: true,
				title: true,
				moduleId: true,
				module: {
					select: {
						id: true,
						title: true,
						courseId: true,
						course: {
							select: {
								id: true,
								title: true,
							},
						},
					},
				},
			},
		}),
		prisma.lessonProgress.findUnique({
			where: {
				userId_lessonId: { userId: session.user.id, lessonId },
			},
		}),
		prisma.user.findUnique({
			where: { id: session.user.id },
			select: { email: true, name: true },
		}),
	]);

	if (!enrollment) return { error: "Non inscrit à ce cours" };
	if (!lesson || lesson.module.courseId !== courseId) return { error: "Lecon introuvable" };

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

	let moduleBadgeUnlocked = false;
	let moduleBadgeTitle = null;

	if (shouldComplete) {
		const moduleLessons = await prisma.lesson.findMany({
			where: { moduleId: lesson.moduleId },
			select: { id: true },
		});

		if (moduleLessons.length > 0) {
			const completedLessons = await prisma.lessonProgress.count({
				where: {
					userId: session.user.id,
					completed: true,
					lessonId: {
						in: moduleLessons.map((entry) => entry.id),
					},
				},
			});

			if (completedLessons >= moduleLessons.length) {
				const badgeTitle = `Module complete: ${lesson.module.title}`;
				const badgeDescription = `Toutes les lecons du module \"${lesson.module.title}\" sont completees dans ${lesson.module.course.title}.`;
				const badgeInsert = await prisma.userBadge.createMany({
					data: {
						userId: session.user.id,
						badgeType: MODULE_COMPLETION_BADGE,
						title: badgeTitle,
						description: badgeDescription,
						courseId: lesson.module.course.id,
						moduleId: lesson.module.id,
					},
					skipDuplicates: true,
				});

				moduleBadgeUnlocked = badgeInsert.count > 0;
				moduleBadgeTitle = badgeTitle;

				if (moduleBadgeUnlocked && user?.email) {
					try {
						await sendLearningAchievementEmail({
							to: user.email,
							firstName: firstNameFromUser(user),
							badgeTitle,
							badgeDescription,
							actionUrl: buildProfileUrl(),
						});
					} catch (error) {
						console.error("[gamification] failed to send module badge email", error);
					}
				}
			}
		}
	}

	revalidatePath(`/learn/${courseId}`);
	if (moduleBadgeUnlocked) {
		revalidatePath("/profile");
		revalidatePath("/users");
	}

	return {
		success: true,
		completed: shouldComplete,
		moduleBadgeUnlocked,
		moduleBadgeTitle,
	};
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

	const [quiz, existingAttempts, settingsRow, user] = await Promise.all([
		prisma.quiz.findUnique({
			where: { id: quizId },
			include: {
				module: {
					select: {
						id: true,
						title: true,
						courseId: true,
						course: {
							select: {
								id: true,
								title: true,
							},
						},
					},
				},
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
		prisma.user.findUnique({
			where: { id: session.user.id },
			select: { email: true, name: true },
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
	let quizBadgeUnlocked = false;
	let quizBadgeTitle = null;
	let shareBadgeText = null;

	if (passed) {
		const badgeTitle = `Quiz reussi: ${quiz.title}`;
		const badgeDescription = `Quiz reussi dans le module \"${quiz.module.title}\" du cours ${quiz.module.course.title}.`;
		const quizBadgeInsert = await prisma.userBadge.createMany({
			data: {
				userId: session.user.id,
				badgeType: QUIZ_PASSED_BADGE,
				title: badgeTitle,
				description: badgeDescription,
				courseId: quiz.module.course.id,
				moduleId: quiz.module.id,
				quizId: quiz.id,
			},
			skipDuplicates: true,
		});

		quizBadgeUnlocked = quizBadgeInsert.count > 0;
		quizBadgeTitle = badgeTitle;

		if (quizBadgeUnlocked && user?.email) {
			try {
				await sendLearningAchievementEmail({
					to: user.email,
					firstName: firstNameFromUser(user),
					badgeTitle,
					badgeDescription,
					actionUrl: buildProfileUrl(),
				});
			} catch (error) {
				console.error("[gamification] failed to send quiz badge email", error);
			}
		}

		if (quizBadgeUnlocked) {
			shareBadgeText = `Je viens de debloquer le badge \"${badgeTitle}\" sur AERIA Academy! 🎉`;
		}
	}

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

	if (quizBadgeUnlocked) {
		revalidatePath("/profile");
		revalidatePath("/users");
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
		quizBadgeUnlocked,
		quizBadgeTitle,
		shareBadgeText,
		certificateUnlocked,
		certificateId,
	};
}
