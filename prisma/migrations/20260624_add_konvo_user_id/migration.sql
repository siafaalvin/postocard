-- Add Konvo user ID for cross-platform auth bridge
ALTER TABLE "User" ADD COLUMN "konvoUserId" TEXT UNIQUE;
