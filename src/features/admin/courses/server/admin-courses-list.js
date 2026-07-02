import { prisma } from "@/lib/prisma";

export const ADMIN_COURSES_PAGE_SIZE = 12;
export const ADMIN_COURSES_SORT_FIELDS = ["title", "status", "type", "price", "modules", "enrollments", "createdAt"];

export function parseAdminCoursesParams(params) {
	const q = typeof params?.q === "string" ? params.q.trim() : "";
	const status = params?.status === "published" || params?.status === "draft" ? params.status : "all";
	const pricing = params?.pricing === "free" || params?.pricing === "paid" ? params.pricing : "all";
	const sort = ADMIN_COURSES_SORT_FIELDS.includes(params?.sort) ? params.sort : "createdAt";
	const dir = params?.dir === "asc" || params?.dir === "desc" ? params.dir : "desc";
	const parsedPage = Number(params?.page);
	const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
	return { q, status, pricing, sort, dir, page };
}

export function buildAdminCoursesWhere({ q, status, pricing }) {
	return {
		...(status === "published" ? { published: true } : status === "draft" ? { published: false } : {}),
		...(pricing === "free" ? { price: 0 } : pricing === "paid" ? { price: { gt: 0 } } : {}),
		...(q
			? {
					OR: [
						{ title: { contains: q, mode: "insensitive" } },
						{ description: { contains: q, mode: "insensitive" } },
						{ slug: { contains: q, mode: "insensitive" } },
					],
				}
			: {}),
	};
}

export function buildAdminCoursesOrderBy({ sort, dir }) {
	return sort === "title"
		? [{ title: dir }, { createdAt: "desc" }]
		: sort === "status"
			? [{ published: dir }, { createdAt: "desc" }]
			: sort === "type"
				? [{ price: dir }, { createdAt: "desc" }]
				: sort === "price"
					? [{ price: dir }, { createdAt: "desc" }]
					: sort === "modules"
						? [{ modules: { _count: dir } }, { createdAt: "desc" }]
						: sort === "enrollments"
							? [{ enrollments: { _count: dir } }, { createdAt: "desc" }]
							: [{ createdAt: dir }];
}

function serializeCourse(course) {
	return {
		id: course.id,
		title: course.title,
		description: course.description,
		price: course.price,
		published: course.published,
		createdAt: course.createdAt.toISOString(),
		_count: course._count,
	};
}

export async function getAdminCoursesPage(rawParams) {
	const params = parseAdminCoursesParams(rawParams);
	const where = buildAdminCoursesWhere(params);
	const orderBy = buildAdminCoursesOrderBy(params);
	const [courses, filteredCount] = await Promise.all([
		prisma.course.findMany({
			where,
			orderBy,
			skip: (params.page - 1) * ADMIN_COURSES_PAGE_SIZE,
			take: ADMIN_COURSES_PAGE_SIZE,
			include: {
				_count: { select: { modules: true, enrollments: true } },
			},
		}),
		prisma.course.count({ where }),
	]);

	const totalPages = Math.max(1, Math.ceil(filteredCount / ADMIN_COURSES_PAGE_SIZE));
	const safePage = Math.min(params.page, totalPages);
	return {
		items: courses.map(serializeCourse),
		filteredCount,
		page: safePage,
		hasMore: safePage < totalPages,
		params,
	};
}
