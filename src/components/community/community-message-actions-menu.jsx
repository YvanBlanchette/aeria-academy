"use client";

import { useState, useTransition } from "react";
import { EllipsisVertical, Copy, Trash2 } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteCommunityMessage, getCopyableCommunityMessageContent, toggleCommunityMessageReaction } from "@/app/(member)/community/messages/actions";

const PICKER_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "👏", "🔥", "🙏", "🎉", "✅", "🤝", "💡"];

export function CommunityMessageActionsMenu({ messageId, isMine }) {
	const [isPending, startTransition] = useTransition();
	const [confirmOpen, setConfirmOpen] = useState(false);

	function handleCopy() {
		if (!messageId) return;

		startTransition(async () => {
			const formData = new FormData();
			formData.set("messageId", messageId);
			const result = await getCopyableCommunityMessageContent(formData);

			if (result?.error) {
				toast.error(result.error);
				return;
			}

			if (!navigator?.clipboard?.writeText) {
				toast.error("Presse-papiers non disponible");
				return;
			}

			try {
				await navigator.clipboard.writeText(result.content || "");
				toast.success("Message copié");
			} catch {
				toast.error("Impossible de copier le message");
			}
		});
	}

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

			setConfirmOpen(false);
			window.dispatchEvent(new Event("community-notifications:refresh"));
			window.dispatchEvent(new Event("community-messages:refresh-now"));
			toast.success("Message supprimé");
		});
	}

	function handleReact(emoji) {
		if (!messageId || !emoji) return;

		startTransition(async () => {
			const formData = new FormData();
			formData.set("messageId", messageId);
			formData.set("emoji", emoji);
			const result = await toggleCommunityMessageReaction(formData);

			if (result?.error) {
				toast.error(result.error);
				return;
			}

			window.dispatchEvent(new Event("community-messages:refresh-now"));
		});
	}

	return (
		<>
			{/* 3-DOT ACTIONS MENU ALWAYS VISIBLE FOR DISCOVERABILITY */}
			<DropdownMenu modal={false}>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						disabled={isPending}
						className="mt-1 h-7 w-7 rounded-full text-foreground/80 hover:bg-muted"
						aria-label="Actions du message"
						title="Actions du message"
					>
						<EllipsisVertical className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align={isMine ? "start" : "end"}
					className="w-52"
				>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>Réagir au message</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className="w-auto min-w-0">
							<div className="grid grid-cols-6 gap-1 p-1">
								{PICKER_EMOJIS.map((emoji) => (
									<DropdownMenuItem
										key={emoji}
										onSelect={() => handleReact(emoji)}
										className="h-8 w-8 justify-center p-0 text-base"
									>
										{emoji}
									</DropdownMenuItem>
								))}
							</div>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
					<DropdownMenuItem onSelect={handleCopy}>
						<Copy className="h-4 w-4" />
						Copier le message
					</DropdownMenuItem>
					{isMine ? (
						<DropdownMenuItem
							onSelect={() => setConfirmOpen(true)}
							className="text-destructive focus:text-destructive"
						>
							<Trash2 className="h-4 w-4" />
							Supprimer le message
						</DropdownMenuItem>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
						<AlertDialogDescription>Ce message sera remplacé par une mention &quot;Message effacé&quot; dans la conversation.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
