"use server";

import { revalidatePath } from "next/cache";
import { requireMessagingUser } from "@/features/community/messages/server/message-guards";
import { findOrCreateCommunityConversationForUsers as findOrCreateConversationService } from "@/features/community/messages/server/message-conversations-service";
import {
	deleteCommunityMessage as deleteCommunityMessageService,
	sendCommunityMessage as sendCommunityMessageService,
	toggleCommunityMessageReaction as toggleCommunityMessageReactionService,
} from "@/features/community/messages/server/message-service";

export async function sendCommunityMessage(formData) {
	const user = await requireMessagingUser();
	const conversationId = String(formData.get("conversationId") || "").trim();
	const content = String(formData.get("content") || "").trim();
	const attachment = formData.get("attachment");
	const result = await sendCommunityMessageService({
		user,
		conversationId,
		content,
		attachment,
	});
	if (result?.error) return result;
	revalidatePath("/community/messages");
	return result;
}

export async function deleteCommunityMessage(formData) {
	const user = await requireMessagingUser();
	const messageId = String(formData.get("messageId") || "").trim();
	const result = await deleteCommunityMessageService({ userId: user.id, messageId });
	if (result?.error) return result;
	revalidatePath("/community/messages");
	return result;
}

export async function toggleCommunityMessageReaction(formData) {
	const user = await requireMessagingUser();
	const messageId = String(formData.get("messageId") || "").trim();
	const emoji = String(formData.get("emoji") || "").trim();
	const result = await toggleCommunityMessageReactionService({ userId: user.id, messageId, emoji });
	if (result?.error) return result;
	revalidatePath("/community/messages");
	return result;
}

export async function findOrCreateCommunityConversationForUsers(userId, otherUserId) {
	return findOrCreateConversationService(userId, otherUserId);
}
