"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { adminCreateAgency, adminUpdateAgency, adminUploadAgencyLogo } from "@/app/admin/agencies/actions";

export function AgencyForm({ agency }) {
	const router = useRouter();
	const fileInputRef = useRef(null);
	const [loading, setLoading] = useState(false);
	const [uploadingLogo, setUploadingLogo] = useState(false);
	const [logoUrl, setLogoUrl] = useState(agency?.logoUrl || "");
	const isEdit = !!agency;

	async function handleLogoChange(event) {
		const file = event.target.files?.[0];
		if (!file) return;

		setUploadingLogo(true);
		try {
			const formData = new FormData();
			formData.set("file", file);
			const result = await adminUploadAgencyLogo(formData);

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
		const result = isEdit ? await adminUpdateAgency(agency.id, formData) : await adminCreateAgency(formData);

		if (result?.error) {
			toast.error(result.error);
			setLoading(false);
			return;
		}

		if (isEdit) {
			toast.success("Agence mise à jour");
			router.refresh();
		}
		setLoading(false);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="space-y-6"
		>
			<Card>
				<CardHeader>
					<CardTitle>Informations générales</CardTitle>
					<CardDescription>Nom, logo et description publique</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
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

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							name="description"
							defaultValue={agency?.description || ""}
							placeholder="Présentation de l'agence..."
							rows={4}
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Coordonnées</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="address">Adresse</Label>
						<Input
							id="address"
							name="address"
							defaultValue={agency?.address || ""}
							placeholder="123 rue Principale"
						/>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
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
							<Label htmlFor="province">Province / État</Label>
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
					</div>

					<div className="grid gap-4 md:grid-cols-3">
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
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Certifications professionnelles</CardTitle>
					<CardDescription>Numéros officiels affichés sur le profil</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-3">
						<div className="space-y-2">
							<Label htmlFor="iataCode">IATA</Label>
							<Input
								id="iataCode"
								name="iataCode"
								defaultValue={agency?.iataCode || ""}
								placeholder="12345678"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="tico">TICO (Ontario)</Label>
							<Input
								id="tico"
								name="tico"
								defaultValue={agency?.tico || ""}
								placeholder="50012345"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="opc">OPC (Québec)</Label>
							<Input
								id="opc"
								name="opc"
								defaultValue={agency?.opc || ""}
								placeholder="123456"
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="flex gap-3 justify-end">
				<Button
					type="button"
					variant="outline"
					onClick={() => router.push("/admin/agencies")}
				>
					Annuler
				</Button>
				<Button
					type="submit"
					disabled={loading}
				>
					{loading ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Créer l'agence"}
				</Button>
			</div>
		</form>
	);
}
