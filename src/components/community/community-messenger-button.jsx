"use client";

import Link from "next/link";
import { BiSolidMessageRoundedDots, BiSolidMessageRoundedError } from "react-icons/bi";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useMessageNotifications } from "@/features/community/notifications/notifications-provider";
import clsx from "clsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export default function MessengerButton() {
	// Keep this hook mounted here to preserve parity with other user-aware header widgets.
	useCurrentUser();
	const { hasUnreadMessages } = useMessageNotifications();

	const messengerURL = "/community/messages";
	const Icon = hasUnreadMessages ? BiSolidMessageRoundedError : BiSolidMessageRoundedDots;

	return (
		/* Global entry point to the private messenger thread page. */
		<Tooltip>
			<TooltipTrigger asChild>
				<Link
					href={messengerURL}
					className="hover:bg-neutral-200 rounded-full p-3 bg-neutral-100 relative"
					aria-label={hasUnreadMessages ? "Messages (nouveaux messages)" : "Messages"}
				>
					<Icon className={clsx("w-5 h-5", hasUnreadMessages && "animate-pulse")} />
				</Link>
			</TooltipTrigger>
			<TooltipContent side="bottom">
				<p>ÆRIA Messenger</p>
			</TooltipContent>
		</Tooltip>
	);
}
