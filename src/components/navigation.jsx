"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { HiMenu } from "react-icons/hi";

import { dict } from "@/lib/i18n";
import { localizedHref } from "@/lib/links";
import { LOCALE_COOKIE_NAME, DEFAULT_LOCALE } from "@/lib/locale";
import { useCurrentUser } from "@/hooks/use-current-user";
import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import { UserButtonClient as UserButton } from "@/components/ui/user-button-client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const LOCKED_ROUTES = ["/pricing", "/courses", "/about", "/login", "/register", "/dashboard", "/profile", "/contact"];

export default function Navbar({ locale = "fr", otherLocale }) {
	// 1. Hooks
	const pathname = usePathname();
	const router = useRouter();
	const { isLoaded, isSignedIn, isMember } = useCurrentUser();

	const locked = LOCKED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

	const [scrolledPast, setScrolledPast] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);

	// État final dérivé : pas besoin d'effet de synchronisation
	const scrolled = locked || scrolledPast;

	// Scroll listener (skip si locked)
	useEffect(() => {
		if (locked) return;
		setScrolledPast(window.scrollY > 40);
		let ticking = false;
		const onScroll = () => {
			if (ticking) return;
			requestAnimationFrame(() => {
				setScrolledPast(window.scrollY > 40);
				ticking = false;
			});
			ticking = true;
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, [locked]);

	const handleLocaleChange = (nextLocale) => {
		if (!nextLocale || nextLocale === locale) return;
		document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
		router.refresh();
		window.location.reload();
	};

	// 2. Early return APRÈS les hooks
	const t = dict[locale]?.nav ?? dict[DEFAULT_LOCALE]?.nav;
	if (!t) {
		console.warn(`Navbar: locale "${locale}" not found in dict`);
		return null;
	}

	// 3. Logique dérivée
	const href = (path) => localizedHref(locale, path);
	const closeMobile = () => setMobileOpen(false);
	const navTextColor = scrolled ? "text-gray-900" : "text-white";

	const navLinks = [
		{ label: t.academy, href: href("/"), desktop: true, mobile: true },
		{ label: t.pricing, href: href("/pricing"), desktop: true, mobile: true, hideIfMember: false },
		{ label: t.about, href: href("/about"), desktop: true, mobile: true },
		{ label: t.contact, href: href("/contact"), desktop: true, mobile: true },
	];

	const visibleLinks = (placement) =>
		navLinks.filter((link) => {
			if (link.hideIfMember && isLoaded && isMember) return false;
			return placement === "desktop" ? link.desktop : link.mobile;
		});

	return (
		<header className={clsx("top-0 left-0 right-0 z-50 transition-all duration-300", locked ? "sticky" : "fixed", scrolled ? "bg-white shadow-md" : "")}>
			<div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
				<Logo
					scrolled={scrolled}
					locale={locale}
				/>

				<nav
					className={clsx(
						"hidden lg:flex items-center gap-8 text-[0.75rem] tracking-widest uppercase font-medium transition-colors duration-300",
						navTextColor,
					)}
				>
					{visibleLinks("desktop").map(({ label, href: linkHref }) => (
						<Link
							key={label}
							href={linkHref}
							className="hover:text-yellow-500 transition-colors text-sm"
						>
							{label}
						</Link>
					))}
				</nav>

				<div className="hidden lg:flex items-center gap-4">
					<div
						className={clsx(
							"flex items-center rounded-full border p-1 backdrop-blur-sm",
							scrolled ? "border-gray-200 bg-white/90" : "border-white/20 bg-white/10",
						)}
					>
						<button
							type="button"
							className={clsx(
								"cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
								locale === "fr"
									? scrolled
										? "bg-gray-900 text-white"
										: "bg-white text-gray-900"
									: scrolled
										? "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
										: "text-white/80 hover:bg-white/10 hover:text-white",
							)}
							onClick={() => handleLocaleChange("fr")}
						>
							FR
						</button>
						<button
							type="button"
							className={clsx(
								"cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
								locale === "en"
									? scrolled
										? "bg-gray-900 text-white"
										: "bg-white text-gray-900"
									: scrolled
										? "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
										: "text-white/80 hover:bg-white/10 hover:text-white",
							)}
							onClick={() => handleLocaleChange("en")}
						>
							EN
						</button>
					</div>
					{!isLoaded ? (
						<div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
					) : isSignedIn ? (
						<UserButton />
					) : (
						<Button
							asChild
							variant={scrolled ? "ghost" : "outline"}
						>
							<Link href="/login">Connexion</Link>
						</Button>
					)}
				</div>

				<Sheet
					open={mobileOpen}
					onOpenChange={setMobileOpen}
				>
					<SheetTrigger asChild>
						<button
							className={clsx("lg:hidden transition-colors", navTextColor)}
							aria-label="Ouvrir le menu"
						>
							<HiMenu className="w-6 h-6" />
						</button>
					</SheetTrigger>
					<SheetContent
						side="right"
						className="w-full sm:max-w-md flex flex-col"
					>
						<SheetHeader>
							<SheetTitle asChild>
								<Logo
									variant="dark"
									locale={locale}
								/>
							</SheetTitle>
						</SheetHeader>

						<nav className="flex flex-col items-center justify-center flex-1 gap-6 py-8">
							{visibleLinks("mobile").map(({ label, href: linkHref }) => (
								<Link
									key={label}
									href={linkHref}
									onClick={closeMobile}
									className="text-base tracking-widest uppercase text-gray-900 hover:text-yellow-600 transition-colors"
								>
									{label}
								</Link>
							))}
						</nav>

						<div className="border-t pt-6 flex flex-col gap-3 pb-4">
							{!isLoaded ? null : isSignedIn ? (
								<div className="flex justify-center">
									<UserButton />
								</div>
							) : (
								<>
									<Button
										asChild
										size="lg"
										variant="outline"
										onClick={closeMobile}
									>
										<Link href="/login">Connexion</Link>
									</Button>
									<Button
										asChild
										size="lg"
										onClick={closeMobile}
									>
										<Link href="/register">S&apos;inscrire</Link>
									</Button>
								</>
							)}
						</div>
					</SheetContent>
				</Sheet>
			</div>
		</header>
	);
}
