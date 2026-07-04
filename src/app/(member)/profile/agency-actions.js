"use server";

import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { slugify } from "@/lib/slugify";
import { convertImageFileToWebpBuffer } from "@/lib/server/image-conversion";

const AGENCY_LOGO_IMAGE_CONFIG = {
	allowedMimes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
	maxSourceSize: 20 * 1024 * 1024,
	webpQuality: 82,
};

function urlOrEmpty(message) {
	return z
		.string()
		.refine((val) => val === "" || /^https?:\/\/.+/.test(val), { message })
		.transform((v) => (v === "" ? null : v));
}

const agencySchema = z.object({
	name: z.string().min(2, "Nom d'agence trop court").max(100),
	address: z.string().max(200).optional().nullable(),
	city: z.string().max(100).optional().nullable(),
	province: z.string().max(50).optional().nullable(),
	postalCode: z.string().max(20).optional().nullable(),
	country: z.string().max(50).optional().nullable(),
	phone: z.string().max(30).optional().nullable(),
	email: z.string().email("Email invalide").optional().or(z.literal("")).nullable(),
	websiteUrl: urlOrEmpty("Site web invalide"),
	logoUrl: z.string().optional().nullable(),
	description: z.string().max(2000).optional().nullable(),
	iataCode: z.string().max(50).optional().nullable(),
	tico: z.string().max(50).optional().nullable(),
	opc: z.string().max(50).optional().nullable(),
});

/**
 * Recherche d'agences par nom (autocomplete)
 * Limité aux agences approuvées pour la recherche publique
 */
export async function searchAgencies(query) {
	if (!query || query.length < 2) return [];

	const agencies = await prisma.agency.findMany({
		where: {
			approved: true,
			name: { contains: query, mode: "insensitive" },
		},
		select: {
			id: true,
			name: true,
			city: true,
			province: true,
			logoUrl: true,
			_count: { select: { members: true } },
		},
		take: 10,
		orderBy: { name: "asc" },
	});

	return agencies;
}

/**
 * Crée une nouvelle agence. L'utilisateur en devient admin par défaut.
 * L'agence n'est PAS approuvée tant que toi (admin AERIA) ne valides pas.
 */
export async function createAgency(formData) {
	const session = await auth();
	if (!session) return { error: "Non autorisé" };

	const raw = {
		name: formData.get("name"),
		address: formData.get("address") || null,
		city: formData.get("city") || null,
		province: formData.get("province") || null,
		postalCode: formData.get("postalCode") || null,
		country: formData.get("country") || null,
		phone: formData.get("phone") || null,
		email: formData.get("email") || null,
		websiteUrl: formData.get("websiteUrl") || "",
		logoUrl: formData.get("logoUrl") || null,
		description: formData.get("description") || null,
		iataCode: formData.get("iataCode") || null,
		tico: formData.get("tico") || null,
		opc: formData.get("opc") || null,
	};

	const parsed = agencySchema.safeParse(raw);
	if (!parsed.success) {
		return { error: parsed.error.issues[0].message };
	}

	// Génère un slug unique
	let slug = slugify(parsed.data.name);
	const existing = await prisma.agency.findUnique({ where: { slug } });
	if (existing) slug = `${slug}-${Date.now()}`;

	const agency = await prisma.agency.create({
		data: {
			...parsed.data,
			email: parsed.data.email || null,
			slug,
			adminUserId: session.user.id,
			approved: session.user.role === "ADMIN", // auto-approuvée si admin AERIA crée
		},
	});

	// Lie automatiquement le user à cette agence
	await prisma.userProfile.upsert({
		where: { userId: session.user.id },
		update: { agencyId: agency.id },
		create: {
			userId: session.user.id,
			agencyId: agency.id,
		},
	});

	revalidatePath("/profile");
	return { success: true, agencyId: agency.id };
}

/**
 * Modifie une agence existante.
 * Autorisé uniquement à l'admin de l'agence et aux ADMIN AERIA.
 */
