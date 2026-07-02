"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useFetchNotifications } from "@/hooks/use-fetch-notifications";

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children, enabled = true, onNewNotifications }) {
	const value = useFetchNotifications({ enabled, onNewNotifications });

	return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

/**
 * Full notifications state: notifications, unreadCount, markAsRead, markAllAsRead, refresh, isLoading.
 * Use this in the bell dropdown.
 */
export function useNotifications() {
	const ctx = useContext(NotificationsContext);
	if (!ctx) {
		throw new Error("useNotifications must be used inside <NotificationsProvider>");
	}
	return ctx;
}

/**
 * Convenience selector for the messenger button.
 *
 * Returns:
 *   - hasUnreadMessages: boolean, true if any unread MESSAGE notification is in the recent window
 *   - unreadMessageCount: count of unread MESSAGE items in the recent window (capped by fetch limit)
 *   - markMessagesAsRead: marks the currently-visible unread MESSAGE items as read
 *
 * Note: unreadMessageCount reflects only the last N notifications the server returned,
 * not a true global count per-type. If you need an exact number, add a per-type
 * count to the /api/community/notifications payload and expose it here.
 */
export function useMessageNotifications() {
	const { notifications, markAsRead } = useNotifications();

	const unreadMessages = useMemo(() => notifications.filter((n) => n.type === "MESSAGE" && !n.isRead), [notifications]);

	const markMessagesAsRead = useCallback(async () => {
		await Promise.all(unreadMessages.map((n) => markAsRead(n.id)));
	}, [unreadMessages, markAsRead]);

	return {
		hasUnreadMessages: unreadMessages.length > 0,
		unreadMessageCount: unreadMessages.length,
		markMessagesAsRead,
	};
}
