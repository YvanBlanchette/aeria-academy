"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { deleteArticleInline, duplicateArticleInline, togglePublishArticle } from "@/app/admin/articles/actions";
import { MoreHorizontal, PencilLine, Eye, Copy, Upload, Download, Trash2 } from "lucide-react";

export function ArticleRowActions({ article }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	async function handleToggle() {
		setLoading(true);
		const result = await togglePublishArticle(article.id);
		setLoading(false);
		if (result?.error) {
			toast.error(result.error);
			return;
		}

		toast.success(result.published ? "Article publié" : "Article dépublié");
		router.refresh();
	}

	async function handleDelete() {
		setLoading(true);
		const result = await deleteArticleInline(article.id);
		setLoading(false);
		if (result?.error) {
			toast.error(result.error);
			setOpen(false);
			return;
		}

		toast.success("Article supprimé");
		setOpen(false);
		router.refresh();
	}

	async function handleDuplicate() {
		setLoading(true);
		const result = await duplicateArticleInline(article.id);
		setLoading(false);
		if (result?.error) {
			toast.error(result.error);
			return;
		}

		toast.success("Article dupliqué");
		if (result?.articleId) {
			router.push(`/admin/articles/${result.articleId}`);
			return;
		}
		router.refresh();
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="rounded-full"
					>
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem asChild>
						<Link href={`/admin/articles/${article.id}`}>
							<PencilLine className="mr-2 h-4 w-4" />
							Modifier
						</Link>
					</DropdownMenuItem>
					{article.published ? (
						<DropdownMenuItem asChild>
							<a
								href={`/resources/${article.slug}`}
								target="_blank"
								rel="noopener noreferrer"
							>
								<Eye className="mr-2 h-4 w-4" />
								Voir
							</a>
						</DropdownMenuItem>
					) : null}
					<DropdownMenuItem onClick={handleDuplicate}>
						<Copy className="mr-2 h-4 w-4" />
						Dupliquer
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleToggle}>
						{article.published ? <Download className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
						{article.published ? "Dépublier" : "Publier"}
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="text-destructive focus:text-destructive"
						onClick={() => setOpen(true)}
					>
						<Trash2 className="mr-2 h-4 w-4" />
						Supprimer
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog
				open={open}
				onOpenChange={setOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle>
						<AlertDialogDescription>&quot;{article.title}&quot; sera supprimé définitivement. Cette action est irréversible.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={loading}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{loading ? "Suppression..." : "Supprimer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
