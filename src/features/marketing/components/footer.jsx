import { dict } from "@/lib/i18n";
import { FaInstagram, FaYoutube, FaLinkedin, FaEnvelope } from "react-icons/fa";
import Logo from "@/components/logo";

export default function Footer({ locale = "fr" }) {
	const t = dict[locale]?.footer ?? dict.fr?.footer ?? dict.en?.footer;

	return (
		<footer className="relative bg-[#0A1428] pb-10 pt-16 text-white sm:pt-20">
			<span className="absolute left-0 right-0 -top-2 h-[2px] w-full bg-[#111828]/50" />
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="mb-16 flex flex-col gap-10 md:flex-row md:justify-between md:gap-12">
					<div className="md:col-span-4 mx-auto md:mx-0">
						{/* Logo */}
						<Logo
							scrolled={false}
							locale={locale}
						/>
						<p className="text-gray-400 text-sm leading-relaxed mb-6 whitespace-pre-line text-center md:text-left">{t.tagline}</p>
						<div className="flex items-center justify-center md:justify-start gap-4">
							<a
								href="#"
								aria-label="Instagram"
								className="text-gray-500 hover:text-yellow-400 transition-colors"
							>
								<FaInstagram size={18} />
							</a>
							<a
								href="#"
								aria-label="YouTube"
								className="text-gray-500 hover:text-yellow-400 transition-colors"
							>
								<FaYoutube size={18} />
							</a>
							<a
								href="#"
								aria-label="LinkedIn"
								className="text-gray-500 hover:text-yellow-400 transition-colors"
							>
								<FaLinkedin size={18} />
							</a>
							<a
								href="#"
								aria-label="Email"
								className="text-gray-500 hover:text-yellow-400 transition-colors"
							>
								<FaEnvelope size={18} />
							</a>
						</div>
					</div>
					<div className="hidden md:grid grid-cols-1 gap-8 sm:grid-cols-3 md:col-span-8 md:gap-24">
						<div>
							<p className="text-[0.62rem] tracking-widest uppercase text-yellow-400 mb-2">{t.academy}</p>
							<ul className="space-y-0.5">
								{t.links.academy.map((item) => (
									<li key={item}>
										<a
											href="#"
											className="text-gray-400 text-xs hover:text-white transition-colors"
										>
											{item}
										</a>
									</li>
								))}
							</ul>
						</div>
						<div>
							<p className="text-[0.62rem] tracking-widest uppercase text-yellow-400 mb-2">{locale === "en" ? "Explore" : "Explorer"}</p>
							<ul className="space-y-0.5">
								{t.links.explore.map((item) => (
									<li key={item}>
										<a
											href="#"
											className="text-gray-400 text-xs hover:text-white transition-colors"
										>
											{item}
										</a>
									</li>
								))}
							</ul>
						</div>
						<div>
							<p className="text-[0.62rem] tracking-widest uppercase text-yellow-400 mb-2">{locale === "en" ? "Company" : "Compagnie"}</p>
							<ul className="space-y-0.5">
								{t.links.company.map((item) => (
									<li key={item}>
										<a
											href="#"
											className="text-gray-400 text-xs hover:text-white transition-colors"
										>
											{item}
										</a>
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
				<div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
					<p className="text-gray-600 text-xs">{t.copyright}</p>
					<div className="flex items-center gap-6">
						<a
							href="#"
							className="text-gray-600 text-xs hover:text-gray-400 transition-colors"
						>
							{t.privacy}
						</a>
						<a
							href="#"
							className="text-gray-600 text-xs hover:text-gray-400 transition-colors"
						>
							{t.terms}
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}
