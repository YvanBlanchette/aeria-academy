import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureUserHasUsername } from "@/lib/username";
import { ProfileForm } from "@/components/profile/profile-form";
import { AgencySelector } from "@/components/profile/agency-selector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
	title: "Mon profil | ÆRIA Voyages Academy",
};

export default async function ProfilePage() {
	const session = await auth();
	if (!session) redirect("/login?callbackUrl=/profile");
	await ensureUserHasUsername(session.user.id);

	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		include: {
			profile: {
				include: { agency: true },
			},
			badges: {
				orderBy: { createdAt: "desc" },
				take: 30,
			},
		},
	});

	const currentAgency = user.profile?.agency || null;
	const isAgencyAdmin = currentAgency?.adminUserId === session.user.id;

	return (
		<div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-neutral-100">
			<div className="space-y-6">
				<AgencySelector
					profile={user.profile}
					currentAgency={currentAgency}
					isAgencyAdmin={isAgencyAdmin}
				/>

				<ProfileForm
					profile={user.profile}
					user={user}
				/>

				<Card>
					<CardHeader>
						<CardTitle>Badges obtenus</CardTitle>
						<CardDescription>Vos accomplissements recents dans le parcours d'apprentissage.</CardDescription>
					</CardHeader>
					<CardContent>
						{user.badges.length === 0 ? (
							<p className="text-sm text-muted-foreground">Aucun badge pour le moment. Complete des modules et des quiz pour commencer ta collection.</p>
						) : (
							<ul className="space-y-2">
								{user.badges.map((badge) => (
									<li
										key={badge.id}
										className="rounded-xl border bg-white px-4 py-3"
									>
										<p className="text-sm font-medium text-foreground">{badge.title}</p>
										{badge.description ? <p className="mt-1 text-xs text-muted-foreground">{badge.description}</p> : null}
										<p className="mt-1 text-xs text-muted-foreground">{new Date(badge.createdAt).toLocaleDateString("fr-CA")}</p>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
