-- CreateTable
CREATE TABLE "DriverLoginAttempt" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverLoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DriverLoginAttempt_ip_createdAt_idx" ON "DriverLoginAttempt"("ip", "createdAt");
