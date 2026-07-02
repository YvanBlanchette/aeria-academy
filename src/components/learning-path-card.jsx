"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";

const LearningPathCard = ({ program, locale }) => {
	const videoRef = useRef(null);

	if (!program?.slug) return null;

	const handleMouseEnter = () => {
		const video = videoRef.current;
		if (!video) return;
		video.currentTime = 0;
		video.play().catch(() => {});
	};

	const handleMouseLeave = () => {
		const video = videoRef.current;
		if (!video) return;
		video.pause();
		video.currentTime = 0;
	};

	return (
		<Link
			href={`/learning-paths/${program.slug}`}
			className="group block h-full overflow-hidden rounded-xl border bg-white shadow-md transition-shadow hover:border-yellow-600/50 hover:shadow-lg"
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<div className="w-full h-auto relative overflow-hidden aspect-video">
				{program.img && (
					<Image
						src={program.img}
						alt={program.titleLong || ""}
						width={400}
						height={200}
						className="object-cover h-full w-full absolute inset-0 transition-opacity duration-300 group-hover:opacity-0"
					/>
				)}
				{program.video && (
					<video
						ref={videoRef}
						src={program.video}
						poster={program.img}
						muted
						loop
						playsInline
						preload="metadata"
						className="object-cover h-full w-full absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					/>
				)}
			</div>
			<div className="flex h-full flex-col px-6 pb-6 pt-4">
				<h3 className="font-display text-2xl font-bold sm:text-3xl">{program.titleLong}</h3>
				<h4 className="mt-2 text-sm text-gray-600">{program.subtitle}</h4>
				{program.learn && (
					<div className="mt-3">
						<p className="text-sm font-medium text-gray-700">{program.learnTitle}</p>
						<ul className="list-disc list-inside mt-2">
							{program.learn.map((item, index) => (
								<li
									key={index}
									className="text-gray-700 text-xs leading-relaxed"
								>
									{item}
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</Link>
	);
};

export default LearningPathCard;
