"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/app/(auth)/password-reset/actions";

const RESEND_COOLDOWN_SECONDS = 5 * 60;
const RESEND_COOLDOWN_STORAGE_KEY = "password-reset-retry-until";

function formatCountdown(totalSeconds) {
	const minutes = Math.floor(totalSeconds / 60)
		.toString()
		.padStart(2, "0");
	const seconds = (totalSeconds % 60).toString().padStart(2, "0");
	return `${minutes}:${seconds}`;
}

export default function ForgotPasswordPage() {
	const [loading, setLoading] = useState(false);
	const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
	const [retryUntilTimestamp, setRetryUntilTimestamp] = useState(0);

	useEffect(() => {
		const storedRetryUntil = Number.parseInt(localStorage.getItem(RESEND_COOLDOWN_STORAGE_KEY) || "0", 10);
		if (!Number.isFinite(storedRetryUntil) || storedRetryUntil <= 0) {
			return;
		}

		if (storedRetryUntil <= Date.now()) {
			localStorage.removeItem(RESEND_COOLDOWN_STORAGE_KEY);
			return;
		}

		setRetryUntilTimestamp(storedRetryUntil);
	}, []);

	useEffect(() => {
		if (retryUntilTimestamp <= 0) {
			setRetryAfterSeconds(0);
			return undefined;
		}

		const updateCountdown = () => {
			const remainingSeconds = Math.max(0, Math.ceil((retryUntilTimestamp - Date.now()) / 1000));
			setRetryAfterSeconds(remainingSeconds);

			if (remainingSeconds <= 0) {
				setRetryUntilTimestamp(0);
				localStorage.removeItem(RESEND_COOLDOWN_STORAGE_KEY);
			}
		};

		updateCountdown();

		const timerId = setInterval(() => {
			updateCountdown();
		}, 1000);

		return () => clearInterval(timerId);
	}, [retryUntilTimestamp]);

	async function handleSubmit(event) {
		event.preventDefault();
		if (retryAfterSeconds > 0) {
			return;
		}

		setLoading(true);

		const formData = new FormData(event.currentTarget);
		const result = await requestPasswordReset(formData);

		setLoading(false);
		if (result?.error) {
			toast.error(result.error);
			return;
		}

		const nextRetryAfterSeconds = Math.max(1, result?.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS);
		const nextRetryUntilTimestamp = Date.now() + nextRetryAfterSeconds * 1000;
		setRetryUntilTimestamp(nextRetryUntilTimestamp);
		localStorage.setItem(RESEND_COOLDOWN_STORAGE_KEY, String(nextRetryUntilTimestamp));

		if (result?.retryAfterSeconds) {
			toast.info(`Merci de patienter ${formatCountdown(result.retryAfterSeconds)} avant de renvoyer un email`);
			return;
		}

		toast.success("Si un compte existe, un email de reinitialisation a ete envoye");
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
					<CardTitle className="text-2xl">Mot de passe oublie ?</CardTitle>
					<CardDescription>Entre ton email pour recevoir un lien de reinitialisation.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-5">
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
								autoComplete="email"
								required
								className="bg-neutral-100 shadow-inner"
								placeholder="johnsmith@mail.com"
							/>
						</div>
						<Button
							type="submit"
							className="w-full"
							disabled={loading || retryAfterSeconds > 0}
						>
							{loading ? "Envoi..." : retryAfterSeconds > 0 ? `Renvoyer dans ${formatCountdown(retryAfterSeconds)}` : "Envoyer le lien"}
						</Button>
					</form>
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
