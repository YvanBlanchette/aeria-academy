"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const VISIBLE_POLL_MS = 5000;
const HIDDEN_POLL_MS = 20000;

function isTypingInField() {
	const activeElement = document.activeElement;
	if (!activeElement) return false;
	if (activeElement instanceof HTMLInputElement) return true;
	if (activeElement instanceof HTMLTextAreaElement) return true;
	return Boolean(activeElement.isContentEditable);
}

export function CommunityMessagesPoller() {
	const router = useRouter();
	const isRefreshingRef = useRef(false);

	useEffect(() => {
		let timerId = null;
		let isUnmounted = false;

		window.dispatchEvent(new Event("community-notifications:refresh"));

		async function tick() {
			if (isUnmounted) return;

			const isVisible = document.visibilityState === "visible";
			const canRefresh = isVisible && !isTypingInField() && navigator.onLine !== false;

			if (canRefresh && !isRefreshingRef.current) {
				isRefreshingRef.current = true;
				router.refresh();
				window.dispatchEvent(new Event("community-notifications:refresh"));
				window.setTimeout(() => {
					isRefreshingRef.current = false;
				}, 1200);
			}

			timerId = window.setTimeout(tick, isVisible ? VISIBLE_POLL_MS : HIDDEN_POLL_MS);
		}

		function onVisibilityChange() {
			if (document.visibilityState === "visible" && !isTypingInField()) {
				router.refresh();
				window.dispatchEvent(new Event("community-notifications:refresh"));
			}
		}

		timerId = window.setTimeout(tick, VISIBLE_POLL_MS);
		document.addEventListener("visibilitychange", onVisibilityChange);

		return () => {
			isUnmounted = true;
			document.removeEventListener("visibilitychange", onVisibilityChange);
			if (timerId) {
				window.clearTimeout(timerId);
			}
		};
	}, [router]);

	return null;
}
