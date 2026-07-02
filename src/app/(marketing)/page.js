import { cookies } from "next/headers";

import Hero from "@/features/marketing/components/home/hero";
import FeaturedCourses from "@/features/marketing/components/home/featured-courses";
import About from "@/features/marketing/components/home/about";
import PricingPlans from "@/features/marketing/components/home/pricing-plans";
import { auth } from "@/auth";
import { getLocaleFromCookie } from "@/lib/locale";

export const dynamic = "force-dynamic";

export default async function HomePage() {
	const cookieStore = await cookies();
	const locale = getLocaleFromCookie(cookieStore);
	const session = await auth();

	return (
		<div className="space-y-12">
			<Hero locale={locale} />
			<FeaturedCourses locale={locale} />
			<About locale={locale} />
			<PricingPlans
				locale={locale}
				session={session}
				showStripeTrust
				ctaFallbackHref="/pricing"
			/>
		</div>
	);
}
