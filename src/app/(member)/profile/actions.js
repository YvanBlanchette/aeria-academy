"use server";

import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { normalizePublicVisibility } from "@/lib/profile-visibility";
import { convertImageFileToWebpBuffer } from "@/lib/server/image-conversion";
import { RESERVED_USERNAMES, findAvailableUsername, usernameBaseFromUser, generateDefaultUsernameForUser } from "@/lib/username";

// Helper : valide qu'une chaîne est une URL ou vide
function urlOrEmpty(message) {
	return z
		.string()
		.refine((val) => val === "" || /^https?:\/\/.+/.test(val), { message })
		.transform((v) => (v === "" ? null : v));
}

const usernameSchema = z
	.string()
	.min(3, "Au moins 3 caractères")
	.max(30, "Maximum 30 caractères")
	.regex(/^[a-z0-9-]+$/, "Lettres minuscules, chiffres et tirets uniquement")
	.refine((val) => !val.startsWith("-") && !val.endsWith("-"), {
		message: "Ne peut pas commencer ou finir par un tiret",
	});

export async function updateUsername(formData) {
	const session = await auth();
	if (!session) return { error: "Non autorisé" };

	const rawUsername = String(formData.get("username") || "")
		.toLowerCase()
		.trim();

	// Cas spécial : si vide, on regénère un username par défaut unique.
	if (rawUsername === "") {
		const currentUser = await prisma.user.findUnique({
			where: { id: session.user.id },
			select: { id: true, name: true, email: true },
		});

		if (!currentUser) return { error: "Utilisateur introuvable" };

		const generatedUsername = await generateDefaultUsernameForUser({
			name: currentUser.name,
			email: currentUser.email,
			id: currentUser.id,
			excludeUserId: currentUser.id,
		});

		await prisma.user.update({
			where: { id: session.user.id },
			data: { username: generatedUsername },
		});
		revalidatePath("/profile");
		return { success: true, username: generatedUsername };
	}

	// Valide le format
	const parsed = usernameSchema.safeParse(rawUsername);
	if (!parsed.success) {
		return { error: parsed.error.issues[0].message };
	}

	// Mots réservés
	if (RESERVED_USERNAMES.includes(rawUsername)) {
		return { error: "Ce nom d'utilisateur est réservé" };
	}

	// Disponibilité
	const existing = await prisma.user.findUnique({
		where: { username: rawUsername },
	});
	if (existing && existing.id !== session.user.id) {
		return { error: "Ce nom d'utilisateur est déjà pris" };
	}

	// Update
	await prisma.user.update({
		where: { id: session.user.id },
		data: { username: rawUsername },
	});

	revalidatePath("/profile");
	return { success: true, username: rawUsername };
}

// Suggestion de username à partir du nom (utile pour proposer un default)
export async function suggestUsername(name) {
	if (!name) return null;
	const base = usernameBaseFromUser({ name, email: null, id: null });
	return findAvailableUsername(base);
}

const profileSchema = z.object({
	name: z.string().min(2, "Nom trop court").max(120, "Nom trop long"),
	image: z
		.string()
		.refine((val) => val === "" || val.startsWith("/uploads/") || /^https?:\/\//.test(val), {
			message: "URL d'image invalide",
		})
		.optional(),
	coverImage: z
		.string()
		.refine((val) => val === "" || val.startsWith("/uploads/") || /^https?:\/\//.test(val), {
			message: "URL d'image de couverture invalide",
		})
		.optional(),

	// Coordonnées
	phone: z.string().max(30).optional().nullable(),
	address: z.string().max(200).optional().nullable(),
	city: z.string().max(100).optional().nullable(),
	province: z.string().max(50).optional().nullable(),
	country: z.string().max(50).optional().nullable(),
	postalCode: z.string().max(20).optional().nullable(),

	// Profil pro
	bio: z.string().max(2000).optional().nullable(),
	jobTitle: z.string().max(100).optional().nullable(),
	company: z.string().max(100).optional().nullable(),
	websiteUrl: urlOrEmpty("Site web invalide (commence par https://)"),

	// Social links
	facebookUrl: urlOrEmpty("URL Facebook invalide"),
	linkedinUrl: urlOrEmpty("URL LinkedIn invalide"),
	instagramUrl: urlOrEmpty("URL Instagram invalide"),
	tiktokUrl: urlOrEmpty("URL TikTok invalide"),
	twitterUrl: urlOrEmpty("URL Twitter/X invalide"),
	youtubeUrl: urlOrEmpty("URL YouTube invalide"),

	publicProfile: z.boolean().default(false),
	showJobTitle: z.boolean().default(true),
	showCompany: z.boolean().default(true),
	showBio: z.boolean().default(true),
	showWebsite: z.boolean().default(true),
	showSocialLinks: z.boolean().default(true),
	showAgency: z.boolean().default(true),
	showCommunityStats: z.boolean().default(true),
	showCommunityPosts: z.boolean().default(true),
	showCertificates: z.boolean().default(true),
	showFollowStats: z.boolean().default(true),

	agencyRole: z.string().max(100).optional().nullable(),
});

