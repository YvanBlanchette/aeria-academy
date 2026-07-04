"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { resetPassword } from "@/app/(auth)/password-reset/actions";

export default function ResetPasswordPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token") || "";
	const email = searchParams.get("email") || "";
	const [loading, setLoading] = useState(false);

	const isMissingResetData = !token || !email;

	async function handleSubmit(event) {
		event.preventDefault();
		if (isMissingResetData) {
			toast.error("Lien invalide");
			return;
		}

		setLoading(true);
		const formData = new FormData(event.currentTarget);
		formData.set("token", token);
		formData.set("email", email);
		const result = await resetPassword(formData);
		setLoading(false);

		if (result?.error) {
			toast.error(result.error);
			return;
		}

		toast.success("Mot de passe reinitialise. Connecte-toi avec ton nouveau mot de passe.");
		router.push("/login");
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-8">
			<Card className="w-full max-w-md px-4 py-6 shadow-md">
				<CardHeader className="space-y-2">
					<div className="mb-3 flex items-center justify-center">
						<Logo
							locale="fr"
							scrolled
						/>
					</div>
					<CardTitle className="text-2xl">Nouveau mot de passe</CardTitle>
					<CardDescription>Choisis un nouveau mot de passe pour ton compte.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-5">
					{isMissingResetData ? (
						<div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
							<p>Lien de reinitialisation invalide.</p>
							<Link
								href="/forgot-password"
								className="font-medium underline"
							>
								Demander un nouveau lien
							</Link>
						</div>
					) : (
						<form
							onSubmit={handleSubmit}
							className="space-y-4"
						>
							<div className="space-y-2">
								<Label htmlFor="password">Nouveau mot de passe</Label>
								<PasswordInput
									id="password"
									name="password"
									required
									className="bg-neutral-100 shadow-inner"
									placeholder="Nouveau mot de passe"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
								<PasswordInput
									id="confirmPassword"
									name="confirmPassword"
									required
									className="bg-neutral-100 shadow-inner"
									placeholder="Confirme ton mot de passe"
								/>
							</div>
							<Button
								type="submit"
								className="w-full"
								disabled={loading}
							>
								{loading ? "Mise a jour..." : "Mettre a jour le mot de passe"}
							</Button>
						</form>
					)}
					<p className="text-center text-sm text-muted-foreground">
						Retour a la connexion :{" "}
						<Link
							href="/login"
							className="text-primary hover:underline"
						>
							Se connecter
						</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
