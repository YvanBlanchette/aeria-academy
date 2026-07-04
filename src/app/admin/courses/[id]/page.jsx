import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseForm } from "@/components/admin/course-form";
import { ModuleManager } from "@/components/admin/module-manager";
import { auth } from "@/auth";

export default async function EditCoursePage({ params }) {
	const session = await auth();
	const { id } = await params;

	const course = await prisma.course.findUnique({
		where: { id },
		include: {
			modules: {
				orderBy: { order: "asc" },
				include: {
					_count: { select: { lessons: true } },
					quiz: { select: { id: true } },
				},
			},
		},
	});

	const metadata = {
		title: course.title,
		subtitle: "Gérez les cours de l'Académie",
		btnLabel: "← Retour aux cours",
		btnLink: "/admin/courses",
	};

	if (!course) notFound();

	return (
		<div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-neutral-100">
			<div className="flex justify-between gap-8 h-full rounded-xl shadow-sm">
				<CourseForm course={course} />

				<ModuleManager course={course} />
			</div>
		</div>
	);
}
