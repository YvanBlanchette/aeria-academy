-- Add gamification badges for module and quiz achievements.
CREATE TYPE "BadgeType" AS ENUM ('MODULE_COMPLETION', 'QUIZ_PASSED');

CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeType" "BadgeType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "courseId" TEXT,
    "moduleId" TEXT,
    "quizId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserBadge_userId_badgeType_moduleId_key" ON "UserBadge"("userId", "badgeType", "moduleId");
CREATE UNIQUE INDEX "UserBadge_userId_badgeType_quizId_key" ON "UserBadge"("userId", "badgeType", "quizId");
CREATE INDEX "UserBadge_userId_createdAt_idx" ON "UserBadge"("userId", "createdAt");
CREATE INDEX "UserBadge_courseId_createdAt_idx" ON "UserBadge"("courseId", "createdAt");
