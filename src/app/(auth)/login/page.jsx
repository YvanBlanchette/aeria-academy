"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	async function handleSubmit(event) {
		event.preventDefault();
		setLoading(true);

		const formData = new FormData(event.currentTarget);
		const result = await signIn("credentials", {
			email: formData.get("email"),
			password: formData.get("password"),
			redirect: false,
		});

		setLoading(false);

		if (result?.error) {
			toast.error("Email ou mot de passe incorrect");
			return;
		}

		toast.success("Connexion réussie");
		router.push("/dashboard");
		router.refresh();
	}

	return (
		<div className="flex min-h-screen overflow-hidden bg-neutral-50">
			{/* Form side */}
			<div className="flex h-screen w-full items-center justify-center px-4 py-6 sm:px-6 lg:w-1/2 lg:px-8">
				<Card className="w-full max-w-lg px-4 py-6 shadow-md">
					<CardHeader className="space-y-2">
						<div className="mb-3 flex items-center justify-center">
							<Logo
								locale="fr"
								scrolled
							/>
						</div>
						<CardTitle className="text-2xl">Connexion</CardTitle>
						<CardDescription>Accède à ton espace AERIA</CardDescription>
					</CardHeader>

					<CardContent className="space-y-6">
						{/* Social sign-in option */}
						<Button
							variant="outline"
							className="flex w-full items-center justify-center gap-1 py-4 shadow-sm"
							onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
						>
							<Image
								src="/icons/google-logo.svg"
								alt="Google Logo"
								width={20}
								height={20}
								className="h-5 w-5 object-contain"
							/>
							<span className="ml-2">Se connecter avec Google</span>
						</Button>

						{/* Divider between social and credential login */}
						<div className="relative">
							<Separator />
							<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">OU</span>
						</div>

						{/* Credentials form */}
						<form
							onSubmit={handleSubmit}
							className="space-y-4"
						>
							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									name="email"
									type="email"
									required
									autoComplete="email"
									placeholder="johnsmith@mail.com"
									className="bg-neutral-100 shadow-inner"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="password">Mot de passe</Label>
								<PasswordInput
									id="password"
									name="password"
									required
									className="bg-neutral-100 shadow-inner"
									placeholder="Mot de passe"
								/>
								<div className="text-right">
									<Link
										href="/forgot-password"
										className="text-xs text-primary hover:underline"
									>
										Mot de passe oublie ?
									</Link>
								</div>
							</div>

							<Button
								type="submit"
								className="w-full"
								disabled={loading}
							>
								{loading ? "Connexion..." : "Se connecter"}
							</Button>
						</form>

						<p className="text-center text-sm text-muted-foreground">
							Pas encore de compte ?{" "}
							<Link
								href="/register"
								className="text-primary hover:underline"
							>
								S&apos;inscrire
							</Link>
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Visual side */}
			<div className="relative hidden h-screen w-full lg:block lg:w-1/2">
				<Image
					height={2000}
					width={2000}
					src="/images/hero.webp"
					alt="background image"
					className="absolute inset-0 h-full w-full object-cover object-right brightness-75"
				/>
			</div>
		</div>
	);
}
