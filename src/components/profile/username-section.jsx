"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updateUsername } from "@/app/(member)/profile/actions";

export function UsernameSection({ user, publicEnabled, onPublicChange }) {
	const router = useRouter();
	const [username, setUsername] = useState(user.username || "");
	const [saving, setSaving] = useState(false);
	const [copied, setCopied] = useState(false);

	const currentUsername = username.trim();
	const profilePath = currentUsername ? `/users/${currentUsername}` : null;

	async function handleSave() {
		setSaving(true);
		const formData = new FormData();
		formData.set("username", username);

		const result = await updateUsername(formData);
		setSaving(false);

		if (result?.error) {
			toast.error(result.error);
			return;
		}

		setUsername(result.username || "");
		toast.success("Nom d'utilisateur enregistré");
		router.refresh();
	}

	async function handleCopy() {
		if (!profilePath) return;
		const absoluteUrl = `${window.location.origin}${profilePath}`;
		await navigator.clipboard.writeText(absoluteUrl);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Profil public</CardTitle>
				<CardDescription>Choisis un nom d&apos;utilisateur pour partager ton profil à tes clients</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Toggle public/privé */}
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<Label htmlFor="public">Activer mon profil public</Label>
						<p className="text-sm text-muted-foreground">
							{publicEnabled ? "Ton profil est visible par toute personne ayant le lien" : "Ton profil n'est visible que par toi"}
						</p>
					</div>
					<Switch
						id="public"
						checked={publicEnabled}
						onCheckedChange={onPublicChange}
						disabled={!currentUsername}
					/>
				</div>

				{!currentUsername && publicEnabled && (
					<p className="text-xs text-amber-600">⚠️ Choisis d&apos;abord un nom d&apos;utilisateur ci-dessous pour activer</p>
				)}

				{/* Username */}
				<div className="space-y-2 pt-2 border-t">
					<Label htmlFor="username">Nom d&apos;utilisateur</Label>
					<div className="flex gap-2">
						<div className="flex-1 flex items-center rounded-md border bg-background overflow-hidden">
							<span className="px-3 py-2 text-sm text-muted-foreground border-r bg-muted">/users/</span>
							<input
								id="username"
								value={username}
								onChange={(e) => setUsername(e.target.value.toLowerCase())}
								placeholder="marie-tremblay"
								className="flex-1 px-3 py-2 text-sm bg-transparent outline-none"
							/>
						</div>
						<Button
							type="button"
							onClick={handleSave}
							disabled={saving || currentUsername === (user.username || "")}
						>
							{saving ? "..." : "Enregistrer"}
						</Button>
					</div>
					<p className="text-xs text-muted-foreground">3 à 30 caractères. Lettres minuscules, chiffres et tirets uniquement.</p>
				</div>

				{/* URL de partage */}
				{profilePath && (
					<div className="rounded-md border bg-muted/30 p-3 space-y-2">
						<p className="text-xs font-medium text-muted-foreground">Ton URL publique</p>
						<div className="flex items-center gap-2">
							<code className="flex-1 text-xs px-2 py-1.5 rounded bg-background break-all">{profilePath}</code>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={handleCopy}
								title="Copier"
							>
								{copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								asChild
								title="Voir"
							>
								<a
									href={profilePath}
									target="_blank"
									rel="noopener noreferrer"
								>
									<ExternalLink className="h-4 w-4" />
								</a>
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
