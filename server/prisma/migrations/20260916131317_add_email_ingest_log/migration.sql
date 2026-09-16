-- CreateEnum
CREATE TYPE "EmailIngestStatus" AS ENUM ('FILED', 'SKIPPED_NO_CLIENT', 'SKIPPED_NOT_DOCUMENT', 'ERROR');

-- AlterTable
ALTER TABLE "EmailAccount" ADD COLUMN     "lastProcessedUid" INTEGER;

-- CreateTable
CREATE TABLE "EmailIngestLog" (
    "id" TEXT NOT NULL,
    "emailAccountId" TEXT NOT NULL,
    "messageUid" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "clientId" TEXT,
    "status" "EmailIngestStatus" NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailIngestLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EmailIngestLog" ADD CONSTRAINT "EmailIngestLog_emailAccountId_fkey" FOREIGN KEY ("emailAccountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
