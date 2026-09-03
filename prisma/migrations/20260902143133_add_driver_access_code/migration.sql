/*
  Warnings:

  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `OtpCode` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[accessCode]` on the table `Driver` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User_phone_key";

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "accessCode" TEXT,
ADD COLUMN     "isOwnerSelf" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "phone";

-- DropTable
DROP TABLE "OtpCode";

-- CreateTable
CREATE TABLE "EmailCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailCode_email_idx" ON "EmailCode"("email");

-- CreateIndex
CREATE INDEX "EmailCode_ip_createdAt_idx" ON "EmailCode"("ip", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_accessCode_key" ON "Driver"("accessCode");
