/*
  Warnings:

  - A unique constraint covering the columns `[stripeCustomerId]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[paypalSubscriptionId]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PAST_DUE';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "billingInterval" TEXT,
ADD COLUMN     "paymentProvider" TEXT,
ADD COLUMN     "paypalSubscriptionId" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "paypalPlanIdAnnual" TEXT,
ADD COLUMN     "paypalPlanIdMonthly" TEXT,
ADD COLUMN     "priceAnnualMAD" INTEGER,
ADD COLUMN     "priceMonthlyMAD" INTEGER,
ADD COLUMN     "stripePriceIdAnnual" TEXT,
ADD COLUMN     "stripePriceIdMonthly" TEXT;

-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN     "paypalEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_paypalSubscriptionId_key" ON "Organization"("paypalSubscriptionId");
