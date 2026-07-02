import ContactForm from "@/features/marketing/components/contact/contact-form";
import { dict } from "@/lib/i18n";

import { submitContactForm } from "./actions";

export const metadata = {
	title: "Contact | ÆRIA Voyages Academy",
};

export default function ContactPage({ locale = "fr" }) {
	const isFrench = locale === "fr";
	const nav = dict[locale]?.nav ?? dict.fr?.nav;

	return (
		<div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
			<div className="mb-10 max-w-3xl space-y-4">
				<p className="eyebrow">{nav?.contact ?? (isFrench ? "Contact" : "Contact")}</p>
				<h1 className="font-display text-4xl font-medium sm:text-5xl">{isFrench ? "Parlons de votre projet" : "Let's discuss your project"}</h1>
				<p className="text-muted-foreground">
					{isFrench
						? "Une question sur les abonnements, les cours ou un partenariat? Envoyez-nous un message et notre equipe vous repondra rapidement."
						: "Have a question about plans, courses, or partnerships? Send us a message and our team will get back to you quickly."}
				</p>
			</div>

			<div className="grid gap-8 lg:grid-cols-[1.15fr,0.85fr]">
				<section className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
					<ContactForm
						action={submitContactForm}
						locale={locale}
					/>
				</section>

				<aside className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
					<h2 className="font-display text-2xl font-medium">{isFrench ? "Informations" : "Information"}</h2>
					<div className="space-y-3 text-sm text-muted-foreground">
						<p>
							<strong className="text-foreground">Email:</strong> support@aeriavoyages.com
						</p>
						<p>
							<strong className="text-foreground">{isFrench ? "Delai" : "Response time"}:</strong>{" "}
							{isFrench ? "24 a 48 heures ouvrables" : "24 to 48 business hours"}
						</p>
						<p>
							<strong className="text-foreground">{isFrench ? "Sujet" : "Topics"}:</strong>{" "}
							{isFrench ? "Abonnements, contenu, partenariats" : "Plans, content, partnerships"}
						</p>
					</div>
				</aside>
			</div>
		</div>
	);
}
