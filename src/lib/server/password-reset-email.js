import { getResendClient } from "@/lib/server/resend";

function escapeHtml(value) {
	return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export async function sendPasswordResetEmail({ to, resetLink }) {
	const from = process.env.RESEND_FROM_EMAIL;
	if (!from) {
		throw new Error("RESEND_FROM_EMAIL is missing");
	}

	const resend = getResendClient();
	const safeResetLink = escapeHtml(resetLink);

	const text = [
		"Reinitialisation de votre mot de passe",
		"",
		"Nous avons recu une demande de reinitialisation de mot de passe.",
		"Si c'etait bien vous, utilisez le lien suivant (valide 60 minutes) :",
		resetLink,
		"",
		"Si vous n'etes pas a l'origine de cette demande, ignorez cet email.",
	].join("\n");

	const html = `
		<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
			<h2 style="margin-bottom: 12px;">Reinitialisation de votre mot de passe</h2>
			<p>Nous avons recu une demande de reinitialisation de mot de passe.</p>
			<p>Ce lien est valide pendant <strong>60 minutes</strong>.</p>
			<p style="margin: 20px 0;">
				<a href="${safeResetLink}" style="background: #111827; color: #ffffff; padding: 10px 16px; text-decoration: none; border-radius: 8px; display: inline-block;">
					Reinitialiser mon mot de passe
				</a>
			</p>
			<p style="font-size: 12px; color: #6b7280;">Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>
		</div>
	`;

	await resend.emails.send({
		from,
		to,
		subject: "Reinitialisation de votre mot de passe",
		html,
		text,
	});
}
