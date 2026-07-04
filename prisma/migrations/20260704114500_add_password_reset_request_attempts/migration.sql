-- Store forgot-password attempts for database-backed rate limiting.
CREATE TABLE "PasswordResetRequestAttempt" (
    "id" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetRequestAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PasswordResetRequestAttempt_emailHash_createdAt_idx" ON "PasswordResetRequestAttempt"("emailHash", "createdAt");
CREATE INDEX "PasswordResetRequestAttempt_ipHash_createdAt_idx" ON "PasswordResetRequestAttempt"("ipHash", "createdAt");
