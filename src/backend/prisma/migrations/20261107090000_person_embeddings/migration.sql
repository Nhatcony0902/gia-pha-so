-- Chatbot (LMS-016): embedding nội dung từng người cho tool search_content (ADR-0004, ADR-0005)
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "PersonEmbedding" (
    "personId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonEmbedding_pkey" PRIMARY KEY ("personId")
);

-- AddForeignKey
ALTER TABLE "PersonEmbedding" ADD CONSTRAINT "PersonEmbedding_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
