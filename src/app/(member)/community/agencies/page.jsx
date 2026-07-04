import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Users, MessageSquare } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCommunityEnabled } from "@/lib/platform-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
	title: "Pages d'agence | Communauté",
	description: "Explorez les pages officielles des agences dans la communauté.",
};

export default async function CommunityAgencyPagesIndex() {
	const session = await auth();
	if (!session?.user?.id) redirect("/login?callbackUrl=/community/agencies");

	const communityEnabled = await getCommunityEnabled();
	if (!communityEnabled) redirect("/community-disabled");

	const agencies = await prisma.agency.findMany({
		where: { approved: true },
		orderBy: [{ updatedAt: "desc" }],
		select: {
			id: true,
			slug: true,
			name: true,
			description: true,
			city: true,
			province: true,
			logoUrl: true,
			_count: {
				select: {
					members: true,
					communityPosts: true,
				},
			},
		},
		take: 60,
	});

	return (
		<div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
			{/* HEADER */}
			<Card className="rounded-3xl border-0 bg-white shadow-sm">
				<CardContent className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
					<div>
						<p className="text-sm font-semibold text-foreground">Pages d'agence</p>
						<p className="text-xs text-muted-foreground">Un espace dédié pour publier au nom de chaque agence.</p>
					</div>
					<Button
						asChild
						variant="outline"
						size="sm"
						className="rounded-full"
					>
						<Link href="/community">Retour au fil</Link>
					</Button>
				</CardContent>
			</Card>

			{/* AGENCY PAGES LIST */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				{agencies.length === 0 ? (
					<Card className="col-span-full rounded-3xl border-0 bg-white shadow-sm">
						<CardContent className="p-10 text-center text-sm text-muted-foreground">Aucune page d'agence n'est encore disponible.</CardContent>
					</Card>
				) : (
					agencies.map((agency) => (
						<Card
							key={agency.id}
							className="rounded-3xl border-0 bg-white shadow-sm"
						>
							<CardHeader className="pb-2">
								<CardTitle className="text-base">
									<Link
										href={`/community/agencies/${agency.slug}`}
										className="transition-colors hover:text-primary"
									>
										{agency.name}
									</Link>
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4 pt-0">
								<div className="flex items-start gap-3">
									{agency.logoUrl ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={agency.logoUrl}
											alt={agency.name}
											className="h-12 w-12 rounded-xl border object-cover"
										/>
									) : (
										<div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted">
											<Building2 className="h-5 w-5 text-muted-foreground" />
										</div>
									)}
									<div className="min-w-0 flex-1">
										<p className="text-sm text-muted-foreground">
											{[agency.city, agency.province].filter(Boolean).join(", ") || "Localisation non renseignée"}
										</p>
										<p className="mt-1 line-clamp-2 text-sm text-foreground/90">{agency.description || "Page officielle de l'agence."}</p>
									</div>
								</div>
								<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
									<p className="inline-flex items-center gap-1">
										<Users className="h-3.5 w-3.5" />
										{agency._count.members} membre(s)
									</p>
									<p className="inline-flex items-center gap-1">
										<MessageSquare className="h-3.5 w-3.5" />
										{agency._count.communityPosts} publication(s)
									</p>
								</div>
								<Button
									asChild
									className="w-full rounded-full"
								>
									<Link href={`/community/agencies/${agency.slug}`}>Voir la page</Link>
								</Button>
							</CardContent>
						</Card>
					))
				)}
			</div>
		</div>
	);
}
