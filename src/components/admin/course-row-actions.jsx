"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { togglePublish, deleteCourse } from "@/app/admin/courses/actions";

export function CourseRowActions({ course }) {
	const router = useRouter();
	const [deleteOpen, setDeleteOpen] = useState(false);

	async function handleTogglePublish() {
		const result = await togglePublish(course.id);
		if (result?.error) {
			toast.error(result.error);
		} else {
			toast.success(course.published ? "Cours dépublié" : "Cours publié");
			router.refresh();
		}
	}

	async function handleDelete() {
		const result = await deleteCourse(course.id);
		if (result?.error) {
			toast.error(result.error);
		} else {
			toast.success("Cours supprimé");
			router.refresh();
		}
		setDeleteOpen(false);
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
					>
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem asChild>
						<Link href={`/admin/courses/${course.id}`}>
							<Eye className="mr-2 h-4 w-4" />
							Ouvrir
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleTogglePublish}>{course.published ? "Dépublier" : "Publier"}</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="text-destructive focus:text-destructive"
						onClick={() => setDeleteOpen(true)}
					>
						Supprimer
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer ce cours ?</AlertDialogTitle>
						<AlertDialogDescription>
							Cette action est irréversible. &quot;{course.title}&quot; et tous ses modules, leçons et inscriptions seront supprimés.
						</AlertDialogDescription>
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
		</>
	);
}