export async function updateProfile(formData) {
	const session = await auth();
	if (!session) return { error: "Non autorisé" };
	const hasCoverImageField = formData.has("coverImage");

	// Convertit le FormData en objet
	const raw = {
		name: String(formData.get("name") || "").trim(),
		image: String(formData.get("image") || "").trim(),
		coverImage: hasCoverImageField ? String(formData.get("coverImage") || "").trim() : undefined,
		phone: formData.get("phone") || null,
		address: formData.get("address") || null,
		city: formData.get("city") || null,
		province: formData.get("province") || null,
		country: formData.get("country") || null,
		postalCode: formData.get("postalCode") || null,
		bio: formData.get("bio") || null,
		jobTitle: formData.get("jobTitle") || null,
		company: formData.get("company") || null,
		websiteUrl: formData.get("websiteUrl") || "",
		facebookUrl: formData.get("facebookUrl") || "",
		linkedinUrl: formData.get("linkedinUrl") || "",
		instagramUrl: formData.get("instagramUrl") || "",
		tiktokUrl: formData.get("tiktokUrl") || "",
		twitterUrl: formData.get("twitterUrl") || "",
		youtubeUrl: formData.get("youtubeUrl") || "",
		publicProfile: formData.get("publicProfile") === "true",
		showJobTitle: formData.get("showJobTitle") === "true",
		showCompany: formData.get("showCompany") === "true",
		showBio: formData.get("showBio") === "true",
		showWebsite: formData.get("showWebsite") === "true",
		showSocialLinks: formData.get("showSocialLinks") === "true",
		showAgency: formData.get("showAgency") === "true",
		showCommunityStats: formData.get("showCommunityStats") === "true",
		showCommunityPosts: formData.get("showCommunityPosts") === "true",
		showCertificates: formData.get("showCertificates") === "true",
		showFollowStats: formData.get("showFollowStats") === "true",
		agencyRole: formData.get("agencyRole") || null,
	};

	const parsed = profileSchema.safeParse(raw);
	if (!parsed.success) {
		return { error: parsed.error.issues[0].message };
	}

	const d = parsed.data;
	const publicVisibility = normalizePublicVisibility({
		showJobTitle: d.showJobTitle,
		showCompany: d.showCompany,
		showBio: d.showBio,
		showWebsite: d.showWebsite,
		showSocialLinks: d.showSocialLinks,
		showAgency: d.showAgency,
		showCommunityStats: d.showCommunityStats,
		showCommunityPosts: d.showCommunityPosts,
		showCertificates: d.showCertificates,
		showFollowStats: d.showFollowStats,
	});

	// Construit l'objet socialLinks
	const socialLinks = {};
	if (d.facebookUrl) socialLinks.facebook = d.facebookUrl;
	if (d.linkedinUrl) socialLinks.linkedin = d.linkedinUrl;
	if (d.instagramUrl) socialLinks.instagram = d.instagramUrl;
	if (d.tiktokUrl) socialLinks.tiktok = d.tiktokUrl;
	if (d.twitterUrl) socialLinks.twitter = d.twitterUrl;
	if (d.youtubeUrl) socialLinks.youtube = d.youtubeUrl;

	await prisma.user.update({
		where: { id: session.user.id },
		data: {
			name: d.name,
			image: d.image || null,
		},
	});

	await prisma.userProfile.upsert({
		where: { userId: session.user.id },
		update: {
			...(hasCoverImageField ? { coverImage: d.coverImage || null } : {}),
			phone: d.phone,
			address: d.address,
			city: d.city,
			province: d.province,
			country: d.country,
			postalCode: d.postalCode,
			bio: d.bio,
			jobTitle: d.jobTitle,
			company: d.company,
			websiteUrl: d.websiteUrl,
			socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : null,
			publicProfile: d.publicProfile,
			publicVisibility,
			agencyRole: d.agencyRole,
		},
		create: {
			userId: session.user.id,
			coverImage: d.coverImage || null,
			phone: d.phone,
			address: d.address,
			city: d.city,
			province: d.province,
			country: d.country,
			postalCode: d.postalCode,
			bio: d.bio,
			jobTitle: d.jobTitle,
			company: d.company,
			websiteUrl: d.websiteUrl,
			socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : null,
			publicProfile: d.publicProfile,
			publicVisibility,
			agencyRole: d.agencyRole,
		},
	});

	const currentUser = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: { username: true },
	});
	revalidatePath("/profile");
	revalidatePath("/dashboard");
	if (currentUser?.username) {
		revalidatePath(`/users/${currentUser.username}`);
	}
	return { success: true };
}

