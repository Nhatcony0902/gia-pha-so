-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('DEATH_ANNIVERSARY', 'REUNION', 'CEREMONY', 'WEDDING', 'BIRTHDAY', 'MEETING', 'OTHER');

-- CreateEnum
CREATE TYPE "EventMediaType" AS ENUM ('IMAGE', 'DOCUMENT');

-- CreateTable
CREATE TABLE "FamilyEvent" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "EventCategory" NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventGuest" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),

    CONSTRAINT "EventGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMedia" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "type" "EventMediaType" NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT,
    "format" TEXT,
    "bytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SYSTEM',
    "sourceType" TEXT NOT NULL DEFAULT 'SYSTEM',
    "sourceName" TEXT NOT NULL DEFAULT 'Hệ thống',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamilyEvent_treeId_startAt_idx" ON "FamilyEvent"("treeId", "startAt");

-- CreateIndex
CREATE INDEX "FamilyEvent_notifiedAt_startAt_idx" ON "FamilyEvent"("notifiedAt", "startAt");

-- CreateIndex
CREATE INDEX "EventGuest_userId_idx" ON "EventGuest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventGuest_eventId_email_key" ON "EventGuest"("eventId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "EventMedia_publicId_key" ON "EventMedia"("publicId");

-- CreateIndex
CREATE INDEX "EventMedia_eventId_createdAt_idx" ON "EventMedia"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- AddForeignKey
ALTER TABLE "FamilyEvent" ADD CONSTRAINT "FamilyEvent_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyEvent" ADD CONSTRAINT "FamilyEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGuest" ADD CONSTRAINT "EventGuest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FamilyEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGuest" ADD CONSTRAINT "EventGuest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMedia" ADD CONSTRAINT "EventMedia_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FamilyEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
