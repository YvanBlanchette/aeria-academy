import { prisma } from "@/lib/prisma";

export const ADMIN_ARTICLES_PAGE_SIZE = 12;
export const ADMIN_ARTICLES_SORT_FIELDS = ["title", "status", "tier", "updatedAt", "publishedAt", "viewCount"];

export function parseAdminArticlesParams(params) {
	const q = typeof params?.q === "string" ? params.q.trim() : "";
	const status = params?.status === "published" || params?.status === "draft" ? params.status : "all";
	const tier = ["FREE", "ACADEMY", "PRIME"].includes(params?.tier) ? params.tier : "all";
	const tag = typeof params?.tag === "string" ? params.tag.trim().toLowerCase() : "";
	const sort = ADMIN_ARTICLES_SORT_FIELDS.includes(params?.sort) ? params.sort : "updatedAt";
	const dir = params?.dir === "asc" || params?.dir === "desc" ? params.dir : "desc";
	const rawPage = Number(params?.page);
	const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
	return { q, status, tier, tag, sort, dir, page };
}

export function buildAdminArticlesWhere({ q, status, tier, tag }) {
	return {
		...(status === "draft" ? { published: false } : status === "published" ? { published: true } : {}),
		...(tier !== "all" ? { requiredTier: tier } : {}),
		...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
		...(q
			? {
					OR: [
						{ title: { contains: q, mode: "insensitive" } },
						{ slug: { contains: q, mode: "insensitive" } },
						{ excerpt: { contains: q, mode: "insensitive" } },
						{ content: { contains: q, mode: "insensitive" } },
						{ author: { name: { contains: q, mode: "insensitive" } } },
					],
				}
			: {}),
	};
}

export function buildAdminArticlesOrderBy({ sort, dir }) {
	return sort === "title"
		? [{ title: dir }, { updatedAt: "desc" }]
		: sort === "status"
			? [{ published: dir }, { updatedAt: "desc" }]
			: sort === "tier"
				? [{ requiredTier: dir }, { updatedAt: "desc" }]
				: sort === "publishedAt"
					? [{ publishedAt: dir }, { updatedAt: "desc" }]
					: sort === "viewCount"
						? [{ viewCount: dir }, { updatedAt: "desc" }]
						: [{ updatedAt: dir }];
}

function serializeArticle(article) {
	return {
		id: article.id,
		title: article.title,
		slug: article.slug,
		published: article.published,
		requiredTier: article.requiredTier,
		viewCount: article.viewCount,
		updatedAt: article.updatedAt.toISOString(),
		author: article.author,
		tags: article.tags.map(({ tag: item }) => ({ tag: item })),
	};
}

export async function getAdminArticlesPage(rawParams) {
	const params = parseAdminArticlesParams(rawParams);
	const where = buildAdminArticlesWhere(params);
	const orderBy = buildAdminArticlesOrderBy(params);
	const [articles, filteredCount] = await Promise.all([
		prisma.article.findMany({
			where,
			include: {
				author: { select: { name: true, email: true } },
				tags: { include: { tag: true } },
			},
			orderBy,
			skip: (params.page - 1) * ADMIN_ARTICLES_PAGE_SIZE,
			take: ADMIN_ARTICLES_PAGE_SIZE,
		}),
		prisma.article.count({ where }),
	]);

	const totalPages = Math.max(1, Math.ceil(filteredCount / ADMIN_ARTICLES_PAGE_SIZE));
	const safePage = Math.min(params.page, totalPages);
	return {
		items: articles.map(serializeArticle),
		filteredCount,
		page: safePage,
		hasMore: safePage < totalPages,
		params,
	};
}
