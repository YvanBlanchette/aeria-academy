import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { convertImageFileToWebpBuffer } from "@/lib/server/image-conversion";

const COMMUNITY_IMAGE_CONFIG = {
	allowedMimes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
	maxSourceSize: 20 * 1024 * 1024,
	webpQuality: 82,
};

const COMMUNITY_STORY_IMAGE_CONFIG = {
	allowedMimes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
	maxSourceSize: 20 * 1024 * 1024,
	webpQuality: 82,
};

export async function uploadCommunityPostImageFile({ file, sessionUserId }) {
	if (!COMMUNITY_IMAGE_CONFIG.allowedMimes.includes(file.type)) {
		return { error: `Format invalide. Recu : ${file.type}` };
	}

	if (file.size > COMMUNITY_IMAGE_CONFIG.maxSourceSize) {
		return { error: "Image trop volumineuse (20 MB max avant conversion)" };
	}

	const uploadDir = path.join(process.cwd(), "public", "uploads", "community", "posts");
	if (!existsSync(uploadDir)) {
		await mkdir(uploadDir, { recursive: true });
	}

	const filename = `${sessionUserId}-${randomUUID()}.webp`;
	const filePath = path.join(uploadDir, filename);

	let webpBuffer;
	try {
		webpBuffer = await convertImageFileToWebpBuffer({
			file,
			quality: COMMUNITY_IMAGE_CONFIG.webpQuality,
		});
	} catch {
		return { error: "Impossible de convertir l'image en WebP" };
	}

	await writeFile(filePath, webpBuffer);

	return {
		url: `/uploads/community/posts/${filename}`,
	};
}

export async function uploadCommunityStoryImageFile({ file, sessionUserId }) {
	if (!COMMUNITY_STORY_IMAGE_CONFIG.allowedMimes.includes(file.type)) {
		return { error: `Format invalide. Recu : ${file.type}` };
	}

	if (file.size > COMMUNITY_STORY_IMAGE_CONFIG.maxSourceSize) {
		return { error: "Image trop volumineuse (20 MB max avant conversion)" };
	}

	const uploadDir = path.join(process.cwd(), "public", "uploads", "community", "stories");
	if (!existsSync(uploadDir)) {
		await mkdir(uploadDir, { recursive: true });
	}

	const filename = `${sessionUserId}-${randomUUID()}.webp`;
	const filePath = path.join(uploadDir, filename);

	let webpBuffer;
	try {
		webpBuffer = await convertImageFileToWebpBuffer({
			file,
			quality: COMMUNITY_STORY_IMAGE_CONFIG.webpQuality,
		});
	} catch {
		return { error: "Impossible de convertir l'image en WebP" };
	}

	await writeFile(filePath, webpBuffer);

	return {
		url: `/uploads/community/stories/${filename}`,
	};
}
