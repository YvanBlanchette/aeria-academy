import { cookies } from "next/headers";
import { cloneElement, isValidElement } from "react";

import Footer from "@/components/footer";
import Navigation from "@/components/navigation";
import { getLocaleFromCookie } from "@/lib/locale";

export const dynamic = "force-dynamic";

export default async function MarketingLayout({ children }) {
	const cookieStore = await cookies();
	const locale = getLocaleFromCookie(cookieStore);
	const content = isValidElement(children) ? cloneElement(children, { locale }) : children;

	return (
		<div className="flex min-h-screen flex-col overflow-x-hidden">
			<Navigation locale={locale} />
			<main className="flex-1 overflow-x-hidden bg-neutral-50">{content}</main>
			<Footer locale={locale} />
		</div>
	);
}
