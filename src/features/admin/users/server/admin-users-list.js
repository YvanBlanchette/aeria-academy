import { prisma } from "@/lib/prisma";

export const ADMIN_USERS_PAGE_SIZE = 15;
export const ADMIN_USER_SORT_FIELDS = ["name", "email", "role", "membership", "emailVerified", "createdAt"];

export function parseAdminUsersParams(params) {
	const q = typeof params?.q === "string" ? params.q.trim() : "";
	const role = ["STUDENT", "INSTRUCTOR", "ADMIN"].includes(params?.role) ? params.role : "all";
	const membership = ["FREE", "ACADEMY", "PRIME"].includes(params?.membership) ? params.membership : "all";
	const verified = params?.verified === "yes" || params?.verified === "no" ? params.verified : "all";
	const sort = ADMIN_USER_SORT_FIELDS.includes(params?.sort) ? params.sort : "createdAt";
	const dir = params?.dir === "asc" || params?.dir === "desc" ? params.dir : "desc";
	const rawPage = Number(params?.page);
	const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
	return { q, role, membership, verified, sort, dir, page };
}

export function buildAdminUsersWhere({ q, role, membership, verified }) {
	return {
		...(role !== "all" ? { role } : {}),
		...(membership !== "all" ? { membership } : {}),
		...(verified === "yes" ? { emailVerified: { not: null } } : verified === "no" ? { emailVerified: null } : {}),
		...(q
			? {
					OR: [
						{ name: { contains: q, mode: "insensitive" } },
						{ email: { contains: q, mode: "insensitive" } },
						{ username: { contains: q, mode: "insensitive" } },
					],
				}
			: {}),
	};
}

export function buildAdminUsersOrderBy({ sort, dir }) {
	return sort === "name"
		? [{ name: dir }, { createdAt: "desc" }]
		: sort === "email"
			? [{ email: dir }, { createdAt: "desc" }]
			: sort === "role"
				? [{ role: dir }, { createdAt: "desc" }]
				: sort === "membership"
					? [{ membership: dir }, { createdAt: "desc" }]
					: sort === "emailVerified"
						? [{ emailVerified: dir }, { createdAt: "desc" }]
						: [{ createdAt: dir }];
}

function serializeUser(user) {
	return {
		id: user.id,
		name: user.name,
		username: user.username,
		email: user.email,
		role: user.role,
		membership: user.membership,
		emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
		createdAt: user.createdAt.toISOString(),
		_count: user._count,
	};
}

export async function getAdminUsersPage(rawParams) {
	const params = parseAdminUsersParams(rawParams);
	const where = buildAdminUsersWhere(params);
	const orderBy = buildAdminUsersOrderBy(params);
	const [users, filteredCount] = await Promise.all([
		prisma.user.findMany({
			where,
			orderBy,
			skip: (params.page - 1) * ADMIN_USERS_PAGE_SIZE,
			take: ADMIN_USERS_PAGE_SIZE,
			include: {
				_count: {
					select: {
						enrollments: true,
						progress: true,
						quizAttempts: true,
						certificates: true,
					},
				},
			},
		}),
		prisma.user.count({ where }),
	]);

	const totalPages = Math.max(1, Math.ceil(filteredCount / ADMIN_USERS_PAGE_SIZE));
	const safePage = Math.min(params.page, totalPages);
	return {
		items: users.map(serializeUser),
		filteredCount,
		page: safePage,
		hasMore: safePage < totalPages,
		pageStart: filteredCount === 0 ? 0 : (safePage - 1) * ADMIN_USERS_PAGE_SIZE + 1,
		pageEnd: Math.min(safePage * ADMIN_USERS_PAGE_SIZE, filteredCount),
		params,
	};
}
