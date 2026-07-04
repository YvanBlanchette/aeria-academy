"use server";

import { revalidatePath } from "next/cache";
import { requireMessagingUser } from "@/features/community/messages/server/message-guards";
import { findOrCreateCommunityConversationForUsers as findOrCreateConversationService } from "@/features/community/messages/server/message-conversations-service";
import {
	deleteCommunityMessage as deleteCommunityMessageService,
	getCopyableCommunityMessageContent as getCopyableCommunityMessageContentService,
	sendCommunityMessage as sendCommunityMessageService,
	toggleCommunityMessageReaction as toggleCommunityMessageReactionService,
} from "@/features/community/messages/server/message-service";

export async function sendCommunityMessage(formData) {
	// Server action boundary: validate user session + normalize payload before service call.
	const user = await requireMessagingUser();
	const conversationId = String(formData.get("conversationId") || "").trim();
	const content = String(formData.get("content") || "").trim();
	const attachments = formData.getAll("attachment").filter((value) => value && typeof value !== "string" && value.size > 0);
	const result = await sendCommunityMessageService({
		user,
		conversationId,
		content,
		attachments,
	});
	if (result?.error) return result;
	revalidatePath("/community/messages");
	return result;
}

export async function deleteCommunityMessage(formData) {
	// Soft-delete entry point used by UI confirmation dialog.
	const user = await requireMessagingUser();
	const messageId = String(formData.get("messageId") || "").trim();
	const result = await deleteCommunityMessageService({ userId: user.id, messageId });
	if (result?.error) return result;
	revalidatePath("/community/messages");
	return result;
}

export async function toggleCommunityMessageReaction(formData) {
	// Reaction toggles are idempotent at service layer (add / replace / remove).
	const user = await requireMessagingUser();
	const messageId = String(formData.get("messageId") || "").trim();
	const emoji = String(formData.get("emoji") || "").trim();
	const result = await toggleCommunityMessageReactionService({ userId: user.id, messageId, emoji });
	if (result?.error) return result;
	revalidatePath("/community/messages");
	return result;
}

export async function getCopyableCommunityMessageContent(formData) {
	// Read access guard for clipboard copy from message action menu.
	const user = await requireMessagingUser();
	const messageId = String(formData.get("messageId") || "").trim();
	return getCopyableCommunityMessageContentService({ userId: user.id, messageId });
}

export async function findOrCreateCommunityConversationForUsers(userId, otherUserId) {
	// Shared helper used when opening a conversation from search or profile actions.
	return findOrCreateConversationService(userId, otherUserId);
}
