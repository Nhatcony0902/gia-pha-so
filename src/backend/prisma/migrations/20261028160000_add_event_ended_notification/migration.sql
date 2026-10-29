-- AlterTable
ALTER TABLE "FamilyEvent" ADD COLUMN "endedNotifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "FamilyEvent_endedNotifiedAt_endAt_idx" ON "FamilyEvent"("endedNotifiedAt", "endAt");
