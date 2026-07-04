"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { triggerCommunityRealtimeUpdate } from "@/lib/pusher-server";
import { canModerateCommunityContent, requireCommunityUser } from "@/features/community/server/community-guards";
import { uploadCommunityPostImageFile, uploadCommunityStoryImageFile } from "@/features/community/server/community-media-upload";

const createPostSchema = z.object({
	content: z.string().trim().min(3, "Le message est trop court").max(4000, "Message trop long"),
	imageUrl: z.string().trim().optional(),
});

const createStorySchema = z
	.object({
		content: z.string().trim().max(500, "Story trop longue").optional().or(z.literal("")),
		imageUrl: z.string().trim().optional(),
	})
	.refine((data) => Boolean((data.content || "").trim()) || Boolean((data.imageUrl || "").trim()), {
		message: "Ajoute du texte ou une image",
		path: ["content"],
	});

const createCommentSchema = z.object({
	postId: z.string().cuid("Post invalide"),
	content: z.string().trim().min(2, "Commentaire trop court").max(1500, "Commentaire trop long"),
});

const updatePostSchema = z.object({
	postId: z.string().cuid("Post invalide"),
	content: z.string().trim().min(3, "Le message est trop court").max(4000, "Message trop long"),
	imageUrl: z.string().trim().optional(),
});

const deletePostSchema = z.object({
	postId: z.string().cuid("Post invalide"),
});

const updateCommentSchema = z.object({
	commentId: z.string().cuid("Commentaire invalide"),
	content: z.string().trim().min(2, "Commentaire trop court").max(1500, "Commentaire trop long"),
});

const deleteCommentSchema = z.object({
	commentId: z.string().cuid("Commentaire invalide"),
});

const notificationIdSchema = z.object({
	notificationId: z.string().cuid("Notification invalide"),
});

export async function uploadCommunityPostImage(formData) {
	const user = await requireCommunityUser();
	const file = formData.get("file");

	if (!file || typeof file === "string") {
		return { error: "Aucun fichier recu" };
	}

	return uploadCommunityPostImageFile({
		file,
		sessionUserId: user.id,
	});
}

export async function uploadCommunityStoryImage(formData) {
	const user = await requireCommunityUser();
	const file = formData.get("file");

	if (!file || typeof file === "string") {
		return { error: "Aucun fichier recu" };
	}

	return uploadCommunityStoryImageFile({
		file,
		sessionUserId: user.id,
	});
}

export async function createCommunityPost(formData) {
	const user = await requireCommunityUser();

	const parsed = createPostSchema.safeParse({
		content: formData.get("content") || "",
		imageUrl: formData.get("imageUrl") || "",
	});

	if (!parsed.success) {
		return { error: parsed.error.issues[0].message };
	}

	const data = parsed.data;
	await prisma.communityPost.create({
		data: {
			authorId: user.id,
			type: "UPDATE",
			content: data.content,
			imageUrl: data.imageUrl || null,
		},
	});

	revalidatePath("/community");
	return { success: true };
}

export async function createCommunityStory(formData) {
	const user = await requireCommunityUser();

	const parsed = createStorySchema.safeParse({
		content: formData.get("content") || "",
		imageUrl: formData.get("imageUrl") || "",
	});

	if (!parsed.success) {
		return { error: parsed.error.issues[0].message };
	}

	const data = parsed.data;
	const expiresAt = new Date();
	expiresAt.setHours(expiresAt.getHours() + 24);

	await prisma.communityStory.create({
		data: {
			authorId: user.id,
			content: data.content?.trim() || null,
			imageUrl: data.imageUrl || null,
			expiresAt,
		},
	});

	revalidatePath("/community");
	return { success: true };
}

export async function createCommunityComment(formData) {
	const user = await requireCommunityUser();

	const parsed = createCommentSchema.safeParse({
		postId: formData.get("postId") || "",
		content: formData.get("content") || "",
	});

	if (!parsed.success) {
		return { error: parsed.error.issues[0].message };
	}

	const post = await prisma.communityPost.findUnique({
		where: { id: parsed.data.postId },
		select: { id: true, authorId: true },
	});
	if (!post) return { error: "Publication introuvable" };

	const comment = await prisma.communityComment.create({
		data: {
			postId: parsed.data.postId,
			authorId: user.id,
			content: parsed.data.content,
		},
	});

	if (post.authorId !== user.id) {
		await prisma.communityNotification.create({
			data: {
				recipientId: post.authorId,
				actorId: user.id,
				type: "POST_COMMENT",
				postId: post.id,
				commentId: comment.id,
			},
		});

		await triggerCommunityRealtimeUpdate({
			userIds: [post.authorId],
			reason: "notification.post_comment",
		});
	}

	revalidatePath("/community");
	return { success: true };
}

export async function updateCommunityPost(formData) {
	const user = await requireCommunityUser();

	const parsed = updatePostSchema.safeParse({
		postId: formData.get("postId") || "",
		content: formData.get("content") || "",
		imageUrl: formData.get("imageUrl") || "",
	});

	if (!parsed.success) {
		return { error: parsed.error.issues[0].message };
	}

	const post = await prisma.communityPost.findUnique({
		where: { id: parsed.data.postId },
		select: { id: true, authorId: true },
	});
	if (!post) return { error: "Publication introuvable" };
	if (!canModerateCommunityContent(user, post.authorId)) return { error: "Non autorise" };

	await prisma.communityPost.update({
		where: { id: post.id },
		data: {
			type: "UPDATE",
			content: parsed.data.content,
			imageUrl: parsed.data.imageUrl || null,
		},
	});

	revalidatePath("/community");
	return { success: true };
}

