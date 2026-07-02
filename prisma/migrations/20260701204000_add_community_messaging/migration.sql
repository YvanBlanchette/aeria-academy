-- CreateTable
CREATE TABLE "CommunityConversation" (
    "id" TEXT NOT NULL,
    "participantAId" TEXT NOT NULL,
    "participantBId" TEXT NOT NULL,
    "participantALastReadAt" TIMESTAMP(3),
    "participantBLastReadAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityConversation_participantAId_participantBId_key" ON "CommunityConversation"("participantAId", "participantBId");

-- CreateIndex
CREATE INDEX "CommunityConversation_participantAId_lastMessageAt_idx" ON "CommunityConversation"("participantAId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "CommunityConversation_participantBId_lastMessageAt_idx" ON "CommunityConversation"("participantBId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "CommunityMessage_conversationId_createdAt_idx" ON "CommunityMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityMessage_senderId_idx" ON "CommunityMessage"("senderId");

-- AddForeignKey
ALTER TABLE "CommunityConversation" ADD CONSTRAINT "CommunityConversation_participantAId_fkey" FOREIGN KEY ("participantAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityConversation" ADD CONSTRAINT "CommunityConversation_participantBId_fkey" FOREIGN KEY ("participantBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMessage" ADD CONSTRAINT "CommunityMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CommunityConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMessage" ADD CONSTRAINT "CommunityMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
