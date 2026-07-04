-- Add agency support to community posts (Facebook-like agency pages)
ALTER TABLE "CommunityPost"
ADD COLUMN "agencyId" TEXT;

CREATE INDEX "CommunityPost_agencyId_createdAt_idx"
ON "CommunityPost"("agencyId", "createdAt");

ALTER TABLE "CommunityPost"
ADD CONSTRAINT "CommunityPost_agencyId_fkey"
FOREIGN KEY ("agencyId") REFERENCES "Agency"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
