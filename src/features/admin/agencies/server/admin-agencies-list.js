import { prisma } from "@/lib/prisma";

export const ADMIN_AGENCIES_PAGE_SIZE = 12;
export const ADMIN_AGENCIES_SORT_FIELDS = ["name", "status", "members", "city", "createdAt"];

export function parseAdminAgenciesParams(params) {
	const q = typeof params?.q === "string" ? params.q.trim() : "";
	const status = params?.status === "pending" || params?.status === "approved" ? params.status : "all";
	const sort = ADMIN_AGENCIES_SORT_FIELDS.includes(params?.sort) ? params.sort : "createdAt";
	const dir = params?.dir === "asc" || params?.dir === "desc" ? params.dir : "desc";
	const parsedPage = Number(params?.page);
	const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
	return { q, status, sort, dir, page };
}

export function buildAdminAgenciesWhere({ q, status }) {
	return {
		...(status === "pending" ? { approved: false } : status === "approved" ? { approved: true } : {}),
		...(q
			? {
					OR: [
						{ name: { contains: q, mode: "insensitive" } },
						{ city: { contains: q, mode: "insensitive" } },
						{ province: { contains: q, mode: "insensitive" } },
						{ email: { contains: q, mode: "insensitive" } },
						{ slug: { contains: q, mode: "insensitive" } },
					],
				}
			: {}),
	};
}

export function buildAdminAgenciesOrderBy({ sort, dir }) {
	return sort === "name"
		? [{ name: dir }, { createdAt: "desc" }]
		: sort === "status"
			? [{ approved: dir }, { createdAt: "desc" }]
			: sort === "members"
				? [{ members: { _count: dir } }, { createdAt: "desc" }]
				: sort === "city"
					? [{ city: dir }, { createdAt: "desc" }]
					: [{ createdAt: dir }];
}

function serializeAgency(agency) {
	return {
		id: agency.id,
		name: agency.name,
		logoUrl: agency.logoUrl,
		city: agency.city,
		province: agency.province,
		approved: agency.approved,
		createdAt: agency.createdAt.toISOString(),
		_count: agency._count,
	};
}

export async function getAdminAgenciesPage(rawParams) {
	const params = parseAdminAgenciesParams(rawParams);
	const where = buildAdminAgenciesWhere(params);
	const orderBy = buildAdminAgenciesOrderBy(params);
	const [agencies, filteredCount] = await Promise.all([
		prisma.agency.findMany({
			where,
			orderBy,
			skip: (params.page - 1) * ADMIN_AGENCIES_PAGE_SIZE,
			take: ADMIN_AGENCIES_PAGE_SIZE,
			include: {
				_count: { select: { members: true } },
			},
		}),
		prisma.agency.count({ where }),
	]);

	const totalPages = Math.max(1, Math.ceil(filteredCount / ADMIN_AGENCIES_PAGE_SIZE));
	const safePage = Math.min(params.page, totalPages);
	return {
		items: agencies.map(serializeAgency),
		filteredCount,
		page: safePage,
		hasMore: safePage < totalPages,
		params,
	};
}
