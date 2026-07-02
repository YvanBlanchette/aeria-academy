"use client";

import LearningPathCard from "@/components/learning-path-card";
import { dict } from "@/lib/i18n";

export default function LearningPaths({ locale }) {
	// Read the translated section copy once so the markup stays readable.
	const t = dict[locale]?.learningPaths;
	const programs = dict[locale]?.programs;

	if (!t || !programs) return null;

	return (
		<section
			id="learning-paths"
			className="bg-gray-50 py-16 sm:py-24 lg:py-28"
		>
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				{/* Intro content for the section. */}
				<div className="mb-12 max-w-3xl">
					<p className="eyebrow mb-3">{t.sectionLabel}</p>
					<h1 className="font-display text-4xl font-medium sm:text-5xl">{t.title}</h1>
				</div>

				<h2 className="mb-3 text-2xl">{t.subtitle}</h2>

				{/* Paragraphs are rendered from the locale dictionary for easy copy updates. */}
				<div>
					{t.paragraphs.map((p, i) => (
						<p
							key={i}
							className="mb-2 leading-relaxed text-stone-700"
						>
							{p}
						</p>
					))}
				</div>

				{/* Program cards are displayed in a responsive grid for different screen sizes. */}
				<div className="mt-8 grid w-full grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
					{programs.map((program) => (
						<LearningPathCard
							key={program.id}
							program={program}
							locale={locale}
						/>
					))}
				</div>
			</div>
		</section>
	);
}
