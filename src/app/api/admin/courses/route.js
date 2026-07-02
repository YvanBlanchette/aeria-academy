import { auth } from "@/auth";
import { getAdminCoursesPage } from "@/features/admin/courses/server/admin-courses-list";

export async function GET(request) {
	const session = await auth();
	if (!session || session.user.role !== "ADMIN") {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { searchParams } = new URL(request.url);
	const payload = await getAdminCoursesPage(Object.fromEntries(searchParams.entries()));
	return Response.json(payload);
}
