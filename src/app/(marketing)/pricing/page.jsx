import { cookies } from "next/headers";

import { auth } from "@/auth";
import PricingPlans from "@/features/marketing/components/home/pricing-plans";
import { getLocaleFromCookie } from "@/lib/locale";

import { createCheckoutSession, createPortalSession } from "./actions";

export const metadata = {
	title: "Abonnements | ÆRIA Voyages Academy",
};

async function manageSubscriptionAction() {
	"use server";
	await createPortalSession();
}

export default async function PricingPage({ searchParams }) {
	// Resolve the page params and auth state once so the rest of the component stays readable.
	const params = await searchParams;
	const session = await auth();
	const canceled = params?.canceled === "1";
	const cookieStore = await cookies();
	const locale = getLocaleFromCookie(cookieStore);

	return (
		<PricingPlans
			locale={locale}
			session={session}
			canceled={canceled}
			showCanceledNotice
			showManageSubscription
			showStripeTrust
			checkoutAction={createCheckoutSession}
			manageAction={manageSubscriptionAction}
		/>
	);
}
