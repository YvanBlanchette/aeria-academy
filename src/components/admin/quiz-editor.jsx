"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Check, X, Pencil } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createOrUpdateQuiz, saveQuestion, deleteQuestion } from "@/app/admin/courses/[id]/modules/[moduleId]/actions";

export function QuizEditor({ courseId, moduleId, quiz }) {
	const router = useRouter();
	const [editingQuestion, setEditingQuestion] = useState(null);
	const [deletingQuestion, setDeletingQuestion] = useState(null);

	async function handleSaveQuizMeta(e) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		const result = await createOrUpdateQuiz(courseId, moduleId, fd);
		if (result?.error) toast.error(result.error);
		else toast.success("Quiz mis à jour");
	}

	function openNewQuestion() {
		setEditingQuestion({
			id: null,
			text: "",
			options: [
				{ text: "", isCorrect: false },
				{ text: "", isCorrect: false },
			],
		});
	}

	function openEditQuestion(q) {
		setEditingQuestion({
			id: q.id,
			text: q.text,
			options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
		});
	}

	async function handleSaveQuestion() {
		if (!editingQuestion.text.trim() || editingQuestion.text.length < 3) {
			return toast.error("La question doit faire au moins 3 caractères");
		}
		if (editingQuestion.options.some((o) => !o.text.trim())) {
			return toast.error("Toutes les options doivent avoir un texte");
		}
		if (!editingQuestion.options.some((o) => o.isCorrect)) {
			return toast.error("Au moins une bonne réponse requise");
		}

		const result = await saveQuestion(courseId, moduleId, editingQuestion);
		if (result?.error) return toast.error(result.error);

		toast.success(editingQuestion.id ? "Question mise à jour" : "Question ajoutée");
		setEditingQuestion(null);
		router.refresh();
	}

	async function handleDeleteQuestion() {
		const currentDeletingQuestion = deletingQuestion;
		if (!currentDeletingQuestion?.id) {
			setDeletingQuestion(null);
			return;
		}

		const result = await deleteQuestion(courseId, moduleId, currentDeletingQuestion.id);
		if (result?.error) toast.error(result.error);
		else toast.success("Question supprimée");
		setDeletingQuestion(null);
		router.refresh();
	}

	function updateOption(idx, field, value) {
		setEditingQuestion({
			...editingQuestion,
			options: editingQuestion.options.map((o, i) => (i === idx ? { ...o, [field]: value } : o)),
		});
	}

	function addOption() {
		setEditingQuestion({
			...editingQuestion,
			options: [...editingQuestion.options, { text: "", isCorrect: false }],
		});
	}

	function removeOption(idx) {
		if (editingQuestion.options.length <= 2) {
			return toast.error("Au moins 2 options requises");
		}
		setEditingQuestion({
			...editingQuestion,
			options: editingQuestion.options.filter((_, i) => i !== idx),
		});
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Paramètres du quiz</CardTitle>
					<CardDescription>Titre et score minimum de réussite</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={handleSaveQuizMeta}
						className="space-y-4 w-full"
					>
						<div className="space-y-2">
							<Label htmlFor="title">Titre du quiz</Label>
							<Input
								id="title"
								name="title"
								defaultValue={quiz.title}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="passingScore">Score minimum (%)</Label>
							<Input
								id="passingScore"
								name="passingScore"
								type="number"
								min="0"
								max="100"
								defaultValue={quiz.passingScore}
								required
							/>
						</div>
						<Button type="submit">Enregistrer</Button>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Questions</CardTitle>
							<CardDescription>{quiz.questions.length} question(s)</CardDescription>
						</div>
						<Button onClick={openNewQuestion}>
							<Plus className="mr-1 h-4 w-4" /> Ajouter une question
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{quiz.questions.length === 0 ? (
						<p className="py-8 text-center text-sm text-muted-foreground">Aucune question pour l&apos;instant</p>
					) : (
						<ul className="space-y-3">
							{quiz.questions.map((q, idx) => (
								<li
									key={q.id}
									className="rounded-md border p-4"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="flex-1">
											<p className="font-medium">
												<span className="text-muted-foreground mr-2">Q{idx + 1}.</span>
												{q.text}
											</p>
											<ul className="mt-3 space-y-1">
												{q.options.map((o) => (
													<li
														key={o.id}
														className="flex items-center gap-2 text-sm"
													>
														{o.isCorrect ? <Check className="h-4 w-4 text-green-600 shrink-0" /> : <X className="h-4 w-4 text-muted-foreground shrink-0" />}
														<span className={o.isCorrect ? "text-green-700" : ""}>{o.text}</span>
													</li>
												))}
											</ul>
										</div>
										<div className="flex gap-1">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => openEditQuestion(q)}
											>
												<Pencil className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="text-destructive hover:text-destructive"
												onClick={() => setDeletingQuestion(q)}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={!!editingQuestion}
				onOpenChange={(open) => !open && setEditingQuestion(null)}
			>
				<DialogContent className="w-full max-w-[90%] max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{editingQuestion?.id ? "Modifier la question" : "Nouvelle question"}</DialogTitle>
						<DialogDescription>Coche la (ou les) bonne(s) réponse(s)</DialogDescription>
					</DialogHeader>

					{editingQuestion && (
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label>Question</Label>
								<Textarea
									value={editingQuestion.text}
									onChange={(e) => setEditingQuestion({ ...editingQuestion, text: e.target.value })}
									placeholder="Ex: Que signifie AERIA ?"
									rows={2}
								/>
							</div>

							<div className="space-y-2">
								<Label>Options</Label>
								{editingQuestion.options.map((option, idx) => (
									<div
										key={idx}
										className="flex items-center gap-2"
									>
										<input
											type="checkbox"
											checked={option.isCorrect}
											onChange={(e) => updateOption(idx, "isCorrect", e.target.checked)}
											className="h-4 w-4 rounded border-input"
										/>
										<Input
											value={option.text}
											onChange={(e) => updateOption(idx, "text", e.target.value)}
											placeholder={`Option ${idx + 1}`}
										/>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => removeOption(idx)}
											type="button"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								))}
								<Button
									variant="outline"
									size="sm"
									onClick={addOption}
									type="button"
								>
									<Plus className="mr-1 h-3 w-3" /> Ajouter une option
								</Button>
							</div>
						</div>
					)}

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setEditingQuestion(null)}
						>
							Annuler
						</Button>
						<Button onClick={handleSaveQuestion}>Enregistrer</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={!!deletingQuestion}
				onOpenChange={(open) => !open && setDeletingQuestion(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer cette question ?</AlertDialogTitle>
						<AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteQuestion}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Supprimer
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
