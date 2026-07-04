import { existsSync } from "fs";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { convertImageFileToWebpBuffer, isImageMimeType } from "@/lib/server/image-conversion";

const COMMUNITY_MESSAGE_ATTACHMENT_CONFIG = {
	// Centralized policy for file acceptance and size limits.
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

function parseSerializedAttachmentField(value) {
	if (!value || typeof value !== "string") return [];
	const trimmed = value.trim();
	if (!trimmed) return [];
	if (!trimmed.startsWith("[")) return [trimmed];

	try {
		const parsed = JSON.parse(trimmed);
		return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && item.trim().length > 0) : [];
	} catch {
		return [trimmed];
	}
}

export async function deleteCommunityMessageAttachmentFiles(attachmentUrlField) {
	// Accept both serialized arrays and legacy single-string URLs.
	const urls = parseSerializedAttachmentField(attachmentUrlField);
	if (urls.length === 0) return;

	const uploadDir = path.join(process.cwd(), "public", "uploads", "community", "messages");
	const allowedPrefix = "/uploads/community/messages/";

	await Promise.allSettled(
		urls.map(async (url) => {
			// Never delete outside the community/messages upload directory.
			if (typeof url !== "string") return;
			const cleanUrl = url.split("?")[0] || "";
			if (!cleanUrl.startsWith(allowedPrefix)) return;

			const filename = path.basename(cleanUrl);
			if (!filename) return;

			const filePath = path.join(uploadDir, filename);
			if (!existsSync(filePath)) return;
			await unlink(filePath);
		}),
	);
}

export async function uploadCommunityMessageAttachment({ file, sessionUserId }) {
	// Validate file against explicit allow-list before any disk write.
	if (!COMMUNITY_MESSAGE_ATTACHMENT_CONFIG.allowedMimes.includes(file.type)) {
		return { error: `Type de fichier non autorise: ${file.type}` };
	}

	if (file.size > COMMUNITY_MESSAGE_ATTACHMENT_CONFIG.maxSize) {
		return { error: "Fichier trop volumineux (15 MB max)" };
	}

	const isImage = isImageMimeType(file.type);
	const ext = isImage ? ".webp" : getSafeAttachmentExtension(file);
	const uploadDir = path.join(process.cwd(), "public", "uploads", "community", "messages");
	if (!existsSync(uploadDir)) {
		await mkdir(uploadDir, { recursive: true });
	}

	const filename = `${sessionUserId}-${randomUUID()}${ext}`;
	const filePath = path.join(uploadDir, filename);

	let outputBuffer;
	if (isImage) {
		try {
			outputBuffer = await convertImageFileToWebpBuffer({ file });
		} catch {
			return { error: "Impossible de convertir l'image en WebP" };
		}
	} else {
		const bytes = await file.arrayBuffer();
		outputBuffer = Buffer.from(bytes);
	}

	await writeFile(filePath, outputBuffer);

	return {
		url: `/uploads/community/messages/${filename}`,
		name: (file.name || "fichier").slice(0, 180),
		mimeType: isImage ? "image/webp" : file.type,
		size: outputBuffer.length,
	};
}
