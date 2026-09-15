-- CreateEnum
CREATE TYPE "OcrsBand" AS ENUM ('GREEN', 'AMBER', 'RED', 'GREY', 'BLUE');

-- CreateTable
CREATE TABLE "OcrsScore" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "dateRecorded" TIMESTAMP(3) NOT NULL,
    "roadworthinessScore" INTEGER NOT NULL,
    "trafficScore" INTEGER NOT NULL,
    "band" "OcrsBand" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcrsScore_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OcrsScore" ADD CONSTRAINT "OcrsScore_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
