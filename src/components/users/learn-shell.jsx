"use client";

import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarTrigger, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { LessonSidebar } from "./lesson-sidebar";
import Logo from "@/components/logo";
import { UserButtonClient } from "../ui/user-button-client";
import { CommunityNotificationsMenu } from "../community/community-notifications-menu";
import Footer from "../partials/Footer";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { markdownToExcerpt } from "@/lib/markdown-excerpt";

function FloatingLessonsTrigger() {
	const { open } = useSidebar();

	if (open) {
		return null;
	}

	return (
		<div className="fixed left-3 top-21 z-30 flex w-fit justify-start md:left-4 md:top-26">
			<SidebarTrigger
				variant="outline"
				size="sm"
				className="h-9 w-9 rounded-full border border-border bg-white p-0 shadow-lg transition-transform hover:translate-x-1 hover:bg-white sm:h-8 sm:w-auto sm:gap-2 sm:px-2.5"
			>
				<span className="hidden sm:inline">Leçons</span>
			</SidebarTrigger>
		</div>
	);
}

export function LearnShell({ course, completedSet, defaultOpen, children, session }) {
	const user = session?.user;
	const summary = markdownToExcerpt(course.description, 120);

	return (
		<SidebarProvider
			defaultOpen={defaultOpen}
			style={{
				"--sidebar-width": "384px",
				"--sidebar-width-mobile": "384px",
				"--background": "#f5f5f5",
				"--learn-header-height": "5.5rem",
			}}
		>
			<Sidebar
				collapsible="offcanvas"
				desktopOverlay
				className="border-r shadow-lg"
			>
				<SidebarHeader className="relative flex h-18 items-center justify-center border-b bg-white md:h-22.5">
					<SidebarTrigger
						variant="ghost"
						size="icon-sm"
						showIcon={false}
						className="absolute right-1 top-1"
					>
						<X className="h-4 w-4" />
						<span className="sr-only">Fermer les lecons</span>
					</SidebarTrigger>
					<Logo
						locale="fr"
						scrolled
					/>
				</SidebarHeader>
				<SidebarContent className="bg-white">
					<LessonSidebar
						course={course}
						completedSet={completedSet}
					/>
				</SidebarContent>
				<SidebarFooter>
					<Link
						href="/"
						className="flex items-center justify-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted border-t"
					>
						<ArrowLeft className="h-4 w-4" />
						Retour à l&apos;accueil
					</Link>
				</SidebarFooter>
			</Sidebar>

			<SidebarInset>
				<FloatingLessonsTrigger />

				<header className="sticky top-0 z-10 border-b bg-white shadow-lg">
					<div className="mx-auto flex min-h-18 w-[92%] max-w-7xl items-center justify-between gap-3 py-2 sm:w-[90%] md:min-h-22.5 md:gap-4">
						<div className="min-w-0 flex-1">
							<div>
								<h1 className="line-clamp-2 text-base font-bold leading-tight sm:text-xl lg:text-3xl">{course.title}</h1>
								<div className="mt-0.5 flex items-center gap-2">
									<p className="line-clamp-1 hidden text-sm text-muted-foreground md:block">{summary}</p>
								</div>
							</div>
						</div>
						{user && (
							<div className="flex shrink-0 items-center gap-2 sm:gap-3">
								<div className="hidden text-right sm:block">
									<h2 className="max-w-48 truncate text-sm font-bold md:text-base">{user?.name}</h2>
									<p className="max-w-52 truncate text-xs text-muted-foreground">{user?.email}</p>
								</div>
								<CommunityNotificationsMenu />
								<UserButtonClient
									user={user}
									size="lg"
								/>
							</div>
						)}
					</div>
				</header>

				<main className="flex-1 overflow-y-auto">{children}</main>
				<Footer locale="fr" />
			</SidebarInset>
		</SidebarProvider>
	);
}
