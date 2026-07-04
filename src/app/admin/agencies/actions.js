"use server";

import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { slugify } from "@/lib/slugify";
import { convertImageFileToWebpBuffer } from "@/lib/server/image-conversion";

const AGENCY_LOGO_IMAGE_CONFIG = {
	allowedMimes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
	maxSourceSize: 20 * 1024 * 1024,
	webpQuality: 82,
};

async function requireAdmin() {
	const session = await auth();
	if (!session || session.user.role !== "ADMIN") {
		throw new Error("Non autorisé");
	}
	return session;
}

function urlOrEmpty(message) {
	return z
		.string()
		.refine((val) => val === "" || /^https?:\/\/.+/.test(val), { message })
		.transform((v) => (v === "" ? null : v));
}

const agencySchema = z.object({
	name: z.string().min(2, "Nom trop court").max(100),
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

function parseFormData(formData) {
	const nameRaw = formData.get("name");
	return {
		name: typeof nameRaw === "string" ? nameRaw.trim() : "",
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
}

export async function adminCreateAgency(formData) {
	const session = await requireAdmin();

	const parsed = agencySchema.safeParse(parseFormData(formData));
	if (!parsed.success) {
		return { error: parsed.error.issues[0].message };
	}

	let slug = slugify(parsed.data.name);
	const existing = await prisma.agency.findUnique({ where: { slug } });
	if (existing) slug = `${slug}-${Date.now()}`;

	const agency = await prisma.agency.create({
		data: {
			...parsed.data,
			email: parsed.data.email || null,
			slug,
			adminUserId: session.user.id,
			approved: true, // créée par l'admin AERIA → approuvée d'office
		},
	});

	revalidatePath("/admin/agencies");
	redirect(`/admin/agencies/${agency.id}`);
}

export async function adminUpdateAgency(agencyId, formData) {
	await requireAdmin();

	const parsed = agencySchema.safeParse(parseFormData(formData));
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

	revalidatePath("/admin/agencies");
	revalidatePath(`/admin/agencies/${agencyId}`);
	return { success: true };
}

export async function approveAgency(agencyId) {
	await requireAdmin();
	await prisma.agency.update({
		where: { id: agencyId },
		data: { approved: true },
	});
	revalidatePath("/admin/agencies");
	revalidatePath(`/admin/agencies/${agencyId}`);
	return { success: true };
}

export async function rejectAgency(agencyId) {
	await requireAdmin();
	if (!agencyId) return { error: "Agence introuvable" };
	// On délie les membres avant de supprimer
	await prisma.userProfile.updateMany({
		where: { agencyId },
		data: { agencyId: null, agencyRole: null },
	});
	await prisma.agency.delete({ where: { id: agencyId } });
	revalidatePath("/admin/agencies");
	redirect("/admin/agencies");
}

export async function deleteAgencyInline(agencyId) {
	await requireAdmin();
	if (!agencyId) return { error: "Agence introuvable" };

	await prisma.userProfile.updateMany({
		where: { agencyId },
		data: { agencyId: null, agencyRole: null },
	});

	await prisma.agency.delete({ where: { id: agencyId } });
	revalidatePath("/admin/agencies");
	return { success: true };
}

export async function changeAgencyAdmin(agencyId, newAdminUserId) {
	await requireAdmin();
	await prisma.agency.update({
		where: { id: agencyId },
		data: { adminUserId: newAdminUserId || null },
	});
	revalidatePath(`/admin/agencies/${agencyId}`);
	return { success: true };
}

export async function removeMemberFromAgency(userId, agencyId) {
	await requireAdmin();
	await prisma.userProfile.update({
		where: { userId },
		data: { agencyId: null, agencyRole: null },
	});
	revalidatePath(`/admin/agencies/${agencyId}`);
	return { success: true };
}

export async function adminUploadAgencyLogo(formData) {
	const session = await requireAdmin();

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
