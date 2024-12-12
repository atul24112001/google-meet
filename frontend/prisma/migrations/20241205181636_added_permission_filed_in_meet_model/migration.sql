-- AlterTable
ALTER TABLE "meets" ADD COLUMN     "allowAudio" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowScreen" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowVideo" BOOLEAN NOT NULL DEFAULT true;
