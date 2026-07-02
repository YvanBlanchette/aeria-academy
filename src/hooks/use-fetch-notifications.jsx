"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_LIMIT = 8;
const DEFAULT_POLL_INTERVAL = 15000;

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
export function useFetchNotifications({ enabled = true, limit = DEFAULT_LIMIT, pollInterval = DEFAULT_POLL_INTERVAL, onNewNotifications } = {}) {
	const [notifications, setNotifications] = useState([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [isLoading, setIsLoading] = useState(true);

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
			} catch (error) {
				if (error?.name === "AbortError") return;
				// Network error: keep whatever we already have on screen.
			} finally {
				setIsLoading(false);
			}
		},
		[limit],
	);

	const refresh = useCallback(() => {
		load();
	}, [load]);

	const markAsRead = useCallback(async (notificationId) => {
		// Optimistic update
		locallyRemovedIdsRef.current.add(notificationId);
		setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
		setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));

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
			setIsLoading(false);
			return;
		}

		const controller = new AbortController();
		load(controller.signal);

		let intervalId;
		if (pollInterval > 0) {
			intervalId = window.setInterval(() => load(), pollInterval);
		}

		function handleRefresh() {
			load();
		}
		window.addEventListener("community-notifications:refresh", handleRefresh);

		return () => {
			controller.abort();
			if (intervalId) window.clearInterval(intervalId);
			window.removeEventListener("community-notifications:refresh", handleRefresh);
		};
	}, [enabled, load, pollInterval]);

	return {
		notifications,
		unreadCount,
		isLoading,
		markAsRead,
		markAllAsRead,
		refresh,
	};
}
