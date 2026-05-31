-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserDisplayName" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "slot" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDisplayName_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vouch" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "newUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vouch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsernameChallenge" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "challengerId" TEXT,
    "evidence" VARCHAR(1000) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsernameChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "ctaUrl" TEXT,
    "imageUrl" TEXT,
    "source" TEXT NOT NULL DEFAULT 'bubblads',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserDisplayName_userId_idx" ON "UserDisplayName"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDisplayName_userId_slot_key" ON "UserDisplayName"("userId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "Vouch_newUserId_key" ON "Vouch"("newUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Vouch_voucherId_newUserId_key" ON "Vouch"("voucherId", "newUserId");

-- CreateIndex
CREATE INDEX "UsernameChallenge_username_idx" ON "UsernameChallenge"("username");

-- CreateIndex
CREATE INDEX "UsernameChallenge_challengerId_idx" ON "UsernameChallenge"("challengerId");

-- CreateIndex
CREATE INDEX "AdDelivery_userId_read_createdAt_idx" ON "AdDelivery"("userId", "read", "createdAt");

-- AddForeignKey
ALTER TABLE "UserDisplayName" ADD CONSTRAINT "UserDisplayName_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vouch" ADD CONSTRAINT "Vouch_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vouch" ADD CONSTRAINT "Vouch_newUserId_fkey" FOREIGN KEY ("newUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsernameChallenge" ADD CONSTRAINT "UsernameChallenge_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdDelivery" ADD CONSTRAINT "AdDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
