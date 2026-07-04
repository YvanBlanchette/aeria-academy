import { auth } from "@/auth";
import { CourseForm } from "@/components/admin/course-form";

const metadata = {
	title: "Création d'un Nouveau Cours",
	subtitle: "",
};

export default async function NewCoursePage() {
	const session = await auth();

	return (
		<div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-neutral-100">
			<div className="rounded-xl shadow-sm">
				<CourseForm />
			</div>
		</div>
	);
}
