-- AlterEnum
ALTER TYPE "CommunityNotificationType" ADD VALUE 'MESSAGE';

-- AlterTable
ALTER TABLE "CommunityNotification" ADD COLUMN "conversationId" TEXT;
ALTER TABLE "CommunityNotification" ADD COLUMN "messagePreview" TEXT;

-- CreateIndex
CREATE INDEX "CommunityNotification_conversationId_idx" ON "CommunityNotification"("conversationId");

-- AddForeignKey
ALTER TABLE "CommunityNotification" ADD CONSTRAINT "CommunityNotification_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CommunityConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
