/*
  Warnings:

  - You are about to drop the column `manualPaymentContact` on the `PlatformSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PlatformSettings" DROP COLUMN "manualPaymentContact",
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactWhatsapp" TEXT;

-- CreateTable
CREATE TABLE "ContactRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactRequest_organizationId_idx" ON "ContactRequest"("organizationId");
