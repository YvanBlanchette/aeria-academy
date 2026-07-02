"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight, List, X } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ResourceTableOfContents } from "@/components/resources/resource-table-of-contents";
import { UserButtonClient } from "@/components/ui/user-button-client";
import { CommunityNotificationsMenu } from "@/components/community/community-notifications-menu";

function FloatingCategoriesTrigger() {
	const { open } = useSidebar();

	if (open) return null;

	return (
		<div className="fixed left-3 top-21 z-30 flex w-fit justify-start md:left-4 md:top-26">
			<SidebarTrigger
				variant="outline"
				size="sm"
				className="h-9 w-9 rounded-full border border-border bg-white p-0 shadow-lg transition-transform hover:translate-x-1 hover:bg-white sm:h-8 sm:w-auto sm:gap-2 sm:px-2.5"
			>
				<span className="hidden sm:inline">Catégories</span>
			</SidebarTrigger>
		</div>
	);
}

function renderCategoryNodes(nodes, activePath) {
	return (
		<ul className="space-y-1">
			{nodes.map((node) => {
				const isActive = activePath && (activePath === node.path || activePath.startsWith(`${node.path} /`));
				const isExactActive = activePath === node.path;
				return (
					<li key={node.path}>
						<div className="space-y-1">
							<Link
								href={`/resources?category=${encodeURIComponent(node.path)}`}
								className={`group flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm transition-all ${
									isActive
										? "border-primary/30 bg-primary/5 text-foreground shadow-sm"
										: "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
								}`}
							>
								<span className="flex min-w-0 items-center gap-2">
									<span
										className={`h-2.5 w-2.5 rounded-full transition-colors ${
											isExactActive ? "bg-primary" : isActive ? "bg-primary/70" : "bg-muted-foreground/30 group-hover:bg-muted-foreground/50"
										}`}
									/>
									<span className="line-clamp-1 font-medium">{node.name}</span>
								</span>
								<span
									className={`rounded-full px-2 py-0.5 text-xs font-medium ${isActive ? "bg-background text-foreground" : "bg-muted text-muted-foreground"}`}
								>
									{node.count}
								</span>
							</Link>
							{node.children.length > 0 ? <div className="pl-3">{renderCategoryNodes(node.children, activePath)}</div> : null}
						</div>
					</li>
				);
			})}
		</ul>
	);
}

function findCategoryTrail(nodes, activePath) {
	if (!activePath) return [];

	for (const node of nodes) {
		if (activePath === node.path) return [node];

		if (activePath.startsWith(`${node.path} /`)) {
			const childTrail = findCategoryTrail(node.children, activePath);
			return childTrail.length > 0 ? [node, ...childTrail] : [node];
		}
	}

	return [];
}

