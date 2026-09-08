-- AlterTable
ALTER TABLE "AdminActionCode" ADD COLUMN     "verifiedUntil" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AdminActionCode_purpose_verifiedUntil_idx" ON "AdminActionCode"("purpose", "verifiedUntil");
