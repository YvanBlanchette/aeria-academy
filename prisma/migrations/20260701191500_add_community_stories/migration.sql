-- CreateTable
CREATE TABLE "CommunityStory" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityStoryView" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityStoryView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityStory_authorId_idx" ON "CommunityStory"("authorId");

-- CreateIndex
CREATE INDEX "CommunityStory_expiresAt_createdAt_idx" ON "CommunityStory"("expiresAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityStoryView_storyId_userId_key" ON "CommunityStoryView"("storyId", "userId");

-- CreateIndex
CREATE INDEX "CommunityStoryView_userId_idx" ON "CommunityStoryView"("userId");

-- CreateIndex
CREATE INDEX "CommunityStoryView_storyId_idx" ON "CommunityStoryView"("storyId");

-- AddForeignKey
ALTER TABLE "CommunityStory" ADD CONSTRAINT "CommunityStory_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityStoryView" ADD CONSTRAINT "CommunityStoryView_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "CommunityStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityStoryView" ADD CONSTRAINT "CommunityStoryView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