function CategoryNode({ node, activePath, expandedPaths, onToggle }) {
	const hasChildren = node.children.length > 0;
	const isActive = activePath && (activePath === node.path || activePath.startsWith(`${node.path} /`));
	const isExactActive = activePath === node.path;
	const isExpanded = hasChildren && expandedPaths.has(node.path);

	return (
		<li>
			<div className="space-y-1">
				<div
					className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-all ${isActive ? "border-primary/30 bg-primary/5 shadow-sm" : "border-transparent hover:border-border hover:bg-muted"}`}
				>
					{hasChildren ? (
						<button
							type="button"
							onClick={() => onToggle(node.path)}
							aria-expanded={isExpanded}
							className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors ${isActive ? "border-primary/20 bg-background text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}
						>
							<ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-0" : "-rotate-90"}`} />
						</button>
					) : (
						<span
							className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${isActive ? "border-primary/20 bg-background" : "border-transparent bg-transparent"}`}
						>
							<span className={`h-2.5 w-2.5 rounded-full ${isExactActive ? "bg-primary" : isActive ? "bg-primary/70" : "bg-muted-foreground/30"}`} />
						</span>
					)}

					<Link
						href={`/resources?category=${encodeURIComponent(node.path)}`}
						className="min-w-0 flex-1"
					>
						<div className="flex items-center justify-between gap-3">
							<span className={`line-clamp-1 text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
								{node.name}
							</span>
							<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isActive ? "bg-background text-foreground" : "bg-muted text-muted-foreground"}`}>
								{node.count}
							</span>
						</div>
					</Link>
				</div>

				{hasChildren && isExpanded ? (
					<div className="pl-4">
						<ul className="space-y-1.5 border-l border-border/70 pl-3">
							{node.children.map((child) => (
								<CategoryNode
									key={child.path}
									node={child}
									activePath={activePath}
									expandedPaths={expandedPaths}
									onToggle={onToggle}
								/>
							))}
						</ul>
					</div>
				) : null}
			</div>
		</li>
	);
}

function CategoryTree({ nodes, activePath }) {
	const trailPaths = useMemo(() => findCategoryTrail(nodes, activePath).map((node) => node.path), [nodes, activePath]);
	const [expandedPaths, setExpandedPaths] = useState(() => new Set(trailPaths));

	useEffect(() => {
		setExpandedPaths((current) => {
			const next = new Set(current);
			for (const path of trailPaths) {
				next.add(path);
			}
			return next;
		});
	}, [trailPaths]);

	function handleToggle(path) {
		setExpandedPaths((current) => {
			const next = new Set(current);
			if (next.has(path)) {
				next.delete(path);
			} else {
				next.add(path);
			}
			return next;
		});
	}

	return (
		<ul className="space-y-1.5">
			{nodes.map((node) => (
				<CategoryNode
					key={node.path}
					node={node}
					activePath={activePath}
					expandedPaths={expandedPaths}
					onToggle={handleToggle}
				/>
			))}
		</ul>
	);
}

export function ResourceReadingShell({
	categoryTree,
	activeCategoryPath,
	sidebarCategoryResources,
	currentArticleSlug,
	title,
	breadcrumbSegments = [],
	user,
	sidebarDefaultOpen = false,
	children,
}) {
	return (
		<SidebarProvider
			defaultOpen={sidebarDefaultOpen}
			style={{
				"--sidebar-width": "320px",
				"--sidebar-width-mobile": "320px",
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
						<span className="sr-only">Fermer les catégories</span>
					</SidebarTrigger>
					<p className="text-sm font-semibold">Navigation des ressources</p>
				</SidebarHeader>
				<SidebarContent className="bg-white px-2 py-2">
					<div className="space-y-3">
						<div className="rounded-xl border bg-muted/30 p-3">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chemin actif</p>
							{findCategoryTrail(categoryTree, activeCategoryPath).length > 0 ? (
								<div className="mt-2 flex flex-wrap gap-2">
									{findCategoryTrail(categoryTree, activeCategoryPath).map((node, index, trail) => (
										<Link
											key={node.path}
											href={`/resources?category=${encodeURIComponent(node.path)}`}
											className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
												index === trail.length - 1
													? "border-primary bg-primary text-primary-foreground"
													: "border-border bg-white text-muted-foreground hover:text-foreground"
											}`}
										>
											{node.name}
										</Link>
									))}
								</div>
							) : (
								<p className="mt-2 text-sm text-muted-foreground">Aucune catégorie active</p>
							)}
						</div>

						<div className="space-y-2">
							<p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Catégories</p>
							<div className="max-h-[52vh] overflow-y-auto pr-1">
								<CategoryTree
									nodes={categoryTree}
									activePath={activeCategoryPath}
								/>
							</div>
						</div>
					</div>

					{sidebarCategoryResources.length > 0 ? (
						<div className="mt-3 border-t pt-3">
							<p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Même étape</p>
							<ul className="mt-2 space-y-1">
								{sidebarCategoryResources.map((item) => (
									<li key={item.id}>
										<Link
											href={`/resources/${item.slug}`}
											className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${
												item.slug === currentArticleSlug ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
											}`}
										>
											<span className="line-clamp-2">{item.title}</span>
										</Link>
									</li>
								))}
							</ul>
						</div>
					) : null}
				</SidebarContent>
				<SidebarFooter className="border-t bg-white">
					<Link
						href="/resources"
						className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
					>
						<ArrowLeft className="h-4 w-4" />
						Retour aux ressources
					</Link>
				</SidebarFooter>
			</Sidebar>

			<SidebarInset className="bg-transparent shadow-none md:m-0 md:rounded-none">
				<FloatingCategoriesTrigger />

				<header className="sticky top-0 z-10 border-b bg-white shadow-lg">
					<div className="mx-auto flex min-h-18 w-[92%] max-w-7xl items-center justify-between gap-3 py-2 sm:w-[90%] md:min-h-22.5 md:gap-4">
						<div className="min-w-0 flex-1">
							<div>
								<h1 className="line-clamp-2 text-base font-bold leading-tight sm:text-xl lg:text-3xl">{title}</h1>
								{breadcrumbSegments.length > 0 ? (
									<nav
										aria-label="Fil d'Ariane"
										className="mt-0.5"
									>
										<ol className="flex flex-wrap items-center gap-1 text-sm">
											<li>
												<Link
													href="/resources"
													className="text-muted-foreground hover:text-foreground"
												>
													Ressources
												</Link>
											</li>
											{breadcrumbSegments.map((item) => (
												<li
													key={item.path}
													className="inline-flex items-center gap-1"
												>
													<ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
													<Link
														href={`/resources?category=${encodeURIComponent(item.path)}`}
														className="text-muted-foreground hover:text-foreground"
													>
														{item.label}
													</Link>
												</li>
											))}
										</ol>
									</nav>
								) : null}
							</div>
						</div>
						{user ? (
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
						) : null}
					</div>
				</header>

				<div className="fixed right-3 top-21 z-30 flex w-fit justify-end md:right-4 md:top-26">
					<Sheet>
						<SheetTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className="h-9 w-9 rounded-full border border-border bg-white p-0 shadow-lg transition-transform hover:-translate-x-1 hover:bg-white sm:h-8 sm:w-auto sm:gap-2 sm:px-2.5"
							>
								<List className="h-4 w-4" />
								<span className="hidden sm:inline">Sommaire</span>
							</Button>
						</SheetTrigger>
						<SheetContent
							side="right"
							className="w-full p-0 sm:max-w-sm"
							overlayClassName="bg-black/5 supports-backdrop-filter:backdrop-blur-none"
							showCloseButton={false}
						>
							<SheetClose asChild>
								<Button
									variant="ghost"
									size="icon-sm"
									className="absolute left-1 top-1 z-10"
								>
									<X className="h-4 w-4" />
									<span className="sr-only">Fermer le sommaire</span>
								</Button>
							</SheetClose>
							<div className="h-14 border-b bg-white px-4 flex items-center justify-center md:h-16">
								<p className="text-sm font-semibold">Table des matières</p>
							</div>
							<div className="p-3">
								<ResourceTableOfContents containerId="resource-reading-content" />
							</div>
						</SheetContent>
					</Sheet>
				</div>

				<div className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
