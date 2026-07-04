import { LayoutDashboard, BookOpen, Users, Settings, Award, User, CreditCard, Building2, FileText, MessagesSquare } from "lucide-react";

export const adminSidebarNavItems = [
	{ href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
	{ href: "/admin/courses", label: "Cours", icon: BookOpen },
	{ href: "/admin/articles", label: "Articles", icon: FileText },
	{ href: "/admin/users", label: "Utilisateurs", icon: Users },
	{ href: "/admin/agencies", label: "Agences", icon: Building2 },
	{ href: "/admin/settings", label: "Paramètres", icon: Settings },
];

export const userSidebarNavItems = [
	{ href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
	{ href: "/dashboard/courses", label: "Mes cours", icon: BookOpen },
	{ href: "/community", label: "Communauté", icon: MessagesSquare },
	{ href: "/community/messages", label: "Messages", icon: MessagesSquare },
	{ href: "/resources", label: "Ressources", icon: FileText },
	{ href: "/dashboard/certificates", label: "Certificats", icon: Award },
	{ href: "/profile", label: "Mon profil", icon: User },
	{ href: "/dashboard/billing", label: "Abonnement", icon: CreditCard },
	{ href: "/dashboard/settings", label: "Paramètres", icon: Settings },
];

export function buildSocialTabs(userSlug) {
	const profileHref = userSlug ? `/users/${userSlug}` : "/profile";

	return [
		{ label: "Accueil", href: "/community", iconKey: "home" },
		{ label: "Agences", href: "/community/agencies", iconKey: "building" },
		{ label: "Profil", href: profileHref, iconKey: "profile" },
		{ label: "Amis", href: "/community/friends", iconKey: "users" },
	];
}
