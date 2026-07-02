import Link from "next/link";
import { ArrowRight } from "lucide-react";
import net from "node:net";

import { CourseCard } from "@/components/users/course-card";
import { dict } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

let localDbReachableCache;

async function isLocalDbReachable() {
	if (typeof localDbReachableCache === "boolean") return localDbReachableCache;

	const url = process.env.DATABASE_URL || "";
	if (!url.includes("localhost:5432")) {
		localDbReachableCache = true;
		return true;
	}

	localDbReachableCache = await new Promise((resolve) => {
		const socket = new net.Socket();
		const finish = (reachable) => {
			socket.destroy();
			resolve(reachable);
		};

		socket.setTimeout(120);
		socket.once("connect", () => finish(true));
		socket.once("timeout", () => finish(false));
		socket.once("error", () => finish(false));
		socket.connect(5432, "127.0.0.1");
	});

	return localDbReachableCache;
}

function isConnectionRefused(error) {
	const code = typeof error?.code === "string" ? error.code : "";
	const message = typeof error?.message === "string" ? error.message : "";
	return code === "ECONNREFUSED" || message.includes("ECONNREFUSED");
}

async function getFeaturedCourses() {
	if (!(await isLocalDbReachable())) {
		return [];
	}

	try {
		// Primary query for environments where the latest schema is applied.
		return await prisma.course.findMany({
			where: { published: true },
			take: 3,
			orderBy: { createdAt: "desc" },
			include: {
				_count: { select: { modules: true, enrollments: true } },
			},
		});
	} catch (error) {
		if (isConnectionRefused(error)) {
			// DB offline in local dev: keep homepage alive without featured cards.
			return [];
		}
		console.warn("[featured-courses] primary query failed, using fallback:", error?.message || "unknown error");

		try {
			// Fallback for local databases that are behind on schema migrations.
			return await prisma.course.findMany({
				take: 3,
				orderBy: { updatedAt: "desc" },
				include: {
					_count: { select: { modules: true, enrollments: true } },
				},
			});
		} catch (fallbackError) {
			if (!isConnectionRefused(fallbackError)) {
				console.warn("[featured-courses] fallback query failed:", fallbackError?.message || "unknown error");
			}
			return [];
		}
	}
}

export default async function FeaturedCourses({ locale = "fr" }) {
	// Load the featured courses once on the server before rendering the section.
	const featuredCourses = await getFeaturedCourses();
	const t = dict[locale]?.articles ?? dict.fr?.articles;

	// Avoid rendering an empty section when there are no published courses.
	if (featuredCourses.length === 0) {
		return null;
	}

	return (
		<section className="mx-auto max-w-7xl space-y-6 px-4 py-8 pb-12 sm:px-6 sm:py-12 lg:px-8">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div className="flex flex-col space-y-2">
					<p className="text-xs font-semibold uppercase tracking-[0.3em] text-yellow-600">{t?.sectionLabel ?? "Academy Lessons"}</p>
					<h2 className="font-display text-3xl font-bold sm:text-4xl lg:text-5xl">{t?.sectionTitle ?? "Latest Lessons"}</h2>
					<span className="h-0.5 w-36 bg-linear-to-r from-yellow-600 via-yellow-400 to-yellow-800" />
				</div>

				{/* Give users a quick path to the full catalog. */}
				<Link
					href="/courses"
					className="flex items-center self-start text-sm text-primary transition-colors hover:underline"
				>
					{t?.viewAll ?? "View All Lessons"}
					<ArrowRight className="ml-2 h-4 w-4" />
				</Link>
			</header>

			{/* Render the featured cards in a responsive grid. */}
			<div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
				{featuredCourses.map((course) => (
					<CourseCard
						key={course.id}
						course={course}
					/>
				))}
			</div>
		</section>
	);
}
