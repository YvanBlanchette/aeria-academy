"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useFetchNotifications } from "@/hooks/use-fetch-notifications";

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children, enabled = true, userId = null, onNewNotifications }) {
	const value = useFetchNotifications({ enabled, userId, onNewNotifications });

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
 *   - hasUnreadMessages: boolean, true if any unread MESSAGE notification exists
 *   - unreadMessageCount: global unread MESSAGE count from the notifications payload
 *   - markMessagesAsRead: marks the currently-visible unread MESSAGE items as read
 */
export function useMessageNotifications() {
	const { notifications, markAsRead, unreadMessageCount } = useNotifications();

	const unreadMessages = useMemo(() => notifications.filter((n) => n.type === "MESSAGE" && !n.isRead), [notifications]);

	const markMessagesAsRead = useCallback(async () => {
		await Promise.all(unreadMessages.map((n) => markAsRead(n.id)));
	}, [unreadMessages, markAsRead]);

	return {
		hasUnreadMessages: unreadMessageCount > 0,
		unreadMessageCount,
		markMessagesAsRead,
	};
}
