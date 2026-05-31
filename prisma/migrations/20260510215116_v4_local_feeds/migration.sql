-- CreateTable
CREATE TABLE "SavedLocationFeed" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radiusKm" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "slot" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedLocationFeed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedLocationFeed_userId_idx" ON "SavedLocationFeed"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedLocationFeed_userId_slot_key" ON "SavedLocationFeed"("userId", "slot");

-- AddForeignKey
ALTER TABLE "SavedLocationFeed" ADD CONSTRAINT "SavedLocationFeed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
