-- CreateEnum
CREATE TYPE "MeetType" AS ENUM ('class', 'meeting');

-- AlterTable
ALTER TABLE "meets" ADD COLUMN     "type" "MeetType" NOT NULL DEFAULT 'meeting';
