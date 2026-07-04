"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_LIMIT = 8;
const DEFAULT_POLL_INTERVAL = 60000;
const DEFAULT_HIDDEN_POLL_INTERVAL = 180000;

/**
 * Fetches community notifications, polls for updates, and exposes
 * read-state mutations.
 *
 * @param {Object}   options
 * @param {number}   [options.limit=8]              Max notifications to fetch.
 * @param {number}   [options.pollInterval=15000]   Polling interval in ms. Pass 0 to disable polling.
 * @param {Function} [options.onNewNotifications]   Called with an array of notifications
 *                                                  never seen before (skipped on first load).
 *                                                  Use this for toasts / sounds / etc.
 */
export function useFetchNotifications({
	enabled = true,
	userId = null,
	limit = DEFAULT_LIMIT,
	pollInterval = DEFAULT_POLL_INTERVAL,
	hiddenPollInterval = DEFAULT_HIDDEN_POLL_INTERVAL,
	onNewNotifications,
} = {}) {
	const [notifications, setNotifications] = useState([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [unreadMessageCount, setUnreadMessageCount] = useState(0);
	const [isLoadingState, setIsLoadingState] = useState(enabled);

	const seenIdsRef = useRef(new Set());
	const hasLoadedOnceRef = useRef(false);
	// IDs optimistically removed locally; prevents an in-flight poll
	// from resurrecting them before the server catches up.
	const locallyRemovedIdsRef = useRef(new Set());

	// Keep the latest callback without making it a dependency of the effect,
	// so consumers can pass inline functions without restarting the poll loop.
	const onNewRef = useRef(onNewNotifications);
	useEffect(() => {
		onNewRef.current = onNewNotifications;
	});

	const load = useCallback(
		async (signal) => {
			try {
				const response = await fetch(`/api/community/notifications?limit=${limit}`, {
					cache: "no-store",
					signal,
				});
				if (!response.ok) return;

				const payload = await response.json();
				const fetched = Array.isArray(payload.notifications) ? payload.notifications : [];
				const next = fetched.filter((item) => !locallyRemovedIdsRef.current.has(item.id));

				if (hasLoadedOnceRef.current) {
					const fresh = next.filter((item) => !seenIdsRef.current.has(item.id));
					if (fresh.length > 0 && typeof onNewRef.current === "function") {
						onNewRef.current(fresh);
					}
				}

				next.forEach((item) => seenIdsRef.current.add(item.id));
				hasLoadedOnceRef.current = true;

				setNotifications(next);
				setUnreadCount(typeof payload.unreadCount === "number" ? payload.unreadCount : 0);
				setUnreadMessageCount(
					typeof payload.unreadMessageCount === "number" ? payload.unreadMessageCount : next.filter((item) => item.type === "MESSAGE" && !item.isRead).length,
				);
			} catch (error) {
				if (error?.name === "AbortError") return;
				// Network error: keep whatever we already have on screen.
			} finally {
				setIsLoadingState(false);
			}
		},
		[limit],
	);

	const refresh = useCallback(() => {
		load();
	}, [load]);

	const markAsRead = useCallback(async (notificationId) => {
		// Optimistic update
		let removedUnreadMessage = false;
		locallyRemovedIdsRef.current.add(notificationId);
		setNotifications((prev) => {
			const target = prev.find((n) => n.id === notificationId);
			removedUnreadMessage = Boolean(target && target.type === "MESSAGE" && !target.isRead);
			return prev.filter((n) => n.id !== notificationId);
		});
		setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
		if (removedUnreadMessage) {
			setUnreadMessageCount((prev) => (prev > 0 ? prev - 1 : 0));
		}

		try {
			const response = await fetch("/api/community/notifications", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ notificationId }),
			});
			if (!response.ok) return;
			const payload = await response.json();
			if (typeof payload.unreadCount === "number") {
				setUnreadCount(payload.unreadCount);
			}
		} catch {
			// Keep optimistic UI; the next poll will reconcile.
		}
	}, []);

	const markAllAsRead = useCallback(async () => {
		setNotifications((prev) => {
			prev.forEach((n) => locallyRemovedIdsRef.current.add(n.id));
			return [];
		});
		setUnreadCount(0);
		setUnreadMessageCount(0);

		try {
			const response = await fetch("/api/community/notifications", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ markAll: true }),
			});
			if (!response.ok) return;
			const payload = await response.json();
			if (typeof payload.unreadCount === "number") {
				setUnreadCount(payload.unreadCount);
			}
		} catch {
			// Keep optimistic UI; the next poll will reconcile.
		}
	}, []);

	useEffect(() => {
		if (!enabled) {
			return;
		}

		const controller = new AbortController();
		load(controller.signal);
		let timerId = null;
		let isUnmounted = false;
		let pusherClient = null;
		let pusherChannel = null;

		function scheduleNextPoll() {
			if (isUnmounted || pollInterval <= 0) return;
			const isVisible = document.visibilityState === "visible";
			const nextDelay = isVisible ? pollInterval : hiddenPollInterval;
			timerId = window.setTimeout(async () => {
				if (isUnmounted) return;
				if (navigator.onLine !== false) {
					await load();
				}
				scheduleNextPoll();
			}, nextDelay);
		}

		async function connectRealtimeIfConfigured() {
			if (!userId) return;
			const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
			const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
			if (!key || !cluster) return;

			try {
				const { default: Pusher } = await import("pusher-js");

				pusherClient = new Pusher(key, {
					cluster,
					channelAuthorization: {
						endpoint: "/api/pusher/auth",
					},
				});

				pusherChannel = pusherClient.subscribe(`private-user-${userId}`);
				pusherChannel.bind("community:messages-updated", () => {
					load();
				});
			} catch {
				// Silent fallback: polling still keeps notification state updated.
			}
		}

		scheduleNextPoll();
		connectRealtimeIfConfigured();

		function handleRefresh() {
			load();
		}

		function handleVisibilityChange() {
			if (document.visibilityState === "visible") {
				load();
			}
		}

		window.addEventListener("community-notifications:refresh", handleRefresh);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			isUnmounted = true;
			controller.abort();
			if (timerId) window.clearTimeout(timerId);
			if (pusherChannel) {
				pusherChannel.unbind_all();
			}
			if (pusherClient) {
				pusherClient.disconnect();
			}
			window.removeEventListener("community-notifications:refresh", handleRefresh);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [enabled, hiddenPollInterval, load, pollInterval, userId]);

	return {
		notifications,
		unreadCount,
		unreadMessageCount,
		isLoading: enabled ? isLoadingState : false,
		markAsRead,
		markAllAsRead,
		refresh,
	};
}
