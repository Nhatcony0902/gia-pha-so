ALTER TABLE "Person"
ADD COLUMN "title" TEXT,
ADD COLUMN "maidenName" TEXT,
ADD COLUMN "clanBranch" TEXT,
ADD COLUMN "generationName" TEXT,
ADD COLUMN "familyPosition" TEXT,
ADD COLUMN "education" TEXT,
ADD COLUMN "employer" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "bloodType" TEXT,
ADD COLUMN "identificationCode" TEXT,
ADD COLUMN "socialLinks" JSONB,
ADD COLUMN "notes" TEXT,
ADD COLUMN "burialPlace" TEXT,
ADD COLUMN "avatarPublicId" TEXT;

CREATE TABLE "PersonImage" (
  "id" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "caption" TEXT,
  "takenAt" TIMESTAMP(3),
  "width" INTEGER,
  "height" INTEGER,
  "format" TEXT,
  "bytes" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PersonImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PersonImage_publicId_key" ON "PersonImage"("publicId");
CREATE INDEX "PersonImage_personId_sortOrder_idx" ON "PersonImage"("personId", "sortOrder");
ALTER TABLE "PersonImage" ADD CONSTRAINT "PersonImage_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
