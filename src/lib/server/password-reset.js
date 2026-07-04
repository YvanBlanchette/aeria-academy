import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const PASSWORD_RESET_TTL_MINUTES = 60;
const PASSWORD_RESET_RESEND_COOLDOWN_MINUTES = 5;
const PASSWORD_RESET_RATE_LIMIT_WINDOW_MINUTES = 15;
const PASSWORD_RESET_MAX_ATTEMPTS_PER_EMAIL = 3;
const PASSWORD_RESET_MAX_ATTEMPTS_PER_IP = 12;
const PASSWORD_RESET_ATTEMPT_RETENTION_HOURS = 72;

function getTokenSecret() {
	return process.env.PASSWORD_RESET_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || "fallback-reset-secret";
}

function hashRateLimitValue(rawValue, namespace) {
	return createHash("sha256")
		.update(
			`${namespace}:${String(rawValue || "unknown")
				.toLowerCase()
				.trim()}:${getTokenSecret()}`,
		)
		.digest("hex");
}

export function hashPasswordResetEmail(email) {
	return hashRateLimitValue(email, "password-reset-email");
}

export function hashPasswordResetIp(ipAddress) {
	return hashRateLimitValue(ipAddress, "password-reset-ip");
}

export function hashPasswordResetToken(rawToken) {
	return createHash("sha256").update(`${rawToken}:${getTokenSecret()}`).digest("hex");
}

export function generatePasswordResetToken() {
	return randomBytes(32).toString("hex");
}

export async function createPasswordResetRecord(email) {
	const token = generatePasswordResetToken();
	const tokenHash = hashPasswordResetToken(token);
	const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

	// Keep only one active token per email to reduce attack surface.
	await prisma.passwordResetToken.deleteMany({
		where: {
			email,
			usedAt: null,
		},
	});

	await prisma.passwordResetToken.create({
		data: {
			email,
			tokenHash,
			expiresAt,
		},
	});

	return {
		token,
		expiresAt,
	};
}

export async function findValidPasswordResetToken({ email, token }) {
	const tokenHash = hashPasswordResetToken(token);
	return prisma.passwordResetToken.findFirst({
		where: {
			email,
			tokenHash,
			usedAt: null,
			expiresAt: { gt: new Date() },
		},
	});
}

export function buildPasswordResetLink({ token, email }) {
	const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
	const url = new URL("/reset-password", baseUrl);
	url.searchParams.set("token", token);
	url.searchParams.set("email", email);
	return url.toString();
}

export async function cleanupExpiredPasswordResetTokens() {
	await prisma.passwordResetToken.deleteMany({
		where: {
			expiresAt: { lt: new Date() },
		},
	});
}

export async function cleanupOldPasswordResetRequestAttempts() {
	const cutoff = new Date(Date.now() - PASSWORD_RESET_ATTEMPT_RETENTION_HOURS * 60 * 60 * 1000);
	await prisma.passwordResetRequestAttempt.deleteMany({
		where: {
			createdAt: { lt: cutoff },
		},
	});
}

export async function recordPasswordResetRequestAttempt({ email, ipAddress }) {
	const emailHash = hashPasswordResetEmail(email);
	const ipHash = hashPasswordResetIp(ipAddress);

	await prisma.passwordResetRequestAttempt.create({
		data: {
			emailHash,
			ipHash,
		},
	});
}

export async function isPasswordResetRequestRateLimited({ email, ipAddress }) {
	const status = await getPasswordResetRequestRateLimitStatus({
		email,
		ipAddress,
	});
	return status.limited;
}

export async function getPasswordResetRequestRateLimitStatus({ email, ipAddress }) {
	const emailHash = hashPasswordResetEmail(email);
	const ipHash = hashPasswordResetIp(ipAddress);
	const now = Date.now();
	const windowMs = PASSWORD_RESET_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
	const cooldownMs = PASSWORD_RESET_RESEND_COOLDOWN_MINUTES * 60 * 1000;
	const windowStart = new Date(now - windowMs);

	const [emailAttempts, ipAttempts, latestEmailAttempt] = await Promise.all([
		prisma.passwordResetRequestAttempt.count({
			where: {
				emailHash,
				createdAt: { gte: windowStart },
			},
		}),
		prisma.passwordResetRequestAttempt.count({
			where: {
				ipHash,
				createdAt: { gte: windowStart },
			},
		}),
		prisma.passwordResetRequestAttempt.findFirst({
			where: { emailHash },
			orderBy: { createdAt: "desc" },
			select: { createdAt: true },
		}),
	]);

	let retryAfterMs = 0;

	if (latestEmailAttempt?.createdAt) {
		const nextAllowedAt = latestEmailAttempt.createdAt.getTime() + cooldownMs;
		retryAfterMs = Math.max(retryAfterMs, nextAllowedAt - now);
	}

	if (emailAttempts >= PASSWORD_RESET_MAX_ATTEMPTS_PER_EMAIL) {
		const emailThresholdAttempt = await prisma.passwordResetRequestAttempt.findFirst({
			where: {
				emailHash,
				createdAt: { gte: windowStart },
			},
			orderBy: { createdAt: "desc" },
			skip: PASSWORD_RESET_MAX_ATTEMPTS_PER_EMAIL - 1,
			select: { createdAt: true },
		});

		if (emailThresholdAttempt?.createdAt) {
			const nextAllowedAt = emailThresholdAttempt.createdAt.getTime() + windowMs;
			retryAfterMs = Math.max(retryAfterMs, nextAllowedAt - now);
		}
	}

	if (ipAttempts >= PASSWORD_RESET_MAX_ATTEMPTS_PER_IP) {
		const ipThresholdAttempt = await prisma.passwordResetRequestAttempt.findFirst({
			where: {
				ipHash,
				createdAt: { gte: windowStart },
			},
			orderBy: { createdAt: "desc" },
			skip: PASSWORD_RESET_MAX_ATTEMPTS_PER_IP - 1,
			select: { createdAt: true },
		});

		if (ipThresholdAttempt?.createdAt) {
			const nextAllowedAt = ipThresholdAttempt.createdAt.getTime() + windowMs;
			retryAfterMs = Math.max(retryAfterMs, nextAllowedAt - now);
		}
	}

	const retryAfterSeconds = Math.max(0, Math.ceil(retryAfterMs / 1000));

	return {
		limited: retryAfterSeconds > 0,
		retryAfterSeconds,
	};
}
