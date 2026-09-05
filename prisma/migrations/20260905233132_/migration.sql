-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN     "manualPaymentContact" TEXT,
ADD COLUMN     "manualPaymentCountries" TEXT[] DEFAULT ARRAY[]::TEXT[];
