import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const COMMUNITY_MESSAGE_ATTACHMENT_CONFIG = {
	maxSize: 15 * 1024 * 1024,
	allowedMimes: [
		"image/jpeg",
		"image/png",
		"image/webp",
		"image/avif",
		"image/gif",
		"application/pdf",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"application/vnd.ms-excel",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"application/vnd.ms-powerpoint",
		"application/vnd.openxmlformats-officedocument.presentationml.presentation",
		"text/plain",
	],
};

function getSafeAttachmentExtension(file) {
	const fromName = (path.extname(file.name || "") || "").toLowerCase();
	if (fromName) return fromName;

	const mimeMap = {
		"image/jpeg": ".jpg",
		"image/png": ".png",
		"image/webp": ".webp",
		"image/avif": ".avif",
		"image/gif": ".gif",
		"application/pdf": ".pdf",
		"application/msword": ".doc",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
		"application/vnd.ms-excel": ".xls",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
		"application/vnd.ms-powerpoint": ".ppt",
		"application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
		"text/plain": ".txt",
	};

	return mimeMap[file.type] || "";
}

export async function uploadCommunityMessageAttachment({ file, sessionUserId }) {
	if (!COMMUNITY_MESSAGE_ATTACHMENT_CONFIG.allowedMimes.includes(file.type)) {
		return { error: `Type de fichier non autorise: ${file.type}` };
	}

	if (file.size > COMMUNITY_MESSAGE_ATTACHMENT_CONFIG.maxSize) {
		return { error: "Fichier trop volumineux (15 MB max)" };
	}

	const ext = getSafeAttachmentExtension(file);
	const uploadDir = path.join(process.cwd(), "public", "uploads", "community", "messages");
	if (!existsSync(uploadDir)) {
		await mkdir(uploadDir, { recursive: true });
	}

	const filename = `${sessionUserId}-${randomUUID()}${ext}`;
	const filePath = path.join(uploadDir, filename);
	const bytes = await file.arrayBuffer();
	await writeFile(filePath, Buffer.from(bytes));

	return {
		url: `/uploads/community/messages/${filename}`,
		name: (file.name || "fichier").slice(0, 180),
		mimeType: file.type,
		size: file.size,
	};
}
