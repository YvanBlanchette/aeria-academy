-- CreateEnum
CREATE TYPE "FriendRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ProfileVisibilityScope" AS ENUM ('PUBLIC', 'MEMBERS', 'FRIENDS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "MessagePermissionScope" AS ENUM ('EVERYONE', 'FRIENDS', 'NOBODY');

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "messagePermissionScope" "MessagePermissionScope" NOT NULL DEFAULT 'EVERYONE',
ADD COLUMN     "profileVisibilityScope" "ProfileVisibilityScope" NOT NULL DEFAULT 'MEMBERS';

-- CreateTable
CREATE TABLE "UserFriendRequest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "FriendRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "UserFriendRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFriendship" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFriendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserFriendRequest_senderId_status_idx" ON "UserFriendRequest"("senderId", "status");

-- CreateIndex
CREATE INDEX "UserFriendRequest_receiverId_status_idx" ON "UserFriendRequest"("receiverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserFriendRequest_senderId_receiverId_key" ON "UserFriendRequest"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "UserFriendship_userAId_idx" ON "UserFriendship"("userAId");

-- CreateIndex
CREATE INDEX "UserFriendship_userBId_idx" ON "UserFriendship"("userBId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFriendship_userAId_userBId_key" ON "UserFriendship"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "UserBlock_blockerId_idx" ON "UserBlock"("blockerId");

-- CreateIndex
CREATE INDEX "UserBlock_blockedId_idx" ON "UserBlock"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBlock_blockerId_blockedId_key" ON "UserBlock"("blockerId", "blockedId");

-- AddForeignKey
ALTER TABLE "UserFriendRequest" ADD CONSTRAINT "UserFriendRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFriendRequest" ADD CONSTRAINT "UserFriendRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFriendship" ADD CONSTRAINT "UserFriendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFriendship" ADD CONSTRAINT "UserFriendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
