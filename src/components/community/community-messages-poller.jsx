"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const VISIBLE_POLL_MS = 30000;
const HIDDEN_POLL_MS = 120000;

function isTypingInField() {
	const activeElement = document.activeElement;
	if (!activeElement) return false;
	if (activeElement instanceof HTMLInputElement) return true;
	if (activeElement instanceof HTMLTextAreaElement) return true;
	return Boolean(activeElement.isContentEditable);
}

export function CommunityMessagesPoller({ userId }) {
	const router = useRouter();
	const isRefreshingRef = useRef(false);

	useEffect(() => {
		let timerId = null;
		let isUnmounted = false;
		let pusherClient = null;
		let pusherChannel = null;

		// Trigger an immediate notification refresh when poller mounts.
		window.dispatchEvent(new Event("community-notifications:refresh"));

		function refreshNow() {
			if (isRefreshingRef.current) return;
			isRefreshingRef.current = true;
			router.refresh();
			window.dispatchEvent(new Event("community-notifications:refresh"));
			window.setTimeout(() => {
				isRefreshingRef.current = false;
			}, 1200);
		}

		async function tick() {
			if (isUnmounted) return;

			const isVisible = document.visibilityState === "visible";
			const canRefresh = isVisible && !isTypingInField() && navigator.onLine !== false;

			if (canRefresh) {
				// In-house real-time strategy: periodic refresh without third-party sockets.
				refreshNow();
			}

			timerId = window.setTimeout(tick, isVisible ? VISIBLE_POLL_MS : HIDDEN_POLL_MS);
		}

		function onVisibilityChange() {
			// Refresh once when tab becomes visible again.
			if (document.visibilityState === "visible" && !isTypingInField()) {
				refreshNow();
			}
		}

		function onManualRefreshSignal() {
			refreshNow();
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
					refreshNow();
				});
			} catch {
				// Silent fallback: poller still keeps conversations fresh if realtime fails.
			}
		}

		timerId = window.setTimeout(tick, VISIBLE_POLL_MS);
		document.addEventListener("visibilitychange", onVisibilityChange);
		window.addEventListener("community-messages:refresh-now", onManualRefreshSignal);
		connectRealtimeIfConfigured();

		return () => {
			isUnmounted = true;
			document.removeEventListener("visibilitychange", onVisibilityChange);
			window.removeEventListener("community-messages:refresh-now", onManualRefreshSignal);
			if (pusherChannel) {
				pusherChannel.unbind_all();
			}
			if (pusherClient) {
				pusherClient.disconnect();
			}
			if (timerId) {
				window.clearTimeout(timerId);
			}
		};
	}, [router, userId]);

	return null;
}
