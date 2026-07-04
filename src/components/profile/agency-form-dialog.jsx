"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createAgency, updateAgency, uploadAgencyLogo } from "@/app/(member)/profile/agency-actions";

export function AgencyFormDialog({ open, onOpenChange, mode, agency }) {
	const router = useRouter();
	const fileInputRef = useRef(null);
	const [loading, setLoading] = useState(false);
	const [uploadingLogo, setUploadingLogo] = useState(false);
	const [logoUrl, setLogoUrl] = useState(agency?.logoUrl || "");

	async function handleLogoChange(event) {
		const file = event.target.files?.[0];
		if (!file) return;

		setUploadingLogo(true);
		try {
			const formData = new FormData();
			formData.set("file", file);
			const result = await uploadAgencyLogo(formData);

			if (result?.error) {
				toast.error(result.error);
				return;
			}

			setLogoUrl(result.url || "");
			toast.success("Logo uploadé");
		} catch {
			toast.error("Impossible d'uploader le logo pour le moment");
		} finally {
			setUploadingLogo(false);
		}
	}

	function clearLogo() {
		setLogoUrl("");
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}

	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);

		const formData = new FormData(e.currentTarget);
		formData.set("logoUrl", logoUrl);
		const result = mode === "create" ? await createAgency(formData) : await updateAgency(agency.id, formData);

		setLoading(false);

		if (result?.error) {
			toast.error(result.error);
			return;
		}

		toast.success(mode === "create" ? "Agence créée — en attente de validation" : "Agence mise à jour");
		onOpenChange(false);
		router.refresh();
	}

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
		>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{mode === "create" ? "Créer une agence" : "Modifier l'agence"}</DialogTitle>
					<DialogDescription>
						{mode === "create"
							? "Renseigne les infos de ton agence. Elle devra être validée par notre équipe avant d'être visible publiquement."
							: "Modifie les informations de l'agence"}
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={handleSubmit}
					className="space-y-4"
				>
					<div className="space-y-2">
						<Label htmlFor="name">Nom de l&apos;agence *</Label>
						<Input
							id="name"
							name="name"
							defaultValue={agency?.name || ""}
							placeholder="Voyages XYZ"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							name="description"
							defaultValue={agency?.description || ""}
							placeholder="Description courte de l'agence..."
							rows={3}
						/>
					</div>

					<div className="space-y-2">
						{/* AGENCY LOGO UPLOAD */}
						<Label>Logo</Label>
						<input
							type="hidden"
							name="logoUrl"
							value={logoUrl}
						/>
						<div className="flex flex-wrap items-center gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => fileInputRef.current?.click()}
								disabled={uploadingLogo || loading}
							>
								{uploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
								Uploader un logo
							</Button>
							{logoUrl ? (
								<Button
									type="button"
									variant="ghost"
									onClick={clearLogo}
									disabled={uploadingLogo || loading}
								>
									<X className="mr-2 h-4 w-4" />
									Retirer
								</Button>
							) : null}
						</div>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
							onChange={handleLogoChange}
							disabled={uploadingLogo || loading}
							className="hidden"
						/>
						{logoUrl ? (
							<div className="overflow-hidden rounded-xl border bg-muted/20">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={logoUrl}
									alt="Aperçu du logo"
									className="h-24 w-24 object-cover"
								/>
							</div>
						) : null}
						<p className="text-xs text-muted-foreground">Images converties automatiquement en WebP.</p>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="address">Adresse</Label>
							<Input
								id="address"
								name="address"
								defaultValue={agency?.address || ""}
								placeholder="123 rue Principale"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="city">Ville</Label>
							<Input
								id="city"
								name="city"
								defaultValue={agency?.city || ""}
								placeholder="Montréal"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="province">Province</Label>
							<Input
								id="province"
								name="province"
								defaultValue={agency?.province || ""}
								placeholder="QC"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="postalCode">Code postal</Label>
							<Input
								id="postalCode"
								name="postalCode"
								defaultValue={agency?.postalCode || ""}
								placeholder="H1A 1A1"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="country">Pays</Label>
							<Input
								id="country"
								name="country"
								defaultValue={agency?.country || "Canada"}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="phone">Téléphone</Label>
							<Input
								id="phone"
								name="phone"
								type="tel"
								defaultValue={agency?.phone || ""}
								placeholder="514-555-1234"
							/>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								name="email"
								type="email"
								defaultValue={agency?.email || ""}
								placeholder="contact@agence.com"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="websiteUrl">Site web</Label>
							<Input
								id="websiteUrl"
								name="websiteUrl"
								defaultValue={agency?.websiteUrl || ""}
								placeholder="https://..."
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label>Certifications professionnelles</Label>
						<div className="grid gap-2 md:grid-cols-3">
							<Input
								name="iataCode"
								defaultValue={agency?.iataCode || ""}
								placeholder="IATA"
							/>
							<Input
								name="tico"
								defaultValue={agency?.tico || ""}
								placeholder="TICO (ON)"
							/>
							<Input
								name="opc"
								defaultValue={agency?.opc || ""}
								placeholder="OPC (QC)"
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={loading}
						>
							Annuler
						</Button>
						<Button
							type="submit"
							disabled={loading}
						>
							{loading ? "Enregistrement..." : mode === "create" ? "Créer l'agence" : "Mettre à jour"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
