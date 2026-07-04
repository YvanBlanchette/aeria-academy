import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

const DEFAULT_SEAL_PATHS = ["private-assets/certificates/ava-seal-FR.png", "public/images/ava-seal-FR.png"];

function drawCenteredText({ page, text, font, size, y, color, maxWidth }) {
	let targetSize = size;
	let textWidth = font.widthOfTextAtSize(text, targetSize);

	if (maxWidth && textWidth > maxWidth) {
		targetSize = Math.max(12, Math.floor((targetSize * maxWidth) / textWidth));
		textWidth = font.widthOfTextAtSize(text, targetSize);
	}

	const x = (page.getWidth() - textWidth) / 2;
	page.drawText(text, { x, y, size: targetSize, font, color });
}

async function embedSealImage(pdf) {
	const configuredPath = process.env.CERTIFICATE_SEAL_PATH?.trim();
	const candidatePaths = configuredPath ? [configuredPath, ...DEFAULT_SEAL_PATHS] : DEFAULT_SEAL_PATHS;

	for (const candidatePath of candidatePaths) {
		const resolvedPath = path.isAbsolute(candidatePath) ? candidatePath : path.join(/* turbopackIgnore: true */ process.cwd(), candidatePath);

		try {
			const sealPng = await readFile(resolvedPath);
			return await pdf.embedPng(sealPng);
		} catch {
			continue;
		}
	}

	return null;
}

async function embedSignatureImage(pdf) {
	const signaturePathRaw = process.env.CERTIFICATE_SIGNATURE_PATH?.trim();
	if (!signaturePathRaw) return null;

	const signaturePath = path.isAbsolute(signaturePathRaw) ? signaturePathRaw : path.join(/* turbopackIgnore: true */ process.cwd(), signaturePathRaw);

	try {
		const bytes = await readFile(signaturePath);
		const lower = signaturePath.toLowerCase();

		if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
			return await pdf.embedJpg(bytes);
		}

		if (lower.endsWith(".png")) {
			return await pdf.embedPng(bytes);
		}

		try {
			return await pdf.embedPng(bytes);
		} catch {
			return await pdf.embedJpg(bytes);
		}
	} catch {
		return null;
	}
}

