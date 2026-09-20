-- CreateTable
CREATE TABLE "AppUserProfile" (
    "id" TEXT NOT NULL,
    "panelUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppUserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calculation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "input" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Calculation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUserProfile_panelUserId_key" ON "AppUserProfile"("panelUserId");

-- CreateIndex
CREATE INDEX "Calculation_userId_idx" ON "Calculation"("userId");

-- CreateIndex
CREATE INDEX "Calculation_type_idx" ON "Calculation"("type");

-- CreateIndex
CREATE INDEX "Calculation_createdAt_idx" ON "Calculation"("createdAt");

-- AddForeignKey
ALTER TABLE "Calculation" ADD CONSTRAINT "Calculation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
