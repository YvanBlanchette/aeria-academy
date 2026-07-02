"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

function readSnapshot({ storageKey, initialItems, initialPage, initialHasMore }) {
	if (typeof window === "undefined" || !storageKey) {
		return {
			items: initialItems,
			page: initialPage,
			hasMore: initialHasMore,
			scrollY: 0,
		};
	}

	try {
		const raw = window.sessionStorage.getItem(storageKey);
		if (!raw) {
			return {
				items: initialItems,
				page: initialPage,
				hasMore: initialHasMore,
				scrollY: 0,
			};
		}

		const parsed = JSON.parse(raw);
		return {
			items: Array.isArray(parsed?.items) && parsed.items.length > 0 ? parsed.items : initialItems,
			page: typeof parsed?.page === "number" && parsed.page > 0 ? parsed.page : initialPage,
			hasMore: typeof parsed?.hasMore === "boolean" ? parsed.hasMore : initialHasMore,
			scrollY: typeof parsed?.scrollY === "number" && parsed.scrollY > 0 ? parsed.scrollY : 0,
		};
	} catch {
		return {
			items: initialItems,
			page: initialPage,
			hasMore: initialHasMore,
			scrollY: 0,
		};
	}
}

function persistSnapshot(storageKey, snapshot) {
	if (typeof window === "undefined" || !storageKey) return;
	window.sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
}

export function useInfiniteAdminList({ endpoint, queryString, storageKey, initialItems, initialPage = 1, initialHasMore = false }) {
	const initialSnapshot = readSnapshot({
		storageKey,
		initialItems,
		initialPage,
		initialHasMore,
	});
	const sentinelRef = useRef(null);
	const scrollYRef = useRef(initialSnapshot.scrollY);
	const [listState, setListState] = useState(() => ({
		items: initialSnapshot.items,
		page: initialSnapshot.page,
		hasMore: initialSnapshot.hasMore,
	}));
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const { items, page, hasMore } = listState;

	const loadMore = useEffectEvent(async () => {
		if (isLoading || !hasMore) return;
		setIsLoading(true);
		setError("");

		const nextPage = page + 1;
		const url = queryString ? `${endpoint}?${queryString}&page=${nextPage}` : `${endpoint}?page=${nextPage}`;

		try {
			const response = await fetch(url, { cache: "no-store" });
			if (!response.ok) {
				throw new Error(`Request failed with status ${response.status}`);
			}

			const payload = await response.json();
			const nextItems = Array.isArray(payload.items) ? payload.items : [];
			setListState((current) => ({
				items: [...current.items, ...nextItems],
				page: typeof payload.page === "number" ? payload.page : nextPage,
				hasMore: Boolean(payload.hasMore),
			}));
		} catch (loadError) {
			setError(loadError instanceof Error ? loadError.message : "Impossible de charger plus d'éléments.");
		} finally {
			setIsLoading(false);
		}
	});

	useEffect(() => {
		persistSnapshot(storageKey, {
			items,
			page,
			hasMore,
			scrollY: scrollYRef.current,
		});
	}, [storageKey, items, page, hasMore]);

	const initialScrollY = initialSnapshot.scrollY;

	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleScroll = () => {
			scrollYRef.current = window.scrollY;
		};

		const handlePageHide = () => {
			persistSnapshot(storageKey, {
				items,
				page,
				hasMore,
				scrollY: scrollYRef.current,
			});
		};

		handleScroll();
		window.addEventListener("scroll", handleScroll, { passive: true });
		window.addEventListener("pagehide", handlePageHide);

		return () => {
			handleScroll();
			handlePageHide();
			window.removeEventListener("scroll", handleScroll);
			window.removeEventListener("pagehide", handlePageHide);
		};
	}, [storageKey, items, page, hasMore]);

	useEffect(() => {
		if (initialScrollY <= 0 || typeof window === "undefined") return;
		const frame = window.requestAnimationFrame(() => {
			window.scrollTo({ top: initialScrollY, behavior: "auto" });
		});
		return () => window.cancelAnimationFrame(frame);
	}, [initialScrollY]);

	useEffect(() => {
		const node = sentinelRef.current;
		if (!node || !hasMore) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					loadMore();
				}
			},
			{ rootMargin: "320px 0px" },
		);

		observer.observe(node);
		return () => observer.disconnect();
	}, [hasMore]);

	return {
		items,
		hasMore,
		isLoading,
		error,
		sentinelRef,
	};
}
