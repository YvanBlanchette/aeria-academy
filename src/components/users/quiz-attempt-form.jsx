"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { submitQuizAttempt } from "@/app/learn/[courseId]/actions";
import { Button } from "@/components/ui/button";

function buildInitialAnswers(questions) {
	const initial = {};
	for (const question of questions) {
		initial[question.id] = [];
	}
	return initial;
}

export function QuizAttemptForm({ courseId, quiz, canAttempt, attemptsUsed, attemptsRemaining, enableQuizRetakes }) {
	const router = useRouter();
	const [answers, setAnswers] = useState(() => buildInitialAnswers(quiz.questions));
	const [submitting, setSubmitting] = useState(false);
	const [result, setResult] = useState(null);

	const answeredCount = useMemo(() => Object.values(answers).filter((value) => Array.isArray(value) && value.length > 0).length, [answers]);

	function toggleOption(questionId, optionId) {
		setAnswers((current) => {
			const selected = Array.isArray(current[questionId]) ? current[questionId] : [];
			const exists = selected.includes(optionId);
			return {
				...current,
				[questionId]: exists ? selected.filter((value) => value !== optionId) : [...selected, optionId],
			};
		});
	}

	function resetForm() {
		setAnswers(buildInitialAnswers(quiz.questions));
		setResult(null);
	}

	function handleShareBadge() {
		if (!result?.shareBadgeText) return;
		const targetUrl = `/community?prefill=${encodeURIComponent(result.shareBadgeText)}`;
		router.push(targetUrl);
	}

	async function handleSubmit() {
		if (!canAttempt) {
			toast.error("Aucune tentative disponible pour ce quiz");
			return;
		}

		if (answeredCount === 0) {
			toast.error("Selectionne au moins une reponse avant de soumettre");
			return;
		}

		setSubmitting(true);
		try {
			const payload = quiz.questions.reduce((acc, question) => {
				acc[question.id] = Array.isArray(answers[question.id]) ? answers[question.id] : [];
				return acc;
			}, {});

			const response = await submitQuizAttempt(courseId, quiz.id, payload);
			if (response?.error) {
				toast.error(response.error);
				return;
			}

			setResult(response);
			if (response.quizBadgeUnlocked) {
				toast.success(`Nouveau badge debloque: ${response.quizBadgeTitle || "Quiz reussi"}`);
			}
			if (response.certificateUnlocked) {
				toast.success("Bravo! Tu as debloque ton certificat pour ce cours.");
			} else {
				toast.success(response.passed ? "Quiz reussi" : "Tentative enregistree");
			}
			router.refresh();
		} catch {
			toast.error("Impossible d'envoyer le quiz pour le moment");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="space-y-5">
			{/* QUIZ HEADER */}
			<div className="rounded-2xl border bg-white p-4 text-sm text-muted-foreground">
				<p>
					Repondues: {answeredCount}/{quiz.questions.length}
				</p>
				<p>
					Tentatives utilisees: {attemptsUsed}
					{enableQuizRetakes ? ` · Restantes: ${attemptsRemaining}` : ""}
				</p>
			</div>

			{/* QUESTIONS */}
			<div className="space-y-4">
				{quiz.questions.map((question, index) => (
					<div
						key={question.id}
						className="rounded-2xl border bg-white p-4"
					>
						<p className="mb-3 text-sm font-medium text-foreground">
							Q{index + 1}. {question.text}
						</p>
						<div className="space-y-2">
							{question.options.map((option) => {
								const checked = Array.isArray(answers[question.id]) ? answers[question.id].includes(option.id) : false;
								return (
									<label
										key={option.id}
										className="flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
									>
										<input
											type="checkbox"
											checked={checked}
											onChange={() => toggleOption(question.id, option.id)}
											className="mt-1 h-4 w-4 rounded border-input"
										/>
										<span>{option.text}</span>
									</label>
								);
							})}
						</div>
					</div>
				))}
			</div>

			{/* RESULT */}
			{result ? (
				<div
					className={`rounded-2xl border p-4 text-sm ${result.passed ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}
				>
					<p className="font-medium">
						Score: {result.score}% ({result.correctCount}/{result.totalQuestions})
					</p>
					<p>Seuil de reussite: {result.passingScore}%</p>
					<p>{result.passed ? "Bravo, quiz reussi." : "Quiz non reussi, tu peux reessayer si une tentative est disponible."}</p>
					{result.quizBadgeUnlocked ? (
						<Button
							type="button"
							variant="outline"
							onClick={handleShareBadge}
							className="mt-3 rounded-full"
						>
							Partager mon badge dans la communaute
						</Button>
					) : null}
				</div>
			) : null}

			{/* ACTIONS */}
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					onClick={handleSubmit}
					disabled={submitting || !canAttempt}
					className="rounded-full"
				>
					{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
					Soumettre le quiz
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={resetForm}
					disabled={submitting}
					className="rounded-full"
				>
					Reinitialiser
				</Button>
			</div>
		</div>
	);
}
