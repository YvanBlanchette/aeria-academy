-- CreateTable
CREATE TABLE "CommunityMessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityMessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityMessageReaction_messageId_userId_key" ON "CommunityMessageReaction"("messageId", "userId");

-- CreateIndex
CREATE INDEX "CommunityMessageReaction_messageId_idx" ON "CommunityMessageReaction"("messageId");

-- CreateIndex
CREATE INDEX "CommunityMessageReaction_userId_idx" ON "CommunityMessageReaction"("userId");

-- AddForeignKey
ALTER TABLE "CommunityMessageReaction" ADD CONSTRAINT "CommunityMessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "CommunityMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMessageReaction" ADD CONSTRAINT "CommunityMessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