export async function GET(_request, { params }) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
	}

	const { certificateId } = await params;
	if (!certificateId) {
		return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });
	}

	const certificate = await prisma.certificate.findUnique({
		where: { id: certificateId },
		include: {
			user: {
				select: {
					name: true,
					email: true,
				},
			},
			course: {
				select: {
					title: true,
				},
			},
		},
	});

	if (!certificate) {
		return NextResponse.json({ error: "Certificat introuvable" }, { status: 404 });
	}

	const isOwner = certificate.userId === session.user.id;
	const isAdmin = session.user.role === "ADMIN";
	if (!isOwner && !isAdmin) {
		return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
	}

	const learnerName = certificate.user.name || certificate.user.email || "Membre";
	const courseTitle = certificate.course.title;
	const issueDate = new Date(certificate.issuedAt).toLocaleDateString("fr-CA", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	const pdf = await PDFDocument.create();
	const page = pdf.addPage([1123, 794]);
	const width = page.getWidth();
	const height = page.getHeight();
	const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
	const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
	const signatureFallbackFont = await pdf.embedFont(StandardFonts.HelveticaOblique);

	const [sealImage, signatureImage] = await Promise.all([embedSealImage(pdf), embedSignatureImage(pdf)]);

	const accentColor = rgb(0.67, 0.45, 0.12);
	const deepColor = rgb(0.1, 0.14, 0.2);
	const softColor = rgb(0.94, 0.91, 0.85);

	page.drawRectangle({
		x: 0,
		y: 0,
		width,
		height,
		color: rgb(0.99, 0.99, 0.98),
	});

	page.drawRectangle({
		x: 0,
		y: height - 110,
		width,
		height: 110,
		color: deepColor,
	});

	page.drawRectangle({
		x: 0,
		y: 0,
		width,
		height: 70,
		color: deepColor,
	});

	page.drawRectangle({
		x: 36,
		y: 36,
		width: width - 72,
		height: height - 72,
		borderColor: accentColor,
		borderWidth: 2,
	});

	page.drawRectangle({
		x: 56,
		y: 56,
		width: width - 112,
		height: height - 112,
		borderColor: rgb(0.8, 0.72, 0.55),
		borderWidth: 1,
	});

	drawCenteredText({
		page,
		text: "ÆRIA VOYAGES ACADEMY",
		font: titleFont,
		size: 28,
		y: height - 80,
		color: rgb(0.99, 0.98, 0.95),
	});

	drawCenteredText({
		page,
		text: "CERTIFICAT D'EXCELLENCE",
		font: titleFont,
		size: 48,
		y: height - 220,
		color: deepColor,
	});

	drawCenteredText({
		page,
		text: "Ce document atteste officiellement que",
		font: bodyFont,
		size: 18,
		y: height - 275,
		color: rgb(0.33, 0.37, 0.43),
	});

	page.drawRectangle({
		x: 170,
		y: height - 382,
		width: width - 340,
		height: 72,
		color: softColor,
		borderColor: rgb(0.85, 0.79, 0.67),
		borderWidth: 1,
	});

	drawCenteredText({
		page,
		text: learnerName,
		font: titleFont,
		size: 48,
		y: height - 360,
		color: rgb(0.12, 0.14, 0.18),
		maxWidth: width - 380,
	});

	drawCenteredText({
		page,
		text: "a complété avec succès le programme suivant",
		font: bodyFont,
		size: 18,
		y: height - 430,
		color: rgb(0.33, 0.37, 0.43),
	});

	drawCenteredText({
		page,
		text: courseTitle,
		font: titleFont,
		size: 36,
		y: height - 495,
		color: rgb(0.11, 0.2, 0.37),
		maxWidth: width - 240,
	});

	if (sealImage) {
		const sealWidth = 132;
		const sealScale = sealWidth / sealImage.width;
		const sealHeight = sealImage.height * sealScale;
		page.drawImage(sealImage, {
			x: (width - sealWidth) / 2,
			y: 124,
			width: sealWidth,
			height: sealHeight,
			opacity: 0.92,
		});
	} else {
		page.drawCircle({
			x: width / 2,
			y: 188,
			size: 58,
			borderColor: accentColor,
			borderWidth: 2,
			color: rgb(0.98, 0.96, 0.9),
		});
		page.drawCircle({
			x: width / 2,
			y: 188,
			size: 46,
			borderColor: rgb(0.82, 0.66, 0.22),
			borderWidth: 1,
		});
		drawCenteredText({
			page,
			text: "CERTIFIÉ",
			font: titleFont,
			size: 14,
			y: 184,
			color: deepColor,
		});
	}

	page.drawLine({
		start: { x: 130, y: 138 },
		end: { x: 390, y: 138 },
		thickness: 1,
		color: rgb(0.25, 0.3, 0.36),
	});
	page.drawText("Date de délivrance", {
		x: 130,
		y: 120,
		size: 11,
		font: bodyFont,
		color: rgb(0.33, 0.37, 0.43),
	});
	page.drawText(issueDate, {
		x: 130,
		y: 102,
		size: 14,
		font: bodyFont,
		color: rgb(0.12, 0.14, 0.18),
	});

	page.drawLine({
		start: { x: width - 390, y: 138 },
		end: { x: width - 130, y: 138 },
		thickness: 1,
		color: rgb(0.25, 0.3, 0.36),
	});
	page.drawText("Direction pédagogique", {
		x: width - 390,
		y: 120,
		size: 11,
		font: bodyFont,
		color: rgb(0.33, 0.37, 0.43),
	});

	if (signatureImage) {
		const targetWidth = 240;
		const scale = targetWidth / signatureImage.width;
		const targetHeight = signatureImage.height * scale;
		page.drawImage(signatureImage, {
			x: width - 390,
			y: 140,
			width: targetWidth,
			height: targetHeight,
			opacity: 1,
		});
	} else {
		page.drawText("Yvan Blanchette", {
			x: width - 390,
			y: 144,
			size: 29,
			font: signatureFallbackFont,
			color: rgb(0.75, 0.55, 0.2),
		});
	}

	page.drawText("ÆRIA Voyages Academy", {
		x: width - 390,
		y: 90,
		size: 14,
		font: bodyFont,
		color: rgb(0.12, 0.14, 0.18),
	});

	page.drawText(`Certificat #${certificate.id.slice(0, 12).toUpperCase()}`, {
		x: 80,
		y: 24,
		size: 10,
		font: bodyFont,
		color: rgb(0.92, 0.92, 0.92),
	});

	const pdfBytes = await pdf.save();
	const fileTitle = slugify(courseTitle || "certificat");
	const learnerSlug = slugify(learnerName || "membre");
	const disposition = `attachment; filename="certificat-${learnerSlug}-${fileTitle}.pdf"`;

	return new NextResponse(Buffer.from(pdfBytes), {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": disposition,
			"Cache-Control": "private, no-store",
		},
	});
}
