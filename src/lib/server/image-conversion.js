import sharp from "sharp";

const DEFAULT_WEBP_QUALITY = 82;
const DEFAULT_WEBP_EFFORT = 4;

export async function convertImageFileToWebpBuffer({ file, quality = DEFAULT_WEBP_QUALITY, effort = DEFAULT_WEBP_EFFORT }) {
	const bytes = await file.arrayBuffer();
	const sourceBuffer = Buffer.from(bytes);

	return sharp(sourceBuffer, { animated: file.type === "image/gif" })
		.rotate()
		.webp({ quality, effort })
		.toBuffer();
}

export function isImageMimeType(mimeType) {
	return typeof mimeType === "string" && mimeType.startsWith("image/");
}