export async function deleteCommunityPost(formData) {
	const user = await requireCommunityUser();

	const parsed = deletePostSchema.safeParse({
		postId: formData.get("postId") || "",
	});

	if (!parsed.success) {
		return { error: parsed.error.issues[0].message };
	}

	const post = await prisma.communityPost.findUnique({
		where: { id: parsed.data.postId },
		select: { id: true, authorId: true },
	});
	if (!post) return { error: "Publication introuvable" };
	if (!canModerateCommunityContent(user, post.authorId)) return { error: "Non autorise" };

	await prisma.communityPost.delete({ where: { id: post.id } });

	revalidatePath("/community");
	return { success: true };
}

export async function updateCommunityComment(formData) {
	const user = await requireCommunityUser();

	const parsed = updateCommentSchema.safeParse({
		commentId: formData.get("commentId") || "",
		content: formData.get("content") || "",
	});

	if (!parsed.success) {
		return { error: parsed.error.issues[0].message };
	}

	const comment = await prisma.communityComment.findUnique({
		where: { id: parsed.data.commentId },
		select: { id: true, authorId: true },
	});
	if (!comment) return { error: "Commentaire introuvable" };
	if (!canModerateCommunityContent(user, comment.authorId)) return { error: "Non autorise" };

	await prisma.communityComment.update({
		where: { id: comment.id },
		data: { content: parsed.data.content },
	});

	revalidatePath("/community");
	return { success: true };
}

export async function deleteCommunityComment(formData) {
	const user = await requireCommunityUser();

	const parsed = deleteCommentSchema.safeParse({
		commentId: formData.get("commentId") || "",
	});

	if (!parsed.success) {
		return { error: parsed.error.issues[0].message };
	}

	const comment = await prisma.communityComment.findUnique({
		where: { id: parsed.data.commentId },
		select: { id: true, authorId: true },
	});
	if (!comment) return { error: "Commentaire introuvable" };
	if (!canModerateCommunityContent(user, comment.authorId)) return { error: "Non autorise" };

	await prisma.communityComment.delete({ where: { id: comment.id } });

	revalidatePath("/community");
	return { success: true };
}

export async function toggleCommunityPostLike(postId) {
	const user = await requireCommunityUser();
	if (!postId) return { error: "Publication invalide" };

	const post = await prisma.communityPost.findUnique({
		where: { id: postId },
		select: { id: true, authorId: true },
	});
	if (!post) return { error: "Publication introuvable" };

	const existing = await prisma.communityPostLike.findUnique({
		where: {
			postId_userId: {
				postId,
				userId: user.id,
			},
		},
		select: { id: true },
	});

	if (existing) {
		await prisma.communityPostLike.delete({ where: { id: existing.id } });
		await prisma.communityNotification.deleteMany({
			where: {
				type: "POST_LIKE",
				postId,
				actorId: user.id,
				recipientId: post.authorId,
			},
		});

		if (post.authorId !== user.id) {
			await triggerCommunityRealtimeUpdate({
				userIds: [post.authorId],
				reason: "notification.post_like_removed",
			});
		}
	} else {
		await prisma.communityPostLike.create({
			data: {
				postId,
				userId: user.id,
			},
		});

		if (post.authorId !== user.id) {
			await prisma.communityNotification.create({
				data: {
					recipientId: post.authorId,
					actorId: user.id,
					type: "POST_LIKE",
					postId,
				},
			});

			await triggerCommunityRealtimeUpdate({
				userIds: [post.authorId],
				reason: "notification.post_like",
			});
		}
	}

	revalidatePath("/community");
	return { success: true };
}

export async function markCommunityStoryViewed(storyId) {
	const user = await requireCommunityUser();
	if (!storyId) return { error: "Story invalide" };

	const story = await prisma.communityStory.findUnique({
		where: { id: storyId },
		select: { id: true, expiresAt: true },
	});

	if (!story || story.expiresAt <= new Date()) {
		return { error: "Story introuvable" };
	}

	await prisma.communityStoryView.upsert({
		where: {
			storyId_userId: {
				storyId,
				userId: user.id,
			},
		},
		update: {
			viewedAt: new Date(),
		},
		create: {
			storyId,
			userId: user.id,
		},
	});

	revalidatePath("/community");
	return { success: true };
}

export async function markCommunityNotificationAsRead(formData) {
	const user = await requireCommunityUser();

	const parsed = notificationIdSchema.safeParse({
		notificationId: formData.get("notificationId") || "",
	});
	if (!parsed.success) return { error: parsed.error.issues[0].message };

	await prisma.communityNotification.updateMany({
		where: {
			id: parsed.data.notificationId,
			recipientId: user.id,
		},
		data: {
			isRead: true,
			readAt: new Date(),
		},
	});

	revalidatePath("/community");
	return { success: true };
}

export async function markAllCommunityNotificationsAsRead() {
	const user = await requireCommunityUser();

	await prisma.communityNotification.updateMany({
		where: {
			recipientId: user.id,
			isRead: false,
		},
		data: {
			isRead: true,
			readAt: new Date(),
		},
	});

	revalidatePath("/community");
	return { success: true };
}
