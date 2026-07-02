"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const RESERVED_USERNAMES = new Set([
	"admin",
	"api",
	"login",
	"logout",
	"register",
	"profile",
	"dashboard",
	"settings",
	"billing",
	"users",
	"courses",
	"learn",
	"_next",
]);

const privacySchema = z.object({
	username: z
		.string()
		.trim()
		.toLowerCase()
		.max(30, "Maximum 30 caractères")
		.refine((value) => value === "" || /^[a-z0-9-]+$/.test(value), "Utilise uniquement lettres minuscules, chiffres et tirets")
		.refine((value) => value === "" || (!value.startsWith("-") && !value.endsWith("-")), "Le pseudo ne peut pas commencer/finir par un tiret"),
	publicProfile: z.boolean(),
	profileVisibilityScope: z.enum(["PUBLIC", "MEMBERS", "FRIENDS", "PRIVATE"]),
	messagePermissionScope: z.enum(["EVERYONE", "FRIENDS", "NOBODY"]),
});

const preferencesSchema = z.object({
	locale: z.enum(["fr", "en"]),
	timezone: z.enum(["America/Toronto", "America/Montreal", "Europe/Paris", "UTC"]),
	reminderHour: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure de rappel invalide"),
	weeklyDigest: z.boolean(),
	courseReminders: z.boolean(),
	productUpdates: z.boolean(),
});

const passwordSchema = z
	.object({
		currentPassword: z.string().optional(),
		newPassword: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères").max(100, "Mot de passe trop long"),
		confirmPassword: z.string(),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "La confirmation ne correspond pas",
		path: ["confirmPassword"],
	});

const unblockSchema = z.object({
	blockedUserId: z.string().cuid("Utilisateur invalide"),
});

async function requireUser() {
	const session = await auth();
	if (!session?.user?.id) {
		throw new Error("Non autorisé");
	}
	return session.user;
}

export async function updatePrivacySettings(payload) {
	const user = await requireUser();
	const parsed = privacySchema.safeParse(payload);
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || "Paramètres invalides" };
	}

	const username = parsed.data.username;
	const publicProfile = parsed.data.publicProfile;
	const profileVisibilityScope = parsed.data.profileVisibilityScope;
	const messagePermissionScope = parsed.data.messagePermissionScope;

	if (username && RESERVED_USERNAMES.has(username)) {
		return { error: "Ce pseudo est réservé" };
	}

	if (username.length > 0) {
		const existing = await prisma.user.findUnique({ where: { username } });
		if (existing && existing.id !== user.id) {
			return { error: "Ce pseudo est déjà utilisé" };
		}
	}

	await prisma.user.update({
		where: { id: user.id },
		data: {
			username: username || null,
		},
	});

	await prisma.userProfile.upsert({
		where: { userId: user.id },
		update: {
			publicProfile: username ? publicProfile : false,
			profileVisibilityScope,
			messagePermissionScope,
		},
		create: {
			userId: user.id,
			publicProfile: username ? publicProfile : false,
			profileVisibilityScope,
			messagePermissionScope,
		},
	});

	revalidatePath("/dashboard/settings");
	revalidatePath("/profile");
	return {
		success: true,
		username: username || null,
		publicProfile: username ? publicProfile : false,
		profileVisibilityScope,
		messagePermissionScope,
	};
}

export async function updateDashboardPreferences(payload) {
	const user = await requireUser();
	const parsed = preferencesSchema.safeParse(payload);
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || "Préférences invalides" };
	}

	await prisma.userDashboardSettings.upsert({
		where: { userId: user.id },
		update: parsed.data,
		create: {
			userId: user.id,
			...parsed.data,
		},
	});

	revalidatePath("/dashboard/settings");
	return { success: true };
}

export async function updatePassword(payload) {
	const user = await requireUser();
	const parsed = passwordSchema.safeParse(payload);
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || "Formulaire invalide" };
	}

	const dbUser = await prisma.user.findUnique({
		where: { id: user.id },
		select: { password: true },
	});

	if (!dbUser) {
		return { error: "Utilisateur introuvable" };
	}

	if (dbUser.password) {
		if (!parsed.data.currentPassword) {
			return { error: "Entre ton mot de passe actuel" };
		}

		const valid = await bcrypt.compare(parsed.data.currentPassword, dbUser.password);
		if (!valid) {
			return { error: "Mot de passe actuel incorrect" };
		}
	}

	const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
	await prisma.user.update({
		where: { id: user.id },
		data: { password: hashed },
	});

	revalidatePath("/dashboard/settings");
	return { success: true };
}

export async function unblockUserFromSettings(payload) {
	const user = await requireUser();
	const parsed = unblockSchema.safeParse(payload);
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || "Utilisateur invalide" };
	}

	await prisma.userBlock.deleteMany({
		where: {
			blockerId: user.id,
			blockedId: parsed.data.blockedUserId,
		},
	});

	revalidatePath("/dashboard/settings");
	revalidatePath("/community");
	revalidatePath("/community/messages");
	revalidatePath("/community/friends");
	return { success: true };
}
