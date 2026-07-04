"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BadgeCheck, Bell, Globe, Lock, Mail, Save, Shield, UserCircle2, UserX } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { isMessageSoundEnabled, setMessageSoundEnabled } from "@/lib/message-sound-preferences";
import { unblockUserFromSettings, updateDashboardPreferences, updatePassword, updatePrivacySettings } from "./actions";

function membershipLabel(membership) {
	switch (membership) {
		case "PRIME":
			return "Prime";
		case "ACADEMY":
			return "Académie";
		default:
			return "Gratuit";
	}
}

function dateFr(value) {
	if (!value) return "-";
	return new Intl.DateTimeFormat("fr-CA", {
		dateStyle: "medium",
	}).format(new Date(value));
}

function initialsOf(user) {
	const raw = user?.name || user?.email || "U";
	return raw
		.split(" ")
		.map((part) => part[0] || "")
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

export function DashboardSettingsClient({ initialUser, initialPreferences, blockedUsers }) {
	const router = useRouter();
	const { update: updateSession } = useSession();
	const { theme, setTheme } = useTheme();
	const [isSavingPrivacy, startSavingPrivacy] = useTransition();
	const [isSavingPreferences, startSavingPreferences] = useTransition();
	const [isSavingPassword, startSavingPassword] = useTransition();
	const [isUnblocking, startUnblocking] = useTransition();
	const [messageSoundEnabled, setMessageSoundEnabledState] = useState(() => isMessageSoundEnabled());

	const [privacy, setPrivacy] = useState({
		username: initialUser.username || "",
		publicProfile: Boolean(initialUser.publicProfile),
		profileVisibilityScope: initialUser.profileVisibilityScope || "MEMBERS",
		messagePermissionScope: initialUser.messagePermissionScope || "EVERYONE",
	});

	const [preferences, setPreferences] = useState({
		locale: initialPreferences.locale || "fr",
		timezone: initialPreferences.timezone || "America/Toronto",
		reminderHour: initialPreferences.reminderHour || "09:00",
		weeklyDigest: Boolean(initialPreferences.weeklyDigest),
		courseReminders: Boolean(initialPreferences.courseReminders),
		productUpdates: Boolean(initialPreferences.productUpdates),
	});

	const [passwordForm, setPasswordForm] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});
	const [blockedUsersState, setBlockedUsersState] = useState(blockedUsers || []);

	const profileUrl = privacy.username ? `/users/${privacy.username}` : null;

	function patchPrivacy(next) {
		setPrivacy((prev) => ({ ...prev, ...next }));
	}

	function patchPreferences(next) {
		setPreferences((prev) => ({ ...prev, ...next }));
	}

	function patchPassword(next) {
		setPasswordForm((prev) => ({ ...prev, ...next }));
	}

	function handleSavePrivacy() {
		startSavingPrivacy(async () => {
			const result = await updatePrivacySettings(privacy);
			if (result?.error) {
				toast.error(result.error);
				return;
			}

			setPrivacy((prev) => ({
				...prev,
				username: result?.username || "",
				publicProfile: Boolean(result?.publicProfile),
				profileVisibilityScope: result?.profileVisibilityScope || prev.profileVisibilityScope,
				messagePermissionScope: result?.messagePermissionScope || prev.messagePermissionScope,
			}));
			await updateSession();
			router.refresh();
			toast.success("Confidentialité mise à jour");
		});
	}

	function handleSavePreferences() {
		startSavingPreferences(async () => {
			const result = await updateDashboardPreferences(preferences);
			if (result?.error) {
				toast.error(result.error);
				return;
			}
			toast.success("Préférences enregistrées");
			router.refresh();
		});
	}

	function handleSavePassword() {
		startSavingPassword(async () => {
			const result = await updatePassword(passwordForm);
			if (result?.error) {
				toast.error(result.error);
				return;
			}

			setPasswordForm({
				currentPassword: "",
				newPassword: "",
				confirmPassword: "",
			});
			toast.success("Mot de passe mis à jour");
		});
	}

	function handleUnblock(blockedUserId) {
		startUnblocking(async () => {
			const result = await unblockUserFromSettings({ blockedUserId });
			if (result?.error) {
				toast.error(result.error);
				return;
			}

			setBlockedUsersState((prev) => prev.filter((user) => user.id !== blockedUserId));
			router.refresh();
			toast.success("Utilisateur débloqué");
		});
	}

	function handleMessageSoundToggle(enabled) {
		setMessageSoundEnabledState(enabled);
		setMessageSoundEnabled(enabled);
		toast.success(enabled ? "Son des messages activé" : "Son des messages désactivé");
	}

	return (
		<div className="mx-auto max-w-7xl space-y-6 bg-neutral-100 p-6 lg:p-8">
			<div className="rounded-xl border bg-white p-5 shadow-sm">
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div className="flex items-center gap-4">
						<Avatar className="h-14 w-14">
							<AvatarImage
								src={initialUser.image || undefined}
								alt={initialUser.name || initialUser.email}
							/>
							<AvatarFallback>{initialsOf(initialUser)}</AvatarFallback>
						</Avatar>
						<div>
							<h1 className="text-xl font-semibold sm:text-2xl">Paramètres utilisateur</h1>
							<p className="text-sm text-muted-foreground">Gère ton compte, ta confidentialité, tes notifications et ta sécurité.</p>
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						<Badge className="gap-1">
							<BadgeCheck className="h-3.5 w-3.5" />
							{membershipLabel(initialUser.membership)}
						</Badge>
						<Badge variant="outline">{initialUser.role}</Badge>
						<Badge variant={initialUser.emailVerified ? "default" : "secondary"}>{initialUser.emailVerified ? "Email vérifié" : "Email non vérifié"}</Badge>
					</div>
				</div>
			</div>

			<div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<UserCircle2 className="h-5 w-5" />
								Compte
							</CardTitle>
							<CardDescription>Informations de base du compte et actions rapides.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							<div className="grid gap-3 sm:grid-cols-2">
								<div className="rounded-md border p-3">
									<p className="text-xs text-muted-foreground">Email</p>
									<p className="font-medium">{initialUser.email}</p>
								</div>
								<div className="rounded-md border p-3">
									<p className="text-xs text-muted-foreground">Membre depuis</p>
									<p className="font-medium">{dateFr(initialUser.createdAt)}</p>
								</div>
							</div>
							<div className="flex flex-wrap gap-2">
								<Button
									variant="outline"
									asChild
								>
									<Link href="/profile">Modifier mon profil</Link>
								</Button>
								<Button asChild>
									<Link href="/dashboard/billing">Gérer l&apos;abonnement</Link>
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Shield className="h-5 w-5" />
								Confidentialité et profil public
							</CardTitle>
							<CardDescription>Ton pseudo et la visibilité de ton profil public.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="username">Pseudo public</Label>
								<Input
									id="username"
									value={privacy.username}
									onChange={(e) => patchPrivacy({ username: e.target.value })}
									placeholder="ex: marie-voyages"
								/>
								<p className="text-xs text-muted-foreground">Laisse vide pour désactiver ton profil public.</p>
							</div>

							<div className="flex items-start justify-between rounded-md border p-3">
								<div>
									<p className="text-sm font-medium">Rendre mon profil public</p>
									<p className="text-xs text-muted-foreground">Nécessite un pseudo défini.</p>
								</div>
								<Switch
									checked={privacy.publicProfile}
									onCheckedChange={(value) => patchPrivacy({ publicProfile: value })}
									disabled={!privacy.username}
								/>
							</div>

							<div className="space-y-2">
								<Label>Qui peut voir mon profil</Label>
								<Select
									value={privacy.profileVisibilityScope}
									onValueChange={(value) => patchPrivacy({ profileVisibilityScope: value })}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent position="popper">
										<SelectItem value="PUBLIC">Tout le monde</SelectItem>
										<SelectItem value="MEMBERS">Membres connectés</SelectItem>
										<SelectItem value="FRIENDS">Amis seulement</SelectItem>
										<SelectItem value="PRIVATE">Personne</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>Qui peut m&apos;envoyer des messages</Label>
								<Select
									value={privacy.messagePermissionScope}
									onValueChange={(value) => patchPrivacy({ messagePermissionScope: value })}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent position="popper">
										<SelectItem value="EVERYONE">Tout le monde</SelectItem>
										<SelectItem value="FRIENDS">Amis seulement</SelectItem>
										<SelectItem value="NOBODY">Personne</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{profileUrl ? (
								<p className="text-xs text-muted-foreground">
									URL: <span className="font-medium">{profileUrl}</span>
								</p>
							) : null}

							<Button
								onClick={handleSavePrivacy}
								disabled={isSavingPrivacy}
							>
								<Save className="mr-2 h-4 w-4" />
								{isSavingPrivacy ? "Enregistrement..." : "Sauvegarder la confidentialité"}
							</Button>
						</CardContent>
					</Card>
				</div>

				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Bell className="h-5 w-5" />
								Préférences
							</CardTitle>
							<CardDescription>Langue, fuseau horaire, apparence et préférences de notifications.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label>Thème</Label>
								<Select
									value={theme}
									onValueChange={setTheme}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent position="popper">
										<SelectItem value="light">Clair</SelectItem>
										<SelectItem value="dark">Sombre</SelectItem>
										<SelectItem value="system">Système</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label className="flex items-center gap-2">
										<Globe className="h-4 w-4" />
										Langue
									</Label>
									<Select
										value={preferences.locale}
										onValueChange={(value) => patchPreferences({ locale: value })}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent position="popper">
											<SelectItem value="fr">Français</SelectItem>
											<SelectItem value="en">English</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Fuseau horaire</Label>
									<Select
										value={preferences.timezone}
										onValueChange={(value) => patchPreferences({ timezone: value })}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent position="popper">
											<SelectItem value="America/Toronto">America/Toronto</SelectItem>
											<SelectItem value="America/Montreal">America/Montreal</SelectItem>
											<SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
											<SelectItem value="UTC">UTC</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="reminderHour">Heure de rappel d&apos;étude</Label>
								<Input
									id="reminderHour"
									type="time"
									value={preferences.reminderHour}
									onChange={(e) => patchPreferences({ reminderHour: e.target.value })}
								/>
							</div>

							<Separator />

							<div className="space-y-3">
								<div className="flex items-start justify-between rounded-md border p-3">
									<div>
										<p className="text-sm font-medium">Son des nouveaux messages</p>
										<p className="text-xs text-muted-foreground">Active un signal sonore lors de la réception d&apos;un message (ce navigateur).</p>
									</div>
									<Switch
										checked={messageSoundEnabled}
										onCheckedChange={handleMessageSoundToggle}
									/>
								</div>
								<div className="flex items-start justify-between rounded-md border p-3">
									<div>
										<p className="text-sm font-medium">Digest hebdomadaire</p>
										<p className="text-xs text-muted-foreground">Résumé des cours, progrès et nouveautés.</p>
									</div>
									<Switch
										checked={preferences.weeklyDigest}
										onCheckedChange={(value) => patchPreferences({ weeklyDigest: value })}
									/>
								</div>
								<div className="flex items-start justify-between rounded-md border p-3">
									<div>
										<p className="text-sm font-medium">Rappels de cours</p>
										<p className="text-xs text-muted-foreground">Notification selon ton heure de rappel.</p>
									</div>
									<Switch
										checked={preferences.courseReminders}
										onCheckedChange={(value) => patchPreferences({ courseReminders: value })}
									/>
								</div>
								<div className="flex items-start justify-between rounded-md border p-3">
									<div>
										<p className="text-sm font-medium">Nouveautés produit</p>
										<p className="text-xs text-muted-foreground">Infos sur nouvelles fonctionnalités et versions.</p>
									</div>
									<Switch
										checked={preferences.productUpdates}
										onCheckedChange={(value) => patchPreferences({ productUpdates: value })}
									/>
								</div>
							</div>

							<Button
								onClick={handleSavePreferences}
								disabled={isSavingPreferences}
							>
								<Mail className="mr-2 h-4 w-4" />
								{isSavingPreferences ? "Enregistrement..." : "Enregistrer les préférences"}
							</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Lock className="h-5 w-5" />
								Sécurité
							</CardTitle>
							<CardDescription>
								{initialUser.hasPassword ? "Modifie ton mot de passe de connexion." : "Ton compte n&apos;a pas encore de mot de passe (connexion sociale)."}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{initialUser.hasPassword ? (
								<div className="space-y-2">
									<Label htmlFor="currentPassword">Mot de passe actuel</Label>
									<Input
										id="currentPassword"
										type="password"
										value={passwordForm.currentPassword}
										onChange={(e) => patchPassword({ currentPassword: e.target.value })}
									/>
								</div>
							) : null}

							<div className="space-y-2">
								<Label htmlFor="newPassword">Nouveau mot de passe</Label>
								<Input
									id="newPassword"
									type="password"
									value={passwordForm.newPassword}
									onChange={(e) => patchPassword({ newPassword: e.target.value })}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
								<Input
									id="confirmPassword"
									type="password"
									value={passwordForm.confirmPassword}
									onChange={(e) => patchPassword({ confirmPassword: e.target.value })}
								/>
							</div>

							<Button
								onClick={handleSavePassword}
								disabled={isSavingPassword}
							>
								<Lock className="mr-2 h-4 w-4" />
								{isSavingPassword ? "Mise à jour..." : "Mettre à jour le mot de passe"}
							</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<UserX className="h-5 w-5" />
								Utilisateurs bloqués
							</CardTitle>
							<CardDescription>Gère les membres que tu as bloqués. Les utilisateurs bloqués ne peuvent pas te contacter.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{blockedUsersState.length === 0 ? (
								<p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Aucun utilisateur bloqué.</p>
							) : (
								blockedUsersState.map((blockedUser) => {
									const label = blockedUser.name || blockedUser.email;
									const initials = initialsOf({ name: blockedUser.name, email: blockedUser.email });
									return (
										<div
											key={blockedUser.id}
											className="flex items-center justify-between gap-3 rounded-md border p-3"
										>
											<div className="flex min-w-0 items-center gap-3">
												<Avatar className="h-10 w-10">
													<AvatarImage src={blockedUser.image || undefined} />
													<AvatarFallback>{initials}</AvatarFallback>
												</Avatar>
												<div className="min-w-0">
													<p className="truncate text-sm font-medium">{label}</p>
													<p className="truncate text-xs text-muted-foreground">{blockedUser.username ? `@${blockedUser.username}` : blockedUser.email}</p>
												</div>
											</div>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => handleUnblock(blockedUser.id)}
												disabled={isUnblocking}
											>
												Débloquer
											</Button>
										</div>
									);
								})
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
