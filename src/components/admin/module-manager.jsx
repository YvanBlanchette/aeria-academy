"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown, Pencil, Trash2, ListChecks, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { createModule, updateModule, deleteModule, moveModule } from "@/app/admin/courses/[id]/actions";

export function ModuleManager({ course }) {
	const [addOpen, setAddOpen] = useState(false);
	const [editing, setEditing] = useState(null);
	const [deleting, setDeleting] = useState(null);
	const [busy, setBusy] = useState(false);

	// Garde de sécurité
	if (!course?.id) {
		return null;
	}

	const modules = course.modules || [];

	async function handleCreate(e) {
		e.preventDefault();
		const form = e.currentTarget;
		const fd = new FormData(form);

		setBusy(true);
		const result = await createModule(course.id, fd);
		setBusy(false);

		if (result?.error) return toast.error(result.error);
		toast.success("Module ajouté");
		form.reset();
		setAddOpen(false);
	}

	async function handleUpdate(e) {
		e.preventDefault();
		const currentEditing = editing;
		if (!currentEditing?.id) return;

		const fd = new FormData(e.currentTarget);
		setBusy(true);
		const result = await updateModule(currentEditing.id, fd);
		setBusy(false);

		if (result?.error) return toast.error(result.error);
		toast.success("Module mis à jour");
		setEditing(null);
	}

	async function handleDelete() {
		const currentDeleting = deleting;
		if (!currentDeleting?.id) return;

		setBusy(true);
		const result = await deleteModule(currentDeleting.id);
		setBusy(false);

		if (result?.error) toast.error(result.error);
		else toast.success("Module supprimé");
		setDeleting(null);
	}

	async function handleMove(moduleId, direction) {
		if (!moduleId || busy) return;
		setBusy(true);
		const result = await moveModule(moduleId, direction);
		setBusy(false);
		if (result?.error) toast.error(result.error);
	}

	return (
		<Card className="h-full w-full verflow-y-auto rounded-sm shadow-sm">
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Modules</CardTitle>
						<CardDescription>Structure du cours en modules avec leçons et quiz</CardDescription>
					</div>
					<Dialog
						open={addOpen}
						onOpenChange={setAddOpen}
					>
						<DialogTrigger asChild>
							<Button>+ Ajouter Module</Button>
						</DialogTrigger>
						<DialogContent>
							<form onSubmit={handleCreate}>
								<DialogHeader>
									<DialogTitle>Nouveau module</DialogTitle>
									<DialogDescription>Donne un titre. Tu pourras ajouter leçons et quiz ensuite.</DialogDescription>
								</DialogHeader>
								<div className="space-y-2 py-4">
									<Label htmlFor="new-module-title">Titre</Label>
									<Input
										id="new-module-title"
										name="title"
										placeholder="Ex: Les fondamentaux"
										required
									/>
								</div>
								<DialogFooter>
									<Button
										type="button"
										variant="outline"
										onClick={() => setAddOpen(false)}
									>
										Annuler
									</Button>
									<Button
										type="submit"
										disabled={busy}
									>
										Créer
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</div>
			</CardHeader>
			<CardContent>
				{modules.length === 0 ? (
					<p className="py-8 text-center text-sm text-muted-foreground">Aucun module. Clique &quot;Ajouter un module&quot; pour commencer.</p>
				) : (
					<ul className="space-y-2">
						{modules.map((m, idx) => {
							if (!m?.id) return null;
							const lessonCount = m._count?.lessons ?? 0;
							const hasQuiz = !!m.quiz;
							return (
								<li
									key={m.id}
									className="flex items-center gap-2 rounded-md border p-3 shadow-sm"
								>
									<div className="flex flex-col">
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6"
											disabled={idx === 0 || busy}
											onClick={() => handleMove(m.id, "up")}
										>
											<ChevronUp className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6"
											disabled={idx === modules.length - 1 || busy}
											onClick={() => handleMove(m.id, "down")}
										>
											<ChevronDown className="h-4 w-4" />
										</Button>
									</div>

									<div className="flex-1">
										<Link
											href={`/admin/courses/${course.id}/modules/${m.id}`}
											className="font-medium hover:underline"
										>
											{m.title}
										</Link>
										<div className="flex gap-3 text-xs text-muted-foreground mt-1">
											<span className="flex items-center gap-1">
												<BookOpen className="h-3 w-3" />
												{lessonCount} leçon(s)
											</span>
											{hasQuiz && (
												<span className="flex items-center gap-1">
													<ListChecks className="h-3 w-3" /> Quiz
												</span>
											)}
										</div>
									</div>

									<Button
										variant="ghost"
										size="icon"
										onClick={() => setEditing({ id: m.id, title: m.title })}
									>
										<Pencil className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="text-destructive hover:text-destructive"
										onClick={() => setDeleting({ id: m.id, title: m.title })}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</li>
							);
						})}
					</ul>
				)}
			</CardContent>

			<Dialog
				open={!!editing}
				onOpenChange={(open) => !open && setEditing(null)}
			>
				<DialogContent>
					{editing ? (
						<form onSubmit={handleUpdate}>
							<DialogHeader>
								<DialogTitle>Modifier le module</DialogTitle>
							</DialogHeader>
							<div className="space-y-2 py-4">
								<Label htmlFor="edit-module-title">Titre</Label>
								<Input
									id="edit-module-title"
									name="title"
									defaultValue={editing.title || ""}
									required
								/>
							</div>
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setEditing(null)}
								>
									Annuler
								</Button>
								<Button
									type="submit"
									disabled={busy}
								>
									Enregistrer
								</Button>
							</DialogFooter>
						</form>
					) : null}
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={!!deleting}
				onOpenChange={(open) => !open && setDeleting(null)}
			>
				<AlertDialogContent>
					{deleting ? (
						<>
							<AlertDialogHeader>
								<AlertDialogTitle>Supprimer le module ?</AlertDialogTitle>
								<AlertDialogDescription>&quot;{deleting.title}&quot; et toutes ses leçons et son quiz seront supprimés.</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Annuler</AlertDialogCancel>
								<AlertDialogAction
									onClick={handleDelete}
									disabled={busy}
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								>
									Supprimer
								</AlertDialogAction>
							</AlertDialogFooter>
						</>
					) : null}
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}
