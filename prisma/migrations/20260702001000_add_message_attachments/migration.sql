-- AlterTable
ALTER TABLE "CommunityMessage" ALTER COLUMN "content" DROP NOT NULL;
ALTER TABLE "CommunityMessage" ADD COLUMN "attachmentUrl" TEXT;
ALTER TABLE "CommunityMessage" ADD COLUMN "attachmentName" TEXT;
ALTER TABLE "CommunityMessage" ADD COLUMN "attachmentMimeType" TEXT;
ALTER TABLE "CommunityMessage" ADD COLUMN "attachmentSize" INTEGER;
