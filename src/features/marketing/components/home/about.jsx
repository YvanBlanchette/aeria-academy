import Image from "next/image";
import Link from "next/link";
import { AiFillInstagram } from "react-icons/ai";
import { FaFacebookF, FaGoogle, FaLinkedinIn, FaYoutube } from "react-icons/fa";

import { dict } from "@/lib/i18n";

const socialLinks = [
	{ href: "https://www.facebook.com/yvanblanchettecvc", icon: FaFacebookF, label: "Facebook" },
	{ href: "https://www.linkedin.com/in/aeriavoyages/", icon: FaLinkedinIn, label: "LinkedIn" },
	{ href: "https://www.instagram.com/yvanblanchetteconseiller/", icon: AiFillInstagram, label: "Instagram" },
	{ href: "https://www.youtube.com/@yvanblanchettecvc", icon: FaYoutube, label: "YouTube" },
	{ href: "https://share.google/cdloB9ynunUhlfuAD", icon: FaGoogle, label: "Google" },
];

export default function About({ locale }) {
	// Read the translated copy once so the markup stays readable.
	const t = dict[locale]?.about ?? dict.fr?.about;

	if (!t) return null;

	return (
		<section className="relative bg-[#0A1428] py-16 sm:py-24 lg:py-28">
			<span className="absolute left-0 right-0 -top-2 h-[2px] w-full bg-[#111828]/50" />
			<span className="absolute left-0 right-0 -bottom-2 h-[2px] w-full bg-[#111828]/50" />
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<p className="eyebrow mb-3 text-yellow-600">{t.bioLabel}</p>
				<h2 className="mb-10 font-display text-4xl font-normal text-white sm:text-5xl">{t.bioTitle}</h2>

				{/* Main bio card with a stacked layout on mobile and a side-by-side layout on larger screens. */}
				<div className="flex flex-col items-center gap-8 rounded-2xl bg-white/5 p-6 text-center sm:p-8 md:flex-row md:items-start md:text-left">
					<Image
						src="/images/about-bio.webp"
						alt={t.bioName}
						width={120}
						height={120}
						className="h-28 w-28 shrink-0 rounded-full object-cover sm:h-36 sm:w-36"
					/>

					<div className="w-full">
						<p className="mb-1 font-display text-xl font-normal text-white">{t.bioName}</p>
						<p className="mb-3 text-xs uppercase tracking-[0.25em] text-yellow-600">{t.bioRole}</p>
						<p className="mb-3 max-w-2xl text-base font-light leading-relaxed text-white/65">{t.bioText}</p>

						{/* Social links are grouped in one place so the section stays easy to update. */}
						<div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
							{socialLinks.map(({ href, icon: Icon, label }) => (
								<Link
									key={label}
									target="_blank"
									rel="noreferrer"
									href={href}
									aria-label={label}
								>
									<Icon className="h-6 w-6 text-yellow-600 transition-colors duration-200 hover:text-yellow-400" />
								</Link>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
