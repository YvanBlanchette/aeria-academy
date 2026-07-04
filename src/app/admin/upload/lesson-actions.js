"use server";

import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { convertImageFileToWebpBuffer } from "@/lib/server/image-conversion";

// Configurations par type de fichier
const FILE_CONFIGS = {
	PDF: {
		allowedMimes: ["application/pdf"],
		maxSize: 20 * 1024 * 1024, // 20 MB
		subdir: "pdfs",
	},
	AUDIO: {
		allowedMimes: [
			"audio/mpeg",
			"audio/mp4",
			"audio/x-m4a",
			"audio/wav",
			"audio/ogg",
			"audio/webm",
			"audio/opus",
			"video/webm",
			"video/ogg",
			"application/octet-stream",
		],
		allowedExtensions: ["mp3", "m4a", "wav", "ogg", "webm", "opus"],
		maxSize: 100 * 1024 * 1024, // 100 MB
		subdir: "audio",
	},
	VIDEO: {
		allowedMimes: ["video/mp4", "video/webm", "video/quicktime"],
		maxSize: 500 * 1024 * 1024, // 500 MB
		subdir: "video",
	},
	IMAGE: {
		allowedMimes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
		maxSize: 20 * 1024 * 1024,
		subdir: "images",
		webpQuality: 82,
	},
};

export async function uploadLessonFile(formData) {
	const session = await auth();
	if (!session || session.user.role !== "ADMIN") {
		return { error: "Non autorisé" };
	}

	const file = formData.get("file");
	const lessonType = formData.get("type"); // "PDF" | "AUDIO" | "VIDEO"

	if (!file || typeof file === "string") {
		return { error: "Aucun fichier reçu" };
	}

	const config = FILE_CONFIGS[lessonType];
	if (!config) {
		return { error: `Type de fichier non supporté : ${lessonType}` };
	}

	if (!config.allowedMimes.includes(file.type)) {
		return {
			error: `Format invalide pour ${lessonType}. Reçu : ${file.type}`,
		};
	}

	if (file.size > config.maxSize) {
		const maxMb = Math.round(config.maxSize / 1024 / 1024);
		return { error: `Fichier trop volumineux (${maxMb} MB max)` };
	}

	const uploadDir = path.join(process.cwd(), "public", "uploads", "lessons", config.subdir);
	if (!existsSync(uploadDir)) {
		await mkdir(uploadDir, { recursive: true });
	}

	const ext = lessonType === "IMAGE" ? ".webp" : path.extname(file.name) || "";
	const filename = `${randomUUID()}${ext}`;
	const filepath = path.join(uploadDir, filename);

	let outputBuffer;
	if (lessonType === "IMAGE") {
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
		url: `/uploads/lessons/${config.subdir}/${filename}`,
		filename: file.name,
		size: outputBuffer.length,
	};
}
