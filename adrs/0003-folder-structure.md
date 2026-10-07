# ADR-0003: Folder Structure

- **Trạng thái:** Proposed
- **Ngày:** 2026-10-07

## Bối cảnh
Ba người code song song (Sơn BE, Quân FE, Nhật AI), Bình phụ trách tài liệu, dùng chung TypeScript. Cần cấu trúc giúp ít đụng code nhau và dùng chung được type/contract.

## Quyết định
Monorepo dùng npm workspaces:

```
docker-compose.yml          # postgres(pgvector), minio, mailpit
src/
  backend/                  # NestJS – Sơn sở hữu
    prisma/                 # schema.prisma, migrations, seed (dòng họ mẫu)
    src/modules/
      auth/  users/  trees/  persons/  relationships/  change-requests/
      timeline/  relationship-finder/  stats/  comments/  memories/
      events/  notifications/  storage/
      ai/                   # LLM client dùng chung, AI tiểu sử, RAG – Nhật sở hữu
    test/
  frontend/                 # React + Vite – Quân sở hữu
    src/
      app/                  # router, providers, layout
      pages/
      features/<feature>/   # family-tree, person-profile, timeline, relationship-finder, ...
      features/chatbot/     # Nhật sở hữu
      features/biography/   # nút AI tiểu sử trên trang hồ sơ – Nhật sở hữu
      components/ui/        # shadcn/ui
      lib/api/              # API client, TanStack Query hooks
      mocks/                # MSW handlers theo api-contracts
  shared/                   # Type + Zod schema dùng chung (DTO, enum role, relationship kind)
docs/                       # Bình sở hữu: báo cáo, diagrams/, hướng dẫn, test case
```

- Thay đổi trong `src/shared/` cần người liên quan review.
- Module trong backend tổ chức theo domain, không theo tầng kỹ thuật.

## Các phương án đã cân nhắc
- **Hai repo riêng FE/BE:** khó dùng chung type, trái nguyên tắc "một repo – một nguồn sự thật".
- **Nx/Turborepo:** mạnh nhưng thừa với 2 app.

## Hệ quả
- (+) Đổi DTO một chỗ, cả FE và BE báo lỗi type ngay.
- (−) CI phải chạy theo từng workspace (lọc theo đường dẫn thay đổi).
