import Image from "next/image";
import Link from "next/link";
import About from "@/features/marketing/components/home/about";

import { dict } from "@/lib/i18n";

export const metadata = {
	title: "A propos | ÆRIA Voyages Academy",
};

export default function AboutPage({ locale = "fr" }) {
	const t = dict[locale]?.about ?? dict.fr?.about;

	if (!t) return null;

	return (
		<div className="bg-neutral-50 text-neutral-900">
			<section className="relative w-full bg-neutral-50 text-neutral-900 overflow-hidden lg:min-h-[600px] flex lg:items-center">
				{/* Ce conteneur gère l'alignement du texte sur max-w-7xl */}
				<div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-2">
					{/* Colonne de gauche : Le texte */}
					<div className="space-y-6 px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:py-24 z-10">
						<p className="eyebrow">{t.heroEyebrow}</p>
						<h1 className="font-display text-4xl font-medium leading-tight sm:text-5xl lg:text-6xl">
							{t.heroHeadline} <span className="text-primary">{t.heroHeadlineEm}</span>
						</h1>
						<p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{t.heroSub}</p>
						<div className="flex flex-wrap items-center gap-3">
							<Link
								href="/courses"
								className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
							>
								{t.heroCta}
							</Link>
						</div>
					</div>

					<div className="relative hidden md:block overflow-hidden bg-white w-full h-full min-h-[400px] lg:absolute lg:right-0 lg:top-0 lg:w-1/2 lg:h-full">
						<Image
							src="/images/about-why.webp"
							alt={t.whyTitle}
							width={1200}
							height={900}
							className="h-full w-full object-cover"
							priority // Optionnel : recommandé pour l'image principale au-dessus du pli (LCP)
						/>
						<div className="absolute left-0 top-0 bottom-0 bg-linear-to-r from-white  to-transparent w-[20%]" />
					</div>
				</div>
			</section>

			<section
				id="story"
				className="relative bg-[#111828] text-white"
			>
				<div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 bg-[#111828] text-white">
					<p className="eyebrow mb-2">{t.whyLabel}</p>
					<h2 className="font-display text-3xl font-medium sm:text-4xl">
						{t.whyTitle} <span className="text-primary">{t.whyTitleEm}</span>
					</h2>
					<div className="mt-6 grid gap-6 md:grid-cols-2">
						<p className="text-muted-foreground leading-relaxed">{t.whyP1}</p>
						<p className="text-muted-foreground leading-relaxed">{t.whyP2}</p>
					</div>
				</div>
				<span className="absolute left-0 right-0 -top-2 h-[2px] w-full bg-[#111828]/50" />
				<span className="absolute left-0 right-0 -bottom-2 h-[2px] w-full bg-[#111828]/50" />
			</section>

			<section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
				<p className="eyebrow mb-2">{t.pillarsLabel}</p>
				<h2 className="font-display text-3xl font-medium sm:text-4xl">{t.pillarsTitle}</h2>
				<div className="mt-8 grid gap-6 md:grid-cols-3">
					{t.pillars.map((pillar) => (
						<article
							key={pillar.title}
							className="rounded-2xl border bg-white p-6 shadow-sm"
						>
							<Image
								src={pillar.icon}
								alt={pillar.title}
								width={44}
								height={44}
								className="mb-4"
							/>
							<h3 className="font-display text-xl font-medium">{pillar.title}</h3>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pillar.desc}</p>
						</article>
					))}
				</div>
			</section>

			<section className="relative bg-[#111828] text-white">
				<div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 bg-[#111828] text-white">
					<p className="eyebrow mb-2">{t.diffLabel}</p>
					<h2 className="font-display text-3xl font-medium sm:text-4xl">{t.diffTitle}</h2>
					<div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
						{t.differentiators.map((item) => (
							<article
								key={item.title}
								className="overflow-hidden rounded-2xl bg-white/5"
							>
								<Image
									src={item.src}
									alt={item.alt}
									width={640}
									height={420}
									className="h-40 w-full object-cover"
								/>
								<div className="space-y-2 p-4">
									<h3 className="font-display text-lg font-medium">{item.title}</h3>
									<p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
								</div>
							</article>
						))}
					</div>
				</div>
				<span className="absolute left-0 right-0 -top-2 h-[2px] w-full bg-[#111828]/50" />
				<span className="absolute left-0 right-0 -bottom-2 h-[2px] w-full bg-[#111828]/50" />
			</section>

			<section className="bg-white/80 py-16">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<p className="eyebrow mb-2">{t.formatsLabel}</p>
					<h2 className="font-display text-3xl font-medium sm:text-4xl">
						{t.formatsTitle} <br className="hidden sm:block" /> {t.formatsTitleLine2}
					</h2>
					<p className="mt-4 max-w-4xl leading-relaxed text-muted-foreground">{t.formatsDescription}</p>
					<div className="mt-8 grid gap-4 sm:grid-cols-3">
						{t.formats.map(({ icon: Icon, label }) => (
							<div
								key={label}
								className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3"
							>
								<Icon className="h-5 w-5 text-primary" />
								<span className="text-sm font-medium">{label}</span>
							</div>
						))}
					</div>
				</div>
			</section>

			<div className="relative bg-[#111828] text-white">
				<About />
				<span className="absolute left-0 right-0 -top-2 h-[2px] w-full bg-[#111828]/50" />
				<span className="absolute left-0 right-0 -bottom-2 h-[2px] w-full bg-[#111828]/50" />
			</div>

			<section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
				<div className="relative overflow-hidden rounded-2xl border bg-[#0A1428] px-6 py-14 text-center text-white sm:px-10">
					<Image
						src="/images/about-cta.webp"
						alt="About CTA"
						fill
						className="object-cover opacity-25"
					/>
					<div className="relative z-10 mx-auto max-w-3xl space-y-5">
						<p className="text-sm uppercase tracking-[0.2em] text-primary-foreground/80">{t.finalCtaLine}</p>
						<h2 className="font-display text-3xl font-medium sm:text-4xl">{t.finalCta}</h2>
						<Link
							href="/pricing"
							className="inline-flex items-center rounded-md bg-white px-6 py-3 text-sm font-medium text-[#0A1428] transition hover:bg-white/90"
						>
							{t.heroCta}
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}
