"use client";

import { useEffect, useRef } from "react";

export function CommunityMessagesAutoScroll({ containerId, conversationId, messageCount }) {
	const shouldStickToBottomRef = useRef(true);

	useEffect(() => {
		const container = document.getElementById(containerId);
		if (!container) return;
		const STICK_THRESHOLD_PX = 120;

		function isNearBottom() {
			const distanceToBottom = container.scrollHeight - container.clientHeight - container.scrollTop;
			return distanceToBottom <= STICK_THRESHOLD_PX;
		}

		function scrollToBottom({ force = false } = {}) {
			if (!force && !shouldStickToBottomRef.current) return;
			container.scrollTop = container.scrollHeight;
		}

		function onScroll() {
			// As soon as the user intentionally scrolls up, pause auto-stick behavior.
			shouldStickToBottomRef.current = isNearBottom();
		}

		// When a thread is opened/reloaded, jump to the latest message.
		scrollToBottom({ force: true });
		const rafId = window.requestAnimationFrame(() => scrollToBottom({ force: true }));

		// For new messages rendered by refresh/reactions, keep bottom lock only if user stayed near bottom.
		const mutationObserver = new MutationObserver(() => scrollToBottom());
		mutationObserver.observe(container, {
			childList: true,
			subtree: true,
		});

		// Preserve stickiness when media resolves and changes the layout height.
		const resizeObserver = new ResizeObserver(() => scrollToBottom());
		resizeObserver.observe(container);

		const onImageLoad = (event) => {
			if (event?.target?.tagName === "IMG") {
				scrollToBottom();
			}
		};

		container.addEventListener("scroll", onScroll, { passive: true });
		container.addEventListener("load", onImageLoad, true);

		return () => {
			window.cancelAnimationFrame(rafId);
			mutationObserver.disconnect();
			resizeObserver.disconnect();
			container.removeEventListener("scroll", onScroll);
			container.removeEventListener("load", onImageLoad, true);
		};
	}, [containerId, conversationId, messageCount]);

	return null;
}
