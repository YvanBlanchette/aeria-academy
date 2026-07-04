"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Eye, MoreHorizontal, Trash2 } from "lucide-react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { approveAgency, deleteAgencyInline } from "@/app/admin/agencies/actions";

export function AgencyRowActions({ agency }) {
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [approving, setApproving] = useState(false);

	async function handleApprove() {
		setApproving(true);
		const result = await approveAgency(agency.id);
		setApproving(false);
		if (result?.error) {
			toast.error(result.error);
			return;
		}
		toast.success("Agence approuvée");
	}

	function handleDelete() {
		startTransition(async () => {
			const result = await deleteAgencyInline(agency.id);
			if (result?.error) {
				toast.error(result.error);
				return;
			}
			toast.success("Agence supprimée");
			setConfirmOpen(false);
		});
	}

	return (
		<>
			<div className="flex items-center justify-center gap-2">
				{!agency.approved ? (
					<Button
						variant="outline"
						size="sm"
						onClick={handleApprove}
						disabled={approving}
					>
						<Check className="mr-1 h-4 w-4" />
						{approving ? "..." : "Approuver"}
					</Button>
				) : null}

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
							<Link href={`/admin/agencies/${agency.id}`}>
								<Eye className="mr-2 h-4 w-4" />
								Ouvrir la fiche
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => setConfirmOpen(true)}
							className="text-destructive focus:text-destructive"
						>
							<Trash2 className="mr-2 h-4 w-4" />
							Supprimer
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<AlertDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer cette agence ?</AlertDialogTitle>
						<AlertDialogDescription>
							&quot;{agency.name}&quot; sera supprimée définitivement. Les membres seront détachés mais leurs comptes resteront actifs.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isPending ? "..." : "Supprimer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
