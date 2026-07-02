"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
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
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteCommunityMessage } from "@/app/(member)/community/messages/actions";

export function CommunityMessageDeleteButton({ messageId, isMine }) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	function handleDelete() {
		if (!messageId) return;

		startTransition(async () => {
			const formData = new FormData();
			formData.set("messageId", messageId);
			const result = await deleteCommunityMessage(formData);

			if (result?.error) {
				toast.error(result.error);
				return;
			}

			window.dispatchEvent(new Event("community-notifications:refresh"));
			router.refresh();
			toast.success("Message supprimé");
		});
	}

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					disabled={isPending}
					className={`mt-1 h-6 w-6 rounded-full ${isMine ? "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground" : "text-muted-foreground"}`}
					aria-label="Supprimer ce message"
					title="Supprimer ce message"
				>
					<Trash2 className="h-3.5 w-3.5" />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
					<AlertDialogDescription>Ce message sera remplacé par une mention "Message effacé" dans la conversation.</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Annuler</AlertDialogCancel>
					<AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
