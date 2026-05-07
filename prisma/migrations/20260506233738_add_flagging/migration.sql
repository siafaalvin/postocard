-- CreateEnum
CREATE TYPE "FlagType" AS ENUM ('red');

-- CreateTable
CREATE TABLE "FlagAttribute" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" "FlagType" NOT NULL DEFAULT 'red',

    CONSTRAINT "FlagAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFlag" (
    "id" TEXT NOT NULL,
    "placerId" TEXT NOT NULL,
    "flaggedUserId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "note" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicFlag" (
    "id" TEXT NOT NULL,
    "flaggedUserId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "flagCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "removalCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlagRemovalPayment" (
    "id" TEXT NOT NULL,
    "publicFlagId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "offenseNumber" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlagRemovalPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlagAttribute_category_idx" ON "FlagAttribute"("category");

-- CreateIndex
CREATE INDEX "UserFlag_flaggedUserId_idx" ON "UserFlag"("flaggedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFlag_placerId_flaggedUserId_attributeId_key" ON "UserFlag"("placerId", "flaggedUserId", "attributeId");

-- CreateIndex
CREATE INDEX "PublicFlag_flaggedUserId_idx" ON "PublicFlag"("flaggedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicFlag_flaggedUserId_attributeId_key" ON "PublicFlag"("flaggedUserId", "attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "FlagRemovalPayment_stripePaymentIntentId_key" ON "FlagRemovalPayment"("stripePaymentIntentId");

-- AddForeignKey
ALTER TABLE "UserFlag" ADD CONSTRAINT "UserFlag_placerId_fkey" FOREIGN KEY ("placerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFlag" ADD CONSTRAINT "UserFlag_flaggedUserId_fkey" FOREIGN KEY ("flaggedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFlag" ADD CONSTRAINT "UserFlag_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "FlagAttribute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicFlag" ADD CONSTRAINT "PublicFlag_flaggedUserId_fkey" FOREIGN KEY ("flaggedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicFlag" ADD CONSTRAINT "PublicFlag_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "FlagAttribute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlagRemovalPayment" ADD CONSTRAINT "FlagRemovalPayment_publicFlagId_fkey" FOREIGN KEY ("publicFlagId") REFERENCES "PublicFlag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
