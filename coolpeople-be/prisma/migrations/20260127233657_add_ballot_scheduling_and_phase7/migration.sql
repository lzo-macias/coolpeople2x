-- AlterTable
ALTER TABLE "Race" ADD COLUMN     "ballotClosesAt" TIMESTAMP(3),
ADD COLUMN     "ballotOpensAt" TIMESTAMP(3),
ADD COLUMN     "ballotProcessed" BOOLEAN NOT NULL DEFAULT false;
