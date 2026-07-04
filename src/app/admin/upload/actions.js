"use server";

import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { convertImageFileToWebpBuffer } from "@/lib/server/image-conversion";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SOURCE_SIZE = 20 * 1024 * 1024;
const WEBP_QUALITY = 82;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "courses");

export async function uploadCourseImage(formData) {
	const session = await auth();
	if (!session || session.user.role !== "ADMIN") {
		return { error: "Non autorisé" };
	}

	const file = formData.get("file");
	if (!file || typeof file === "string") {
		return { error: "Aucun fichier reçu" };
	}

	if (!ALLOWED_TYPES.includes(file.type)) {
		return { error: "Format non supporté (JPEG, PNG, WebP, GIF uniquement)" };
	}

	if (file.size > MAX_SOURCE_SIZE) {
		return { error: "Image trop volumineuse (20 MB max avant conversion)" };
	}

	// Crée le dossier s'il n'existe pas
	if (!existsSync(UPLOAD_DIR)) {
		await mkdir(UPLOAD_DIR, { recursive: true });
	}

	// Génère un nom unique pour éviter les collisions
	const filename = `${randomUUID()}.webp`;
	const filepath = path.join(UPLOAD_DIR, filename);

	let webpBuffer;
	try {
		webpBuffer = await convertImageFileToWebpBuffer({ file, quality: WEBP_QUALITY });
	} catch {
		return { error: "Impossible de convertir l'image en WebP" };
	}

	// Écrit le fichier converti
	await writeFile(filepath, webpBuffer);

	// Retourne l'URL relative que Next servira automatiquement
	return { url: `/uploads/courses/${filename}` };
}
