# LMS-001: Khởi tạo dự án, hạ tầng & CI

- **Trạng thái:** Todo
- **Owner:** Sơn + Quân (cả nhóm chốt ADR, ERD)
- **Sprint:** Sprint 01
- **Spec liên quan:** `specs/features.md` (ADR-0001/0002/0003)

## User story
Là thành viên nhóm, tôi muốn có khung dự án chạy được bằng một lệnh để mọi người làm song song mà không vướng môi trường.

## Tiêu chí chấp nhận
- [ ] 3 ADR chuyển `Accepted`
- [ ] Có ERD + mô hình đồ thị quan hệ (lưu trong `docs/`)
- [ ] Có wireframe các màn hình chính
- [ ] `docker compose up` chạy Postgres (pgvector), MinIO, Mailpit
- [ ] Backend và frontend chạy local; `GET /health` trả 200
- [ ] CI chạy lint + test + build cho các workspace

## Phân việc
### BE – Sơn
- Monorepo npm workspaces, NestJS + Prisma, docker-compose
- Error handler chuẩn, validation pipe, logging
- GitHub Actions

### FE – Quân
- Vite + React + TS, Tailwind + shadcn/ui, router, layout
- API client + TanStack Query, MSW
- Wireframe

### AI Chatbot – Nhật
- Phần AI của ADR-0002: chọn LLM + embedding

## Ghi chú kỹ thuật
Cấu trúc thư mục theo ADR-0003.
