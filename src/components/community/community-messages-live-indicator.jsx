"use client";

import { useEffect, useState } from "react";

function getInitialState() {
	// Guard SSR: browser-only APIs are unavailable on the server render pass.
	if (typeof window === "undefined") {
		return { isOnline: true, isVisible: true };
	}

	return {
		isOnline: navigator.onLine !== false,
		isVisible: document.visibilityState === "visible",
	};
}

export function CommunityMessagesLiveIndicator() {
	const [state, setState] = useState(getInitialState);

	useEffect(() => {
		function syncStatus() {
			setState({
				isOnline: navigator.onLine !== false,
				isVisible: document.visibilityState === "visible",
			});
		}

		syncStatus();
		window.addEventListener("online", syncStatus);
		window.addEventListener("offline", syncStatus);
		document.addEventListener("visibilitychange", syncStatus);

		return () => {
			window.removeEventListener("online", syncStatus);
			window.removeEventListener("offline", syncStatus);
			document.removeEventListener("visibilitychange", syncStatus);
		};
	}, []);

	const isLive = state.isOnline && state.isVisible;
	// Labels intentionally stay short to avoid header jitter on smaller breakpoints.
	const label = !state.isOnline ? "Hors ligne" : !state.isVisible ? "Pause" : "En direct";
	const helper = !state.isOnline ? "Reprise auto" : !state.isVisible ? "Connection lente" : "";
	const dotClass = !state.isOnline ? "bg-destructive" : !state.isVisible ? "bg-amber-500" : "bg-emerald-500 animate-pulse";

	return (
		/* LIVE STATUS CHIP */
		<div
			className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground"
			title={helper}
		>
			<span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
			<span className="font-medium text-foreground/85">{label}</span>
			<span className="hidden sm:inline">{helper}</span>
			{isLive ? null : <span className="hidden md:inline">•</span>}
		</div>
	);
}
