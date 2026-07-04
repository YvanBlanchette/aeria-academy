"use server";

import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { convertImageFileToWebpBuffer } from "@/lib/server/image-conversion";

const ALLOWED_TYPES = {
	image: {
		mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
		maxSize: 20 * 1024 * 1024,
		subdir: "images",
		webpQuality: 82,
	},
	audio: {
		mimes: ["audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm", "audio/opus"],
		maxSize: 50 * 1024 * 1024,
		subdir: "audio",
	},
	pdf: {
		mimes: ["application/pdf"],
		maxSize: 20 * 1024 * 1024,
		subdir: "pdfs",
	},
};

export async function uploadArticleMedia(formData) {
	const session = await auth();
	if (!session || session.user.role !== "ADMIN") {
		return { error: "Non autorisé" };
	}

	const file = formData.get("file");
	const kind = formData.get("kind"); // "image" | "audio" | "pdf"

	if (!file || typeof file === "string") {
		return { error: "Aucun fichier reçu" };
	}

	const config = ALLOWED_TYPES[kind];
	if (!config) return { error: "Type non supporté" };

	if (!config.mimes.includes(file.type)) {
		return { error: `Format invalide (${file.type})` };
	}

	if (file.size > config.maxSize) {
		const maxMb = Math.round(config.maxSize / 1024 / 1024);
		if (kind === "image") {
			return { error: `Image trop volumineuse (${maxMb} MB max avant conversion)` };
		}
		return { error: `Fichier trop volumineux (${maxMb} MB max)` };
	}

	const uploadDir = path.join(process.cwd(), "public", "uploads", "articles", config.subdir);
	if (!existsSync(uploadDir)) {
		await mkdir(uploadDir, { recursive: true });
	}

	const ext = kind === "image" ? ".webp" : path.extname(file.name) || "";
	const filename = `${randomUUID()}${ext}`;
	const filepath = path.join(uploadDir, filename);

	let outputBuffer;
	if (kind === "image") {
		try {
			outputBuffer = await convertImageFileToWebpBuffer({
				file,
				quality: config.webpQuality,
			});
		} catch {
			return { error: "Impossible de convertir l'image en WebP" };
		}
	} else {
		const bytes = await file.arrayBuffer();
		outputBuffer = Buffer.from(bytes);
	}

	await writeFile(filepath, outputBuffer);

	return {
		url: `/uploads/articles/${config.subdir}/${filename}`,
		filename: file.name,
	};
}
