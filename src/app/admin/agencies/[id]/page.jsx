import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, Mail, Phone, Globe, MapPin, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AgencyForm } from "@/components/admin/agency-form";
import { ApproveButton, RejectButton, RemoveMemberButton } from "@/components/admin/agency-actions-buttons";
import { AgencyAdminSelector } from "@/components/admin/agency-admin-selector";

export default async function AdminAgencyDetailPage({ params }) {
	const { id } = await params;

	const agency = await prisma.agency.findUnique({
		where: { id },
		include: {
			members: {
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							image: true,
							role: true,
						},
					},
				},
				orderBy: { createdAt: "asc" },
			},
		},
	});

	if (!agency) notFound();

	// Cherche l'admin de l'agence
	let agencyAdmin = null;
	if (agency.adminUserId) {
		agencyAdmin = await prisma.user.findUnique({
			where: { id: agency.adminUserId },
			select: { id: true, name: true, email: true, image: true },
		});
	}

	const adminCandidateMap = new Map();
	for (const member of agency.members) {
		adminCandidateMap.set(member.user.id, {
			value: member.user.id,
			label: `${member.user.name || "Sans nom"} (${member.user.email})`,
		});
	}
	if (agencyAdmin && !adminCandidateMap.has(agencyAdmin.id)) {
		adminCandidateMap.set(agencyAdmin.id, {
			value: agencyAdmin.id,
			label: `${agencyAdmin.name || "Sans nom"} (${agencyAdmin.email})`,
		});
	}
	const adminCandidates = Array.from(adminCandidateMap.values()).sort((a, b) => a.label.localeCompare(b.label, "fr"));

	const activityEvents = [
		{
			id: `created-${agency.id}`,
			time: agency.createdAt,
			title: "Agence créée",
			description: `${agency.name} a été ajoutée dans AERIA.`,
		},
		...(agency.updatedAt.getTime() - agency.createdAt.getTime() > 60 * 1000
			? [
					{
						id: `updated-${agency.id}`,
						time: agency.updatedAt,
						title: "Fiche agence mise à jour",
						description: "Des informations de profil ont été modifiées.",
					},
				]
			: []),
		...(agency.approved
			? [
					{
						id: `approved-${agency.id}`,
						time: agency.updatedAt,
						title: "Statut approuvé",
						description: "L'agence est actuellement approuvée.",
					},
				]
			: [
					{
						id: `pending-${agency.id}`,
						time: agency.createdAt,
						title: "En attente d'approbation",
						description: "L'agence n'est pas encore approuvée.",
					},
				]),
		...agency.members.map((member) => ({
			id: `member-${member.userId}`,
			time: member.createdAt,
			title: "Membre rattaché",
			description: `${member.user.name || member.user.email} a rejoint l'agence${member.agencyRole ? ` (${member.agencyRole})` : ""}.`,
		})),
	]
		.sort((a, b) => b.time.getTime() - a.time.getTime())
		.slice(0, 10);

	return (
		<div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-neutral-100">
			<div className="mb-4">
				<Link
					href="/admin/agencies"
					className="text-sm text-muted-foreground hover:underline"
				>
					← Retour aux agences
				</Link>
			</div>

			{/* Bandeau d'actions selon statut */}
			<Card className="mb-6 shadow-sm">
				<CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
					<div className="flex items-center gap-3">
						<Badge variant={agency.approved ? "default" : "secondary"}>{agency.approved ? "Approuvée" : "En attente"}</Badge>
						<p className="text-sm text-muted-foreground">
							Créée le{" "}
							{new Date(agency.createdAt).toLocaleDateString("fr-FR", {
								day: "numeric",
								month: "long",
								year: "numeric",
							})}
						</p>
					</div>
					<div className="flex gap-2">
						{!agency.approved && <ApproveButton agencyId={agency.id} />}
						<RejectButton
							agencyId={agency.id}
							agencyName={agency.name}
						/>
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Formulaire d'édition */}
				<div className="lg:col-span-2">
					<AgencyForm agency={agency} />
				</div>

				{/* Sidebar : admin + membres */}
				<div className="space-y-6">
					<Card className="shadow-sm">
						<CardHeader>
							<CardTitle className="text-base">Admin de l&apos;agence</CardTitle>
						</CardHeader>
						<CardContent>
							{agencyAdmin ? (
								<Link
									href={`/admin/users/${agencyAdmin.id}`}
									className="flex items-center gap-3 hover:underline"
								>
									<Avatar className="h-10 w-10">
										<AvatarImage
											src={agencyAdmin.image}
											alt={agencyAdmin.name}
										/>
										<AvatarFallback>{(agencyAdmin.name || agencyAdmin.email).charAt(0).toUpperCase()}</AvatarFallback>
									</Avatar>
									<div className="min-w-0">
										<p className="text-sm font-medium truncate">{agencyAdmin.name || "—"}</p>
										<p className="text-xs text-muted-foreground truncate">{agencyAdmin.email}</p>
									</div>
								</Link>
							) : (
								<p className="text-sm text-muted-foreground">Aucun admin défini</p>
							)}

							<div className="mt-4 border-t pt-4">
								<AgencyAdminSelector
									agencyId={agency.id}
									currentAdminUserId={agency.adminUserId}
									options={adminCandidates}
								/>
							</div>
						</CardContent>
					</Card>

					<Card className="shadow-sm">
						<CardHeader>
							<CardTitle className="text-base flex items-center gap-2">
								<Users className="h-4 w-4" />
								Membres ({agency.members.length})
							</CardTitle>
						</CardHeader>
						<CardContent>
							{agency.members.length === 0 ? (
								<p className="text-sm text-muted-foreground">Aucun membre dans cette agence</p>
							) : (
								<ul className="space-y-3">
									{agency.members.map((m) => (
										<li
											key={m.userId}
											className="flex items-center gap-3 group"
										>
											<Link
												href={`/admin/users/${m.userId}`}
												className="flex items-center gap-3 flex-1 min-w-0 hover:underline"
											>
												<Avatar className="h-8 w-8">
													<AvatarImage
														src={m.user.image}
														alt={m.user.name}
													/>
													<AvatarFallback className="text-xs">{(m.user.name || m.user.email).charAt(0).toUpperCase()}</AvatarFallback>
												</Avatar>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium truncate">{m.user.name || m.user.email}</p>
													{m.agencyRole && <p className="text-xs text-muted-foreground truncate">{m.agencyRole}</p>}
												</div>
											</Link>
											<div className="opacity-0 group-hover:opacity-100 transition-opacity">
												<RemoveMemberButton
													userId={m.userId}
													agencyId={agency.id}
													userName={m.user.name || m.user.email}
												/>
											</div>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>

					{/* Aperçu coordonnées */}
					<Card className="shadow-sm">
						<CardHeader>
							<CardTitle className="text-base">Coordonnées</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-sm">
							{agency.address && (
								<p className="flex items-start gap-2 text-muted-foreground">
									<MapPin className="h-4 w-4 mt-0.5 shrink-0" />
									<span>
										{agency.address}
										{agency.city && `, ${agency.city}`}
										{agency.postalCode && `, ${agency.postalCode}`}
									</span>
								</p>
							)}
							{agency.phone && (
								<p className="flex items-center gap-2 text-muted-foreground">
									<Phone className="h-4 w-4" />
									{agency.phone}
								</p>
							)}
							{agency.email && (
								<p className="flex items-center gap-2 text-muted-foreground">
									<Mail className="h-4 w-4" />
									{agency.email}
								</p>
							)}
							{agency.websiteUrl && (
								<a
									href={agency.websiteUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
								>
									<Globe className="h-4 w-4" />
									Site web ↗
								</a>
							)}
						</CardContent>
					</Card>

					<Card className="shadow-sm">
						<CardHeader>
							<CardTitle className="text-base flex items-center gap-2">
								<Clock3 className="h-4 w-4" />
								Activité agence
							</CardTitle>
						</CardHeader>
						<CardContent>
							{activityEvents.length === 0 ? (
								<p className="text-sm text-muted-foreground">Aucun événement récent</p>
							) : (
								<ul className="space-y-3">
									{activityEvents.map((event) => (
										<li
											key={event.id}
											className="border-l pl-3 py-1 pr-2 rounded-r-md shadow-inner"
										>
											<p className="text-sm font-medium">{event.title}</p>
											<p className="text-xs text-muted-foreground">{event.description}</p>
											<p className="text-[11px] text-muted-foreground mt-1">{new Date(event.time).toLocaleString("fr-FR")}</p>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
