"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { SmilePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toggleCommunityMessageReaction } from "@/app/(member)/community/messages/actions";

const PICKER_EMOJIS = [
	"👍",
	"❤️",
	"😂",
	"😮",
	"😢",
	"👏",
	"🔥",
	"🙏",
	"🎉",
	"✅",
	"🤝",
	"💡",
	"👀",
	"😍",
	"🤩",
	"😎",
	"🙌",
	"💪",
	"✨",
	"🤔",
	"😅",
	"😴",
	"😡",
	"🤯",
];

function groupReactions(reactions) {
	const map = new Map();
	for (const reaction of reactions || []) {
		const current = map.get(reaction.emoji) || { emoji: reaction.emoji, count: 0, userIds: new Set(), userNames: [] };
		current.count += 1;
		current.userIds.add(reaction.userId);
		current.userNames.push(reaction.userName || "Membre");
		map.set(reaction.emoji, current);
	}

	return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function useMessageReactionActions() {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	function reactWith(emoji) {
		if (!emoji) return;
		return async (messageId) => {
			if (!messageId) return;

			startTransition(async () => {
				const formData = new FormData();
				formData.set("messageId", messageId);
				formData.set("emoji", emoji);
				const result = await toggleCommunityMessageReaction(formData);

				if (result?.error) {
					toast.error(result.error);
					return;
				}

				router.refresh();
			});
		};
	}

	return { isPending, reactWith };
}

export function CommunityMessageReactions({ messageId, reactions, currentUserId, isMine }) {
	const grouped = groupReactions(reactions);
	const { isPending, reactWith } = useMessageReactionActions();

	if (grouped.length === 0) return null;

	return (
		<div className="pointer-events-auto flex flex-wrap items-center gap-1">
			{grouped.map((item) => {
				const reactedByMe = item.userIds.has(currentUserId);
				const usersLabel = item.userNames.length > 0 ? item.userNames.join(", ") : "Aucune réaction";
				return (
					<button
						key={item.emoji}
						type="button"
						onClick={() => reactWith(item.emoji)(messageId)}
						disabled={isPending}
						title={usersLabel}
						className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] shadow-sm transition ${
							reactedByMe
								? isMine
									? "border-primary-foreground/45 bg-primary-foreground/20"
									: "border-primary/35 bg-primary/10"
								: isMine
									? "border-primary-foreground/25 bg-primary-foreground/12"
									: "border-border bg-white"
						}`}
					>
						<span>{item.emoji}</span>
						<span>{item.count}</span>
					</button>
				);
			})}
		</div>
	);
}

export function CommunityMessageReactionPickerButton({ messageId, isMine }) {
	const { isPending, reactWith } = useMessageReactionActions();

	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					disabled={isPending}
					className={`h-7 w-7 rounded-full ${isMine ? "text-primary-foreground/90 hover:bg-primary-foreground/15" : "text-muted-foreground hover:bg-muted"}`}
					aria-label="Réagir"
					title="Réagir"
				>
					<SmilePlus className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align={isMine ? "start" : "end"}
				className="w-auto min-w-0"
			>
				<div className="grid grid-cols-6 gap-1 p-1">
					{PICKER_EMOJIS.map((emoji) => (
						<DropdownMenuItem
							key={emoji}
							onSelect={() => reactWith(emoji)(messageId)}
							className="h-8 w-8 justify-center p-0 text-base"
						>
							{emoji}
						</DropdownMenuItem>
					))}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