async function revalidateOwnProfilePaths(userId) {
	const currentUser = await prisma.user.findUnique({
		where: { id: userId },
		select: { username: true },
	});

	revalidatePath("/profile");
	revalidatePath("/dashboard");
	if (currentUser?.username) {
		revalidatePath(`/users/${currentUser.username}`);
		revalidatePath(`/users/${currentUser.username}/followers`);
		revalidatePath(`/users/${currentUser.username}/following`);
	}
}

const PROFILE_IMAGE_CONFIG = {
	allowedMimes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
	maxSourceSize: 20 * 1024 * 1024,
	webpQuality: 82,
};

async function uploadUserImage({ file, sessionUserId, folder }) {
	if (!PROFILE_IMAGE_CONFIG.allowedMimes.includes(file.type)) {
		return { error: `Format invalide. Reçu : ${file.type}` };
	}

	if (file.size > PROFILE_IMAGE_CONFIG.maxSourceSize) {
		return { error: "Image trop volumineuse (20 MB max avant conversion)" };
	}

	const uploadDir = path.join(process.cwd(), "public", "uploads", "users", folder);
	if (!existsSync(uploadDir)) {
		await mkdir(uploadDir, { recursive: true });
	}

	const filename = `${sessionUserId}-${randomUUID()}.webp`;
	const filePath = path.join(uploadDir, filename);

	let webpBuffer;
	try {
		webpBuffer = await convertImageFileToWebpBuffer({
			file,
			quality: PROFILE_IMAGE_CONFIG.webpQuality,
		});
	} catch {
		return { error: "Impossible de convertir l'image en WebP" };
	}

	await writeFile(filePath, webpBuffer);

	return {
		url: `/uploads/users/${folder}/${filename}`,
	};
}

export async function uploadProfileImage(formData) {
	const session = await auth();
	if (!session) return { error: "Non autorisé" };

	const file = formData.get("file");
	if (!file || typeof file === "string") {
		return { error: "Aucun fichier reçu" };
	}

	return uploadUserImage({
		file,
		sessionUserId: session.user.id,
		folder: "avatars",
	});
}

export async function uploadProfileCoverImage(formData) {
	const session = await auth();
	if (!session) return { error: "Non autorisé" };

	const file = formData.get("file");
	if (!file || typeof file === "string") {
		return { error: "Aucun fichier reçu" };
	}

	return uploadUserImage({
		file,
		sessionUserId: session.user.id,
		folder: "covers",
	});
}

export async function setProfileCoverImage(formData) {
	const session = await auth();
	if (!session) return { error: "Non autorisé" };

	const uploadResult = await uploadProfileCoverImage(formData);
	if (uploadResult?.error || !uploadResult?.url) {
		return uploadResult;
	}

	await prisma.userProfile.upsert({
		where: { userId: session.user.id },
		update: { coverImage: uploadResult.url },
		create: {
			userId: session.user.id,
			coverImage: uploadResult.url,
		},
	});

	await revalidateOwnProfilePaths(session.user.id);
	return { success: true, url: uploadResult.url };
}

export async function clearProfileCoverImage() {
	const session = await auth();
	if (!session) return { error: "Non autorisé" };

	await prisma.userProfile.upsert({
		where: { userId: session.user.id },
		update: { coverImage: null },
		create: {
			userId: session.user.id,
			coverImage: null,
		},
	});

	await revalidateOwnProfilePaths(session.user.id);
	return { success: true };
}

export async function updateAccount(formData) {
	const session = await auth();
	if (!session) return { error: "Non autorisé" };

	const name = String(formData.get("name") || "").trim();
	const image = String(formData.get("image") || "").trim();

	if (name.length < 2) return { error: "Nom trop court" };

	await prisma.user.update({
		where: { id: session.user.id },
		data: {
			name,
			image: image || null,
		},
	});

	revalidatePath("/profile");
	return { success: true };
}
