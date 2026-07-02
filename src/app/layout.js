import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
	title: "AERIA Voyages Academy",
	description: "Plateforme d'apprentissage ÆRIA Voyages",
};

export default function RootLayout({ children }) {
	return (
		<html
			lang="fr"
			suppressHydrationWarning
			className={cn("font-sans", inter.variable)}
		>
			<head>
				<meta
					name="apple-mobile-web-app-title"
					content="ÆRIA"
				/>
			</head>
			<body
				suppressHydrationWarning
				className="bg-neutral-100 text-foreground transition-colors"
			>
				<Providers>
					<TooltipProvider>{children}</TooltipProvider>
					<Toaster richColors />
				</Providers>
			</body>
		</html>
	);
}
