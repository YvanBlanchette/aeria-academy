import { getResendClient } from "@/lib/server/resend";

function escapeHtml(value) {
	return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export async function sendLearningAchievementEmail({ to, firstName, badgeTitle, badgeDescription, actionUrl }) {
	const from = process.env.RESEND_FROM_EMAIL;
	if (!from) {
		throw new Error("RESEND_FROM_EMAIL is missing");
	}

	const resend = getResendClient();
	const safeName = escapeHtml(firstName || "");
	const safeBadgeTitle = escapeHtml(badgeTitle || "Nouveau badge");
	const safeBadgeDescription = escapeHtml(badgeDescription || "");
	const safeActionUrl = escapeHtml(actionUrl || `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/profile`);

	const text = [
		"Felicitation pour ton nouveau badge!",
		"",
		safeName ? `Bravo ${safeName},` : "Bravo,",
		`Tu as obtenu le badge: ${badgeTitle}.`,
		badgeDescription ? `Detail: ${badgeDescription}` : "",
		"",
		`Voir tes badges: ${actionUrl}`,
	]
		.filter(Boolean)
		.join("\n");

	const html = `
		<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
			<h2 style="margin-bottom: 12px;">Nouveau badge debloque</h2>
			<p>${safeName ? `Bravo <strong>${safeName}</strong>, ` : ""}tu viens de debloquer un nouveau badge.</p>
			<p style="font-size: 18px; margin: 12px 0;"><strong>${safeBadgeTitle}</strong></p>
			${safeBadgeDescription ? `<p>${safeBadgeDescription}</p>` : ""}
			<p style="margin: 20px 0;">
				<a href="${safeActionUrl}" style="background: #111827; color: #ffffff; padding: 10px 16px; text-decoration: none; border-radius: 8px; display: inline-block;">
					Voir mes badges
				</a>
			</p>
		</div>
	`;

	await resend.emails.send({
		from,
		to,
		subject: "Bravo! Nouveau badge debloque",
		html,
		text,
	});
}
