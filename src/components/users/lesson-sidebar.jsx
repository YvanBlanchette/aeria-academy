"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, Circle, Video, Headphones, FileText, FileType, ListChecks, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Button } from "../ui/button";

const typeIcons = { VIDEO: Video, AUDIO: Headphones, TEXT: FileText, PDF: FileType };

function formatModuleTitle(title) {
	if (!title) return "";

	// Retire le prefixe "Module" pour gagner de la place dans le sidebar mobile.
	return title.replace(/^\s*module\s*/i, "").trim() || title;
}

export function LessonSidebar({ course, completedSet }) {
	const params = useParams();
	const currentLessonId = params.lessonId;
	const completed = new Set(completedSet);

	return (
		<>
			{/* LESSONS NAV */}
			<nav className="flex-1 overflow-auto">
				<div className="border-b px-4 py-4 mb-2">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground text-center">Liste des lecons</p>
				</div>
				{course.modules.map((mod, idx) => (
					<div
						key={mod.id}
						className="space-y-1"
					>
						<Collapsible className="rounded-none data-[state=open]:bg-muted">
							<CollapsibleTrigger asChild>
								<Button
									variant="ghost"
									className="group w-full flex justify-start items-center rounded-none py-6"
								>
									<ChevronDownIcon className="group-data-[state=open]:rotate-180 h-2 w-2" />
									<p className="py-1 text-[12px] font-semibold uppercase text-muted-foreground">{formatModuleTitle(mod.title)}</p>
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent className="flex w-full flex-col justify-start items-stretch gap-2 pt-0 text-sm">
								<ul className="w-full space-y-0.5">
									{mod.lessons.map((lesson) => {
										const Icon = typeIcons[lesson.type];
										const isActive = lesson.id === currentLessonId;
										const isDone = completed.has(lesson.id);
										return (
											<li
												key={lesson.id}
												className="w-full"
											>
												<Link
													href={`/learn/${course.id}/${lesson.id}`}
													className={cn(
														"flex w-full items-center gap-2 rounded-none px-3 py-2 text-sm transition-colors",
														isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted",
													)}
												>
													{isDone ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" /> : <Circle className="h-4 w-4 shrink-0 text-neutral-400" />}
													<Icon className="h-3.5 w-3.5 shrink-0" />
													<span className="line-clamp-2 flex-1">{lesson.title}</span>
												</Link>
											</li>
										);
									})}
									{mod.quiz && (
										<li className="w-full">
											<Link
												href={`/learn/${course.id}/quiz/${mod.quiz.id}`}
												className={cn("flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors", "hover:bg-muted")}
											>
												<ListChecks className="h-4 w-4 shrink-0 ml-6" />
												<span className="line-clamp-2 flex-1">Test du module</span>
											</Link>
										</li>
									)}
								</ul>
							</CollapsibleContent>
						</Collapsible>
					</div>
				))}
			</nav>
		</>
	);
}
