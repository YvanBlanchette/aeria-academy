"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListChecks, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { createOrUpdateQuiz, deleteQuiz } from "@/app/admin/courses/[id]/modules/[moduleId]/actions";

export function QuizSection({ courseId, moduleId, quiz }) {
	const router = useRouter();
	const [deleting, setDeleting] = useState(false);

	async function handleCreate() {
		const fd = new FormData();
		fd.set("title", "Quiz du module");
		fd.set("passingScore", "70");
		const result = await createOrUpdateQuiz(courseId, moduleId, fd);
		if (result?.error) toast.error(result.error);
		else {
			toast.success("Quiz créé");
			router.refresh();
		}
	}

	async function handleDelete() {
		const result = await deleteQuiz(courseId, moduleId);
		if (result?.error) toast.error(result.error);
		else {
			toast.success("Quiz supprimé");
			router.refresh();
		}
		setDeleting(false);
	}

	return (
		<Card className="shadow-sm">
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<ListChecks className="h-5 w-5" /> Quiz du module
						</CardTitle>
						<CardDescription>Test de validation à la fin du module</CardDescription>
					</div>
					{!quiz && <Button onClick={handleCreate}>+ Créer le quiz</Button>}
				</div>
			</CardHeader>
			<CardContent>
				{!quiz ? (
					<p className="py-8 text-center text-sm text-muted-foreground shadow-sm">Aucun quiz attaché à ce module</p>
				) : (
					<div className="flex items-center justify-between rounded-md border p-4 shadow-sm">
						<div>
							<p className="font-medium">{quiz.title}</p>
							<p className="text-sm text-muted-foreground">
								{quiz.questions.length} question(s) · Score min : {quiz.passingScore}%
							</p>
						</div>
						<div className="flex gap-2">
							<Button
								asChild
								variant="outline"
							>
								<Link href={`/admin/courses/${courseId}/modules/${moduleId}/quiz`}>Modifier</Link>
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="text-destructive hover:text-destructive"
								onClick={() => setDeleting(true)}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</div>
				)}
			</CardContent>

			<AlertDialog
				open={deleting}
				onOpenChange={setDeleting}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer le quiz ?</AlertDialogTitle>
						<AlertDialogDescription>Toutes les questions et résultats seront supprimés.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Supprimer
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}
