"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { markCommunityStoryViewed } from "@/app/(member)/community/actions";
import { formatSocialRelativeTime } from "@/lib/time";
import { CommunityStoryComposer } from "@/components/community/community-story-composer";
import Image from "next/image";

function initialsFromName(name, email) {
	return (name || email || "U")
		.split(" ")
		.map((part) => part.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function groupStoriesByAuthor(stories) {
	const groups = new Map();

	for (const story of stories) {
		const authorId = story.author.id;
		if (!groups.has(authorId)) {
			groups.set(authorId, {
				author: story.author,
				stories: [],
			});
		}

		groups.get(authorId).stories.push(story);
	}

	return Array.from(groups.values())
		.map((group) => ({
			...group,
			stories: group.stories.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
			latestAt: group.stories.reduce(
				(latest, story) => (new Date(story.createdAt).getTime() > new Date(latest).getTime() ? story.createdAt : latest),
				group.stories[0]?.createdAt,
			),
			hasUnviewed: group.stories.some((story) => !story.viewedByCurrentUser),
		}))
		.sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
}

function CreateStoryCard({ onClick, currentUser }) {
	const user = currentUser;
	console.log(currentUser);

	return (
		<button
			type="button"
			onClick={onClick}
			className="cursor-pointer group relative flex h-46 w-31 shrink-0 flex-col justify-between overflow-hidden rounded-3xl border border-dashed border-border bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:h-56 sm:w-36"
		>
			<div className="flex flex-col items-center justify-center h-full">
				<div className="w-full h-2/3 relative overflow-hidden bg-muted border-b border-border">
					{user?.image ? (
						<Image
							src={user.image}
							alt={user.name || user.email || "Moi"}
							fill
							className="object-cover"
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center bg-linear-to-b from-primary/10 to-primary/20 text-2xl font-semibold text-primary">
							{initialsFromName(user?.name, user?.email)}
						</div>
					)}
				</div>
				<div className="relative bg-white h-1/3 w-full flex flex-col gap-1 justify-end items-center p-2">
					{/* Bouton + qui chevauche l'image, style Facebook */}
					<div className="absolute -top-4 rounded-full border-4 border-white bg-primary p-1.5 text-white">
						<Plus className="h-4 w-4" />
					</div>
					<p className="text-sm font-semibold leading-tight text-foreground">Créer une story</p>
					<p className="text-xs leading-tight text-muted-foreground">Visible 24 h</p>
				</div>
			</div>
		</button>
	);
}

function CreateStoryDialog({ open, onOpenChange, currentUser, onSuccess }) {
	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
		>
			<DialogContent className="max-w-2xl">
				<CommunityStoryComposer
					user={currentUser}
					onSuccess={onSuccess}
				/>
			</DialogContent>
		</Dialog>
	);
}

export function CommunityStoriesStrip({ stories = [], currentUser }) {
	const groups = useMemo(() => groupStoriesByAuthor(stories), [stories]);
	const [open, setOpen] = useState(false);
	const [activeGroupIndex, setActiveGroupIndex] = useState(0);
	const [activeStoryIndex, setActiveStoryIndex] = useState(0);
	const markedStoryIdsRef = useRef(new Set());
	const [createOpen, setCreateOpen] = useState(false);

	const activeGroup = groups[activeGroupIndex];
	const activeStory = activeGroup?.stories[activeStoryIndex] ?? null;

	useEffect(() => {
		if (!open || !activeStory || markedStoryIdsRef.current.has(activeStory.id)) return;

		markedStoryIdsRef.current.add(activeStory.id);
		markCommunityStoryViewed(activeStory.id);
	}, [activeStory, open]);

	function openGroup(index) {
		setActiveGroupIndex(index);
		setActiveStoryIndex(0);
		setOpen(true);
	}

	function closeViewer() {
		setOpen(false);
	}

	function goToNext() {
		if (!activeGroup) return;

		if (activeStoryIndex < activeGroup.stories.length - 1) {
			setActiveStoryIndex((index) => index + 1);
			return;
		}

		if (activeGroupIndex < groups.length - 1) {
			setActiveGroupIndex((index) => index + 1);
			setActiveStoryIndex(0);
			return;
		}

		closeViewer();
	}

	function goToPrevious() {
		if (!activeGroup) return;

		if (activeStoryIndex > 0) {
			setActiveStoryIndex((index) => index - 1);
			return;
		}

		if (activeGroupIndex > 0) {
			const previousGroupIndex = activeGroupIndex - 1;
			setActiveGroupIndex(previousGroupIndex);
			setActiveStoryIndex(groups[previousGroupIndex].stories.length - 1);
		}
	}

	return (
		<>
			<div className="flex gap-3 pb-1">
				<CreateStoryCard
					onClick={() => setCreateOpen(true)}
					currentUser={currentUser}
				/>

				{groups.map((group, index) => {
					const initials = initialsFromName(group.author.name, group.author.email);
					console.log(group);
					const coverImage = group.stories.find((story) => story.imageUrl)?.imageUrl || "";
					const latestStory = group.stories[group.stories.length - 1];
					return (
						<button
							key={group.author.id}
							type="button"
							onClick={() => openGroup(index)}
							className="cursor-pointer  group relative flex h-46 w-31 shrink-0 overflow-hidden rounded-3xl border border-border/60 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg sm:h-56 sm:w-36"
						>
							<div className={`absolute inset-0 ${coverImage ? "" : "bg-linear-to-b from-[#101828] via-[#334155] to-[#0f172a]"}`}>
								{coverImage ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img
										src={coverImage}
										alt={group.author.name || "Story"}
										className="h-full w-full object-cover"
									/>
								) : null}
								<div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-black/10" />
							</div>

							<div className="relative flex h-full w-full flex-col justify-between p-3 text-white">
								<div className="flex items-start justify-between gap-2">
									<div className={`rounded-full p-0.75 ${group.hasUnviewed ? "bg-linear-to-br from-primary via-amber-400 to-pink-500" : "bg-white/25"}`}>
										<Avatar className="h-10 w-10 border-2 border-white/90">
											<AvatarImage src={group.author.image || ""} />
											<AvatarFallback>{initials}</AvatarFallback>
										</Avatar>
									</div>
									<div className="rounded-full bg-black/25 px-2 py-1 text-[11px] font-medium backdrop-blur-sm">
										{group.stories.length} story{group.stories.length > 1 ? "s" : ""}
									</div>
								</div>

								<div className="space-y-1">
									<p className="line-clamp-2 text-sm font-semibold leading-tight drop-shadow-sm">{group.author.name || group.author.email}</p>
									<p className="line-clamp-1 text-xs text-white/80">
										{latestStory?.content ? latestStory.content : formatSocialRelativeTime(latestStory?.createdAt)}
									</p>
								</div>
							</div>
						</button>
					);
				})}
			</div>

			<Dialog
				open={open}
				onOpenChange={(nextOpen) => {
					if (!nextOpen) closeViewer();
				}}
			>
				<DialogContent
					showCloseButton={false}
					className="h-[92vh] w-[calc(100%-1rem)] max-w-5xl overflow-hidden border-0 bg-black p-0 text-white"
				>
					{activeGroup && activeStory ? (
						<div className="relative flex h-full flex-col bg-black">
							<div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-3">
								{activeGroup.stories.map((story, index) => (
									<div
										key={story.id}
										className={`h-1.5 flex-1 rounded-full ${index < activeStoryIndex ? "bg-white" : index === activeStoryIndex ? "bg-white" : "bg-white/25"}`}
									/>
								))}
							</div>

							<div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4 pt-6">
								<div className="flex items-center gap-3">
									<Avatar className="h-10 w-10 border border-white/20">
										<AvatarImage src={activeGroup.author.image || ""} />
										<AvatarFallback>{initialsFromName(activeGroup.author.name, activeGroup.author.email)}</AvatarFallback>
									</Avatar>
									<div>
										<p className="text-sm font-semibold">{activeGroup.author.name || activeGroup.author.email}</p>
										<p className="text-xs text-white/70">{formatSocialRelativeTime(activeStory.createdAt)}</p>
									</div>
								</div>

								<Button
									type="button"
									variant="ghost"
									className="rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
									onClick={closeViewer}
								>
									Fermer
								</Button>
							</div>

							<div className="relative flex flex-1 items-stretch justify-stretch">
								<button
									type="button"
									className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-w-resize"
									onClick={goToPrevious}
									aria-label="Story précédente"
								/>
								<button
									type="button"
									className="absolute inset-y-0 right-0 z-10 w-1/2 cursor-e-resize"
									onClick={goToNext}
									aria-label="Story suivante"
								/>

								<div className="relative flex-1 bg-black">
									{activeStory.imageUrl ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={activeStory.imageUrl}
											alt="Story"
											className="h-full w-full object-cover"
										/>
									) : (
										<div className="flex h-full items-center justify-center p-8 text-center">
											<p className="max-w-2xl text-2xl font-semibold leading-relaxed sm:text-3xl">{activeStory.content}</p>
										</div>
									)}

									{activeStory.content && activeStory.imageUrl ? (
										<div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent p-6 pt-16">
											<p className="max-w-2xl text-lg leading-7 text-white sm:text-xl">{activeStory.content}</p>
										</div>
									) : null}
								</div>
							</div>

							<div className="flex items-center justify-between border-t border-white/10 bg-black/80 px-4 py-3 text-sm text-white/80">
								<button
									type="button"
									onClick={goToPrevious}
									className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-white transition-colors hover:bg-white/20"
								>
									<ChevronLeft className="h-4 w-4" />
									Précédente
								</button>
								<p>
									Story {activeStoryIndex + 1} / {activeGroup.stories.length}
								</p>
								<button
									type="button"
									onClick={goToNext}
									className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-white transition-colors hover:bg-white/20"
								>
									Suivante
									<ChevronRight className="h-4 w-4" />
								</button>
							</div>
						</div>
					) : null}
				</DialogContent>
			</Dialog>

			<CreateStoryDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				currentUser={currentUser}
				onSuccess={() => setCreateOpen(false)}
			/>
		</>
	);
}
