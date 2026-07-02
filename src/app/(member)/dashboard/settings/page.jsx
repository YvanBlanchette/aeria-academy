import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardSettingsClient } from "./settings-client";
import { DEFAULT_DASHBOARD_PREFERENCES } from "./defaults";

export const metadata = { title: "Paramètres | ÆRIA Voyages Academy" };

export default async function SettingsPage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect("/login?callbackUrl=/dashboard/settings");
	}

	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: {
			id: true,
			email: true,
			name: true,
			image: true,
			role: true,
			membership: true,
			emailVerified: true,
			createdAt: true,
			username: true,
			password: true,
			profile: {
				select: {
					publicProfile: true,
					profileVisibilityScope: true,
					messagePermissionScope: true,
				},
			},
			dashboardSettings: {
				select: {
					locale: true,
					timezone: true,
					reminderHour: true,
					weeklyDigest: true,
					courseReminders: true,
					productUpdates: true,
				},
			},
		},
	});

	if (!user) {
		redirect("/login?callbackUrl=/dashboard/settings");
	}

	const blockedUsers = await prisma.userBlock.findMany({
		where: { blockerId: user.id },
		orderBy: { createdAt: "desc" },
		include: {
			blocked: {
				select: {
					id: true,
					username: true,
					name: true,
					email: true,
					image: true,
				},
			},
		},
	});

	const initialPreferences = {
		...DEFAULT_DASHBOARD_PREFERENCES,
		...(user.dashboardSettings || {}),
	};

	const userPayload = {
		id: user.id,
		email: user.email,
		name: user.name,
		image: user.image,
		role: user.role,
		membership: user.membership,
		emailVerified: user.emailVerified,
		createdAt: user.createdAt,
		username: user.username,
		hasPassword: Boolean(user.password),
		publicProfile: Boolean(user.profile?.publicProfile),
		profileVisibilityScope: user.profile?.profileVisibilityScope || "MEMBERS",
		messagePermissionScope: user.profile?.messagePermissionScope || "EVERYONE",
	};

	return (
		<DashboardSettingsClient
			initialUser={userPayload}
			initialPreferences={initialPreferences}
			blockedUsers={blockedUsers.map((entry) => ({
				id: entry.blocked.id,
				username: entry.blocked.username,
				name: entry.blocked.name,
				email: entry.blocked.email,
				image: entry.blocked.image,
				blockedAt: entry.createdAt,
			}))}
		/>
	);
}
