"use client";

import { useCurrentUser } from "@/hooks/use-current-user";
import { dict } from "@/lib/i18n";
import { localizedHref } from "@/lib/links";
import Image from "next/image";
import Link from "next/link";

export default function Hero({ locale }) {
	// Pull auth state once so the component can decide what to show.
	const { isLoaded, isSignedIn, isMember, user } = useCurrentUser();

	// Fall back to the French copy if a locale is missing, which keeps the page resilient.
	const heroContent = dict[locale]?.hero ?? dict.fr?.hero;

	// Build a locale-aware URL without repeating the same logic in multiple places.
	const href = (path) => localizedHref(locale, path);

	// Derive a friendly user name for a personalized greeting.
	const firstName = user?.fullName?.split(" ")[0] ?? "";

	// Use the greeting when available, otherwise fall back to the standard headline.
	const headline = isSignedIn && firstName && heroContent?.greeting ? heroContent.greeting.replace("{name}", firstName) : (heroContent?.headline ?? "");

	// Show a different CTA depending on the user's access state.
	const cta = isMember
		? null
		: isSignedIn
			? { label: heroContent?.ctaUpgrade ?? "Upgrade", href: href("/pricing") }
			: { label: heroContent?.cta ?? "Rejoindre l'académie", href: href("/register") };

	if (!heroContent) return null;

	return (
		<section className="relative flex min-h-screen items-center overflow-hidden">
			{/* Decorative background layer; kept empty on purpose so the video can fill the area. */}
			<div className="absolute inset-0 bg-cover bg-center" />

			{/* Background video with a poster fallback for slower connections. */}
			<video
				autoPlay
				muted
				loop
				playsInline
				preload="metadata"
				className="absolute inset-0 h-full w-full object-cover"
				poster="/videos/hero-fallback.webp"
			>
				<source
					src="/videos/hero-bg.webm"
					type="video/webm"
				/>
			</video>

			{/* Dark overlay keeps the text readable against the video. */}
			<div className="absolute inset-0 bg-linear-to-r from-black/70 via-black/45 to-black/20" />

			{/* Main content wrapper. */}
			<div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-20 pt-24 sm:px-6 sm:pb-24 sm:pt-36 lg:px-8">
				{/* Decorative filigree logo placed behind the text for visual depth. */}
				<Image
					src="/images/windrose-filigran.svg"
					alt=""
					aria-hidden="true"
					width={600}
					height={600}
					priority
					sizes="(max-width: 768px) 45vw, 35vw"
					className="absolute left-0 top-1/2 aspect-square -z-10 -translate-y-1/2 opacity-[0.08]"
				/>

				{/* Hero copy and call-to-action. */}
				<div className="mx-auto flex max-w-4xl flex-col items-center justify-center text-center">
					<p className="eyebrow mb-4 text-yellow-600">{heroContent.eyebrow}</p>
					<h1 className="mb-6 max-w-4xl font-display text-4xl font-normal leading-tight text-white text-shadow sm:text-5xl md:text-6xl lg:text-7xl">
						{headline}
					</h1>
					<p className="mb-10 max-w-2xl text-sm font-light leading-relaxed tracking-wider text-white text-shadow sm:text-base md:text-lg">{heroContent.sub}</p>

					{/* Reserve vertical space until auth state is known to prevent layout shift. */}
					{!isLoaded ? (
						<div
							className="h-12"
							aria-hidden="true"
						/>
					) : cta ? (
						<Link
							href={cta.href}
							className="w-full rounded bg-yellow-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-yellow-700 sm:w-auto"
						>
							{cta.label}
						</Link>
					) : null}
				</div>
			</div>
		</section>
	);
}
