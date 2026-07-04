"use client";

import { useRouter } from "next/navigation";
import { MessageCircle, MessageSquareText, ThumbsUp, UserCheck, UserPlus } from "lucide-react";
import { FaBell } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { formatSocialRelativeTime } from "@/lib/time";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useNotifications } from "@/features/community/notifications/notifications-provider";

function NotificationIcon({ type }) {
	if (type === "POST_LIKE") return <ThumbsUp className="h-3.5 w-3.5" />;
	if (type === "POST_COMMENT") return <MessageCircle className="h-3.5 w-3.5" />;
	if (type === "MESSAGE") return <MessageSquareText className="h-3.5 w-3.5" />;
	if (type === "FRIEND_REQUEST") return <UserPlus className="h-3.5 w-3.5" />;
	if (type === "FRIEND_ACCEPTED") return <UserCheck className="h-3.5 w-3.5" />;
	return <UserPlus className="h-3.5 w-3.5" />;
}

export function CommunityNotificationsMenu() {
	const router = useRouter();
	const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

	async function handleNotificationSelect(item) {
		if (!item?.href) return;
		if (!item.isRead) await markAsRead(item.id);
		router.push(item.href);
	}

	const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);

	function renderNotificationItem(item) {
		const actorName = item.actor?.name || item.actor?.email || "Membre";
		const actionText =
			item.type === "POST_LIKE"
				? "a aimé ton post"
				: item.type === "POST_COMMENT"
					? "a commenté ton post"
					: item.type === "MESSAGE"
						? "t'a envoyé un message"
						: item.type === "FRIEND_REQUEST"
							? "t'a envoyé une demande d'ami"
							: item.type === "FRIEND_ACCEPTED"
								? "a accepté ta demande d'ami"
								: "a interagi avec toi";
		const dateLabel = formatSocialRelativeTime(item.createdAt);

		return (
			<DropdownMenuItem
				key={item.id}
				className="bg-accent/50"
				onSelect={() => handleNotificationSelect(item)}
			>
				<div className="flex w-full flex-col items-start">
					<span className="line-clamp-1 inline-flex items-center gap-1 text-xs font-medium">
						<NotificationIcon type={item.type} />
						{actorName} {actionText}
					</span>
					{item.post?.content ? <span className="line-clamp-1 text-[11px] text-muted-foreground">{item.post.content}</span> : null}
					{item.messagePreview ? <span className="line-clamp-1 text-[11px] text-muted-foreground">{item.messagePreview}</span> : null}
					{dateLabel ? <span className="text-[10px] text-muted-foreground">{dateLabel}</span> : null}
				</div>
			</DropdownMenuItem>
		);
	}

	return (
		/* NOTIFICATIONS DROPDOWN */
		<DropdownMenu modal={false}>
			{/* BELL TRIGGER */}
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							className="relative rounded-full p-4 w-12 h-12 bg-neutral-100 hover:bg-neutral-200"
						>
							<FaBell className="h-8 w-8" />
							<span className="sr-only">Notifications</span>
							{unreadCount > 0 ? (
								<span className="absolute -right-0.5 -top-0.5 rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
									{unreadLabel}
								</span>
							) : null}
						</Button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent side="bottom">
					<p>Notifications</p>
				</TooltipContent>
			</Tooltip>
			{/* NOTIFICATIONS LIST */}
			<DropdownMenuContent
				align="end"
				className="w-80"
			>
				<div className="flex items-center justify-between px-2 py-1.5">
					<DropdownMenuLabel className="px-0">Notifications</DropdownMenuLabel>
					{notifications.length > 0 ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 rounded-full px-2 text-xs"
							onClick={markAllAsRead}
						>
							Tout marquer lu
						</Button>
					) : null}
				</div>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					{notifications.map((item) => renderNotificationItem(item))}
					{notifications.length === 0 ? <DropdownMenuLabel>Aucune notification</DropdownMenuLabel> : null}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
