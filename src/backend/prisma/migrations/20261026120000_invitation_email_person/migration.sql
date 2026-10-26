-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "personId" TEXT;

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "email" TEXT,
ADD COLUMN     "personId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Membership_treeId_personId_key" ON "Membership"("treeId", "personId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

