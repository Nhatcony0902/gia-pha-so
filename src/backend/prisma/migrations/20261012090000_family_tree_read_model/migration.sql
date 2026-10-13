-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');
CREATE TYPE "DatePrecision" AS ENUM ('YEAR', 'MONTH', 'DAY');
CREATE TYPE "ParentKind" AS ENUM ('BIOLOGICAL', 'ADOPTIVE');
CREATE TYPE "MarriageStatus" AS ENUM ('MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateTable
CREATE TABLE "FamilyTree" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "originPlace" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FamilyTree_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "preferredName" TEXT,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    "birthDate" TIMESTAMP(3),
    "birthDatePrecision" "DatePrecision",
    "birthPlace" TEXT,
    "deathDate" TIMESTAMP(3),
    "deathDatePrecision" "DatePrecision",
    "deathPlace" TEXT,
    "isDeceased" BOOLEAN NOT NULL DEFAULT false,
    "hometown" TEXT,
    "currentResidence" TEXT,
    "nationality" TEXT,
    "ethnicity" TEXT,
    "religion" TEXT,
    "occupation" TEXT,
    "biography" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Person_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Person_death_requires_deceased_check" CHECK ("deathDate" IS NULL OR "isDeceased" = true),
    CONSTRAINT "Person_birth_precision_check" CHECK ("birthDate" IS NOT NULL OR "birthDatePrecision" IS NULL),
    CONSTRAINT "Person_death_precision_check" CHECK ("deathDate" IS NOT NULL OR "deathDatePrecision" IS NULL)
);

CREATE TABLE "FamilyTreePerson" (
    "treeId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FamilyTreePerson_pkey" PRIMARY KEY ("treeId", "personId")
);

CREATE TABLE "RelationshipType" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isDirected" BOOLEAN NOT NULL,
    CONSTRAINT "RelationshipType_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "typeCode" TEXT NOT NULL,
    "fromPersonId" TEXT NOT NULL,
    "toPersonId" TEXT NOT NULL,
    "parentKind" "ParentKind",
    "birthOrder" INTEGER,
    "marriageStatus" "MarriageStatus",
    "marriageOrder" INTEGER,
    "startedAt" TIMESTAMP(3),
    "startedAtPrecision" "DatePrecision",
    "endedAt" TIMESTAMP(3),
    "endedAtPrecision" "DatePrecision",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Relationship_no_self_check" CHECK ("fromPersonId" <> "toPersonId"),
    CONSTRAINT "Relationship_positive_birth_order_check" CHECK ("birthOrder" IS NULL OR "birthOrder" > 0),
    CONSTRAINT "Relationship_positive_marriage_order_check" CHECK ("marriageOrder" IS NULL OR "marriageOrder" > 0),
    CONSTRAINT "Relationship_type_fields_check" CHECK (
      ("typeCode" = 'PARENT_CHILD' AND "parentKind" IS NOT NULL AND "marriageStatus" IS NULL AND "marriageOrder" IS NULL AND "startedAt" IS NULL AND "endedAt" IS NULL)
      OR
      ("typeCode" = 'SPOUSE' AND "parentKind" IS NULL AND "birthOrder" IS NULL AND "marriageStatus" IS NOT NULL AND "fromPersonId" < "toPersonId")
    )
);

CREATE INDEX "FamilyTree_createdById_updatedAt_idx" ON "FamilyTree"("createdById", "updatedAt");
CREATE INDEX "Person_fullName_idx" ON "Person"("fullName");
CREATE INDEX "FamilyTreePerson_personId_idx" ON "FamilyTreePerson"("personId");
CREATE UNIQUE INDEX "Relationship_treeId_typeCode_fromPersonId_toPersonId_key" ON "Relationship"("treeId", "typeCode", "fromPersonId", "toPersonId");
CREATE INDEX "Relationship_treeId_typeCode_idx" ON "Relationship"("treeId", "typeCode");
CREATE INDEX "Relationship_fromPersonId_idx" ON "Relationship"("fromPersonId");
CREATE INDEX "Relationship_toPersonId_idx" ON "Relationship"("toPersonId");

ALTER TABLE "FamilyTree" ADD CONSTRAINT "FamilyTree_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FamilyTreePerson" ADD CONSTRAINT "FamilyTreePerson_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyTreePerson" ADD CONSTRAINT "FamilyTreePerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_typeCode_fkey" FOREIGN KEY ("typeCode") REFERENCES "RelationshipType"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_fromPersonId_fkey" FOREIGN KEY ("fromPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_toPersonId_fkey" FOREIGN KEY ("toPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_treeId_fromPersonId_fkey" FOREIGN KEY ("treeId", "fromPersonId") REFERENCES "FamilyTreePerson"("treeId", "personId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_treeId_toPersonId_fkey" FOREIGN KEY ("treeId", "toPersonId") REFERENCES "FamilyTreePerson"("treeId", "personId") ON DELETE CASCADE ON UPDATE CASCADE;