export async function updateAgency(agencyId, formData) {
	const session = await auth();
	if (!session) return { error: "Non autorisé" };

	const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
	if (!agency) return { error: "Agence introuvable" };

	const isAgencyAdmin = agency.adminUserId === session.user.id;
	const isAeriaAdmin = session.user.role === "ADMIN";

	if (!isAgencyAdmin && !isAeriaAdmin) {
		return { error: "Tu n'es pas autorisé à modifier cette agence" };
	}

	const raw = {
		name: formData.get("name"),
		address: formData.get("address") || null,
		city: formData.get("city") || null,
		province: formData.get("province") || null,
		postalCode: formData.get("postalCode") || null,
		country: formData.get("country") || null,
		phone: formData.get("phone") || null,
		email: formData.get("email") || null,
		websiteUrl: formData.get("websiteUrl") || "",
		logoUrl: formData.get("logoUrl") || null,
		description: formData.get("description") || null,
		iataCode: formData.get("iataCode") || null,
		tico: formData.get("tico") || null,
		opc: formData.get("opc") || null,
	};

	const parsed = agencySchema.safeParse(raw);
	if (!parsed.success) {
		return { error: parsed.error.issues[0].message };
	}

	await prisma.agency.update({
		where: { id: agencyId },
		data: {
			...parsed.data,
			email: parsed.data.email || null,
		},
	});

	revalidatePath("/profile");
	return { success: true };
}

/**
 * Rejoindre une agence existante (approuvée)
 */
export async function joinAgency(agencyId, agencyRole = null) {
	const session = await auth();
	if (!session) return { error: "Non autorisé" };

	const agency = await prisma.agency.findUnique({
		where: { id: agencyId },
		select: { id: true, approved: true },
	});

	if (!agency) return { error: "Agence introuvable" };
	if (!agency.approved) return { error: "Cette agence n'est pas encore validée" };

	await prisma.userProfile.upsert({
		where: { userId: session.user.id },
		update: { agencyId: agency.id, agencyRole },
		create: {
			userId: session.user.id,
			agencyId: agency.id,
			agencyRole,
		},
	});

	revalidatePath("/profile");
	return { success: true };
}

/**
 * Quitter son agence actuelle
 */
export async function leaveAgency() {
	const session = await auth();
	if (!session) return { error: "Non autorisé" };

	await prisma.userProfile.update({
		where: { userId: session.user.id },
		data: { agencyId: null, agencyRole: null },
	});

	revalidatePath("/profile");
	return { success: true };
}

export async function uploadAgencyLogo(formData) {
	const session = await auth();
	if (!session) return { error: "Non autorisé" };

	const file = formData.get("file");
	if (!file || typeof file === "string") {
		return { error: "Aucun fichier reçu" };
	}

	if (!AGENCY_LOGO_IMAGE_CONFIG.allowedMimes.includes(file.type)) {
		return { error: `Format invalide. Reçu : ${file.type}` };
	}

	if (file.size > AGENCY_LOGO_IMAGE_CONFIG.maxSourceSize) {
		return { error: "Image trop volumineuse (20 MB max avant conversion)" };
	}

	const uploadDir = path.join(process.cwd(), "public", "uploads", "agencies", "logos");
	if (!existsSync(uploadDir)) {
		await mkdir(uploadDir, { recursive: true });
	}

	const filename = `${session.user.id}-${randomUUID()}.webp`;
	const filePath = path.join(uploadDir, filename);

	let webpBuffer;
	try {
		webpBuffer = await convertImageFileToWebpBuffer({
			file,
			quality: AGENCY_LOGO_IMAGE_CONFIG.webpQuality,
		});
	} catch {
		return { error: "Impossible de convertir l'image en WebP" };
	}

	await writeFile(filePath, webpBuffer);

	return {
		url: `/uploads/agencies/logos/${filename}`,
	};
}
