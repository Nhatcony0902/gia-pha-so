-- LMS-023: đồng ý gửi dữ liệu sang AI theo từng gia phả (ADR-0008).
-- Gia phả có sẵn mặc định tắt AI cho tới khi Admin bật.
ALTER TABLE "FamilyTree"
  ADD COLUMN "aiEnabledAt" TIMESTAMP(3),
  ADD COLUMN "aiEnabledById" TEXT,
  ADD COLUMN "aiShareLivingDetails" BOOLEAN NOT NULL DEFAULT false;
