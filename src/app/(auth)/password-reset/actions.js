"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
	buildPasswordResetLink,
	cleanupExpiredPasswordResetTokens,
	cleanupOldPasswordResetRequestAttempts,
	createPasswordResetRecord,
	findValidPasswordResetToken,
	getPasswordResetRequestRateLimitStatus,
	recordPasswordResetRequestAttempt,
} from "@/lib/server/password-reset";
import { sendPasswordResetEmail } from "@/lib/server/password-reset-email";

function sanitize(value) {
	return String(value ?? "").trim();
}

const forgotPasswordSchema = z.object({
	email: z.string().trim().email("Email invalide"),
});

const resetPasswordSchema = z
	.object({
		email: z.string().trim().email("Email invalide"),
		token: z.string().trim().min(16, "Jeton invalide"),
		password: z
			.string()
			.min(8, "Le mot de passe doit faire au moins 8 caracteres")
			.regex(/[A-Z]/, "Doit contenir au moins une majuscule")
			.regex(/[0-9]/, "Doit contenir au moins un chiffre"),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Les mots de passe ne correspondent pas",
		path: ["confirmPassword"],
	});

export async function requestPasswordReset(formData) {
	const parsed = forgotPasswordSchema.safeParse({
		email: formData.get("email"),
	});

	if (!parsed.success) {
		return { error: parsed.error.issues[0].message };
	}

	const email = parsed.data.email.toLowerCase();
	const requestHeaders = await headers();
	const ipAddress =
		sanitize(requestHeaders.get("x-forwarded-for")?.split(",")?.[0] || requestHeaders.get("x-real-ip") || requestHeaders.get("cf-connecting-ip")) || "unknown";

	await cleanupExpiredPasswordResetTokens();
	await cleanupOldPasswordResetRequestAttempts();

	const rateLimitStatus = await getPasswordResetRequestRateLimitStatus({
		email,
		ipAddress,
	});

	if (rateLimitStatus.limited) {
		return {
			success: true,
			retryAfterSeconds: rateLimitStatus.retryAfterSeconds,
		};
	}

	await recordPasswordResetRequestAttempt({
		email,
		ipAddress,
	});

	const user = await prisma.user.findUnique({
		where: { email },
		select: { id: true, email: true, password: true },
	});

	// Prevent account enumeration: always return success shape.
	if (!user?.password) {
		return { success: true };
	}

	try {
		const { token } = await createPasswordResetRecord(email);
		const resetLink = buildPasswordResetLink({ token, email });
		await sendPasswordResetEmail({ to: email, resetLink });
		return { success: true };
	} catch (error) {
		console.error("[password-reset] failed to send reset email", error);
		return { error: "Impossible d'envoyer l'email pour le moment" };
	}
}

export async function resetPassword(formData) {
	const parsed = resetPasswordSchema.safeParse({
		email: formData.get("email"),
		token: formData.get("token"),
		password: formData.get("password"),
		confirmPassword: formData.get("confirmPassword"),
	});

	if (!parsed.success) {
		return { error: parsed.error.issues[0].message };
	}

	const { email, token, password } = parsed.data;
	const normalizedEmail = email.toLowerCase();

	const resetToken = await findValidPasswordResetToken({
		email: normalizedEmail,
		token,
	});

	if (!resetToken) {
		return { error: "Lien invalide ou expire" };
	}

	const user = await prisma.user.findUnique({
		where: { email: normalizedEmail },
		select: { id: true, password: true },
	});

	if (!user?.id) {
		return { error: "Utilisateur introuvable" };
	}

	const passwordHash = await bcrypt.hash(password, 10);

	await prisma.$transaction([
		prisma.user.update({
			where: { id: user.id },
			data: { password: passwordHash },
		}),
		prisma.passwordResetToken.updateMany({
			where: {
				email: normalizedEmail,
				usedAt: null,
			},
			data: { usedAt: new Date() },
		}),
	]);

	return { success: true };
}
