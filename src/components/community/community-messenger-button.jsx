"use client";

import Link from "next/link";
import { BiSolidMessageRoundedDots, BiSolidMessageRoundedError } from "react-icons/bi";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useMessageNotifications } from "@/features/community/notifications/notifications-provider";
import clsx from "clsx";

export default function MessengerButton({ user: userProp, size }) {
	const { user: sessionUser, isSignedIn } = useCurrentUser();
	const { hasUnreadMessages } = useMessageNotifications();

	const user =
		userProp ||
		(isSignedIn
			? {
					id: sessionUser?.id,
					name: sessionUser?.fullName,
					email: sessionUser?.email,
					image: sessionUser?.imageUrl,
					role: sessionUser?.role,
				}
			: null);

	const messengerURL = "/community/messages";
	const Icon = hasUnreadMessages ? BiSolidMessageRoundedError : BiSolidMessageRoundedDots;

	return (
		<Link
			href={messengerURL}
			className="hover:bg-neutral-200 rounded-full p-3 bg-neutral-100 relative"
			aria-label={hasUnreadMessages ? "Messages (nouveaux messages)" : "Messages"}
		>
			<Icon className={clsx("w-5 h-5", hasUnreadMessages && "animate-pulse")} />
		</Link>
	);
}
