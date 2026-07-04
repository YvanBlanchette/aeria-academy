"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { slugify } from "@/lib/slugify";

async function requireAdmin() {
	const session = await auth();
	if (!session || session.user.role !== "ADMIN") {
		throw new Error("Non autorisé");
	}
	return session;
}

const userSchema = z.object({
	name: z.string().min(2, "Le nom doit faire au moins 2 caractères"),
	email: z.string().email("Email invalide"),
	role: z.enum(["STUDENT", "INSTRUCTOR", "ADMIN"]),
	membership: z.enum(["FREE", "ACADEMY", "PRIME"]),
});

const quickRoleSchema = z.object({
	role: z.enum(["STUDENT", "INSTRUCTOR", "ADMIN"]),
});

const createUserSchema = userSchema.extend({
	password: z
		.string()
		.min(8, "Le mot de passe doit faire au moins 8 caractères")
		.regex(/[A-Z]/, "Doit contenir au moins une majuscule")
		.regex(/[0-9]/, "Doit contenir au moins un chiffre"),
	emailVerified: z.boolean().optional(),
});

const manualCertificateSchema = z.object({
	userId: z.string().cuid("Utilisateur invalide"),
	courseId: z.string().cuid("Cours invalide"),
});

async function buildUniqueUsername(baseInput) {
	let base = slugify(baseInput || "");
	if (!base) base = "user";
	let username = base;
	let i = 2;
	while (await prisma.user.findUnique({ where: { username } })) {
		username = `${base}-${i}`;
		i += 1;
	}
	return username;
}

export async function createUser(formData) {
	await requireAdmin();

	const parsed = createUserSchema.safeParse({
		name: formData.get("name"),
		email: formData.get("email"),
		password: formData.get("password"),
		role: formData.get("role"),
		membership: formData.get("membership"),
		emailVerified: formData.get("emailVerified") === "on",
	});

	if (!parsed.success) {
		return { error: parsed.error.issues[0].message };
	}

	const existing = await prisma.user.findUnique({
		where: { email: parsed.data.email },
		select: { id: true },
	});
	if (existing) {
		return { error: "Un utilisateur avec cet email existe déjà" };
	}

	const hashed = await bcrypt.hash(parsed.data.password, 12);
	const username = await buildUniqueUsername(parsed.data.email.split("@")[0] || parsed.data.name);

	const created = await prisma.user.create({
		data: {
			name: parsed.data.name,
			email: parsed.data.email,
			password: hashed,
			username,
			role: parsed.data.role,
			membership: parsed.data.membership,
			emailVerified: parsed.data.emailVerified ? new Date() : null,
		},
		select: { id: true },
	});

	revalidatePath("/admin/users");
	return { success: true, userId: created.id };
}

export async function updateUser(userId, formData) {
	const session = await requireAdmin();

	const parsed = userSchema.safeParse({
		name: formData.get("name"),
		email: formData.get("email"),
		role: formData.get("role"),
		membership: formData.get("membership"),
	});

	if (!parsed.success) {
		return { error: parsed.error.issues[0].message };
	}

	// Garde-fou : un admin ne peut pas se retirer son propre rôle ADMIN
	if (userId === session.user.id && parsed.data.role !== "ADMIN") {
		return { error: "Tu ne peux pas retirer ton propre rôle admin" };
	}

	// Vérifier que l'email ne soit pas pris par un AUTRE user
	const existing = await prisma.user.findUnique({
		where: { email: parsed.data.email },
	});
	if (existing && existing.id !== userId) {
		return { error: "Cet email est déjà utilisé par un autre utilisateur" };
	}

	await prisma.user.update({
		where: { id: userId },
		data: {
			name: parsed.data.name,
			email: parsed.data.email,
			role: parsed.data.role,
			membership: parsed.data.membership,
		},
	});

	revalidatePath("/admin/users");
	revalidatePath(`/admin/users/${userId}`);
	return { success: true };
}

export async function deleteUser(userId) {
	const session = await requireAdmin();

	if (userId === session.user.id) {
		return { error: "Tu ne peux pas supprimer ton propre compte" };
	}

	await prisma.user.delete({ where: { id: userId } });

	revalidatePath("/admin/users");
	redirect("/admin/users");
}

export async function deleteUserInline(userId) {
	const session = await requireAdmin();

	if (userId === session.user.id) {
		return { error: "Tu ne peux pas supprimer ton propre compte" };
	}

	await prisma.user.delete({ where: { id: userId } });

	revalidatePath("/admin/users");
	return { success: true };
}

export async function markUserEmailVerified(userId) {
	await requireAdmin();

	await prisma.user.update({
		where: { id: userId },
		data: { emailVerified: new Date() },
	});

	revalidatePath("/admin/users");
	revalidatePath(`/admin/users/${userId}`);
	return { success: true };
}

export async function quickUpdateUserRole(userId, role) {
	const session = await requireAdmin();
	const parsed = quickRoleSchema.safeParse({ role });

	if (!parsed.success) {
		return { error: "Rôle invalide" };
	}

	if (userId === session.user.id && parsed.data.role !== "ADMIN") {
		return { error: "Tu ne peux pas retirer ton propre rôle admin" };
	}

	await prisma.user.update({
		where: { id: userId },
		data: { role: parsed.data.role },
	});

	revalidatePath("/admin/users");
	revalidatePath(`/admin/users/${userId}`);
	return { success: true };
}

export async function resetUserPasswordTemp(userId) {
	await requireAdmin();

	const randomPart = crypto.randomBytes(4).toString("hex");
	const tempPassword = `Aeria${Math.floor(1000 + Math.random() * 9000)}!${randomPart}`;
	const hashed = await bcrypt.hash(tempPassword, 12);

	await prisma.user.update({
		where: { id: userId },
		data: {
			password: hashed,
		},
	});

	revalidatePath(`/admin/users/${userId}`);
	return { success: true, tempPassword };
}

export async function generateManualCertificateForUser(userId, courseId) {
	await requireAdmin();

	const parsed = manualCertificateSchema.safeParse({ userId, courseId });
	if (!parsed.success) {
		return { error: parsed.error.issues[0].message };
	}

	const [user, course] = await Promise.all([
		prisma.user.findUnique({
			where: { id: parsed.data.userId },
			select: { id: true },
		}),
		prisma.course.findUnique({
			where: { id: parsed.data.courseId },
			select: { id: true },
		}),
	]);

	if (!user) {
		return { error: "Utilisateur introuvable" };
	}

	if (!course) {
		return { error: "Cours introuvable" };
	}

	await prisma.enrollment.upsert({
		where: {
			userId_courseId: {
				userId: parsed.data.userId,
				courseId: parsed.data.courseId,
			},
		},
		update: {},
		create: {
			userId: parsed.data.userId,
			courseId: parsed.data.courseId,
		},
	});

	const existing = await prisma.certificate.findUnique({
		where: {
			userId_courseId: {
				userId: parsed.data.userId,
				courseId: parsed.data.courseId,
			},
		},
		select: { id: true },
	});

	if (existing) {
		return {
			success: true,
			alreadyExists: true,
			certificateId: existing.id,
		};
	}

	const certificate = await prisma.certificate.create({
		data: {
			userId: parsed.data.userId,
			courseId: parsed.data.courseId,
		},
		select: { id: true },
	});

	revalidatePath("/admin/users");
	revalidatePath(`/admin/users/${parsed.data.userId}`);
	revalidatePath("/dashboard");
	revalidatePath("/dashboard/certificates");

	return {
		success: true,
		alreadyExists: false,
		certificateId: certificate.id,
	};
}
