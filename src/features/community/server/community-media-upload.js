import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const COMMUNITY_IMAGE_CONFIG = {
	allowedMimes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
	maxSize: 5 * 1024 * 1024,
};

const COMMUNITY_STORY_IMAGE_CONFIG = {
	allowedMimes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
	maxSize: 8 * 1024 * 1024,
};

export async function uploadCommunityPostImageFile({ file, sessionUserId }) {
	if (!COMMUNITY_IMAGE_CONFIG.allowedMimes.includes(file.type)) {
		return { error: `Format invalide. Recu : ${file.type}` };
	}

	if (file.size > COMMUNITY_IMAGE_CONFIG.maxSize) {
		return { error: "Image trop volumineuse (5 MB max)" };
	}

	const ext = (path.extname(file.name) || "").toLowerCase();
	const uploadDir = path.join(process.cwd(), "public", "uploads", "community", "posts");
	if (!existsSync(uploadDir)) {
		await mkdir(uploadDir, { recursive: true });
	}

	const filename = `${sessionUserId}-${randomUUID()}${ext}`;
	const filePath = path.join(uploadDir, filename);

	const bytes = await file.arrayBuffer();
	await writeFile(filePath, Buffer.from(bytes));

	return {
		url: `/uploads/community/posts/${filename}`,
	};
}

export async function uploadCommunityStoryImageFile({ file, sessionUserId }) {
	if (!COMMUNITY_STORY_IMAGE_CONFIG.allowedMimes.includes(file.type)) {
		return { error: `Format invalide. Recu : ${file.type}` };
	}

	if (file.size > COMMUNITY_STORY_IMAGE_CONFIG.maxSize) {
		return { error: "Image trop volumineuse (8 MB max)" };
	}

	const ext = (path.extname(file.name) || "").toLowerCase();
	const uploadDir = path.join(process.cwd(), "public", "uploads", "community", "stories");
	if (!existsSync(uploadDir)) {
		await mkdir(uploadDir, { recursive: true });
	}

	const filename = `${sessionUserId}-${randomUUID()}${ext}`;
	const filePath = path.join(uploadDir, filename);

	const bytes = await file.arrayBuffer();
	await writeFile(filePath, Buffer.from(bytes));

	return {
		url: `/uploads/community/stories/${filename}`,
	};
}
