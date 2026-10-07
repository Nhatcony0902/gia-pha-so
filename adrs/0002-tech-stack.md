# ADR-0002: Tech Stack

- **Trạng thái:** Proposed
- **Ngày:** 2026-10-07

## Bối cảnh
Tài liệu dự án (mục 3) đã đề xuất stack cho nhóm 4 người. Nhóm thực tế có 3 người code (Sơn BE, Quân FE, Nhật AI) và 1 người tài liệu (Bình), nên ở những chỗ tài liệu để "A hoặc B", ADR này chọn phương án ít hạ tầng hơn.

## Quyết định
| Lớp | Lựa chọn |
|---|---|
| Frontend | React 18 + TypeScript + Vite, Tailwind CSS + shadcn/ui, Zustand + TanStack Query, React Hook Form + Zod |
| Trực quan hóa | React Flow + elkjs/dagre (cây 2D), D3.js (radial), React Three Fiber (3D), Recharts (biểu đồ) |
| Backend | Node.js + NestJS + TypeScript, Passport JWT + Guard (RBAC), Socket.IO Gateway, Prisma |
| CSDL | PostgreSQL + extension pgvector |
| Đồ thị | Lưu cạnh trong PostgreSQL. BFS chạy ở tầng service trên tập cạnh của một dòng họ (vài nghìn node trở xuống). Dùng recursive CTE cho truy vấn tổ tiên/hậu duệ |
| Tác vụ nền | `@nestjs/schedule` (cron hằng ngày cho nhắc giỗ/sự kiện) |
| Lưu trữ tệp | API S3-compatible: MinIO khi dev; cloud storage S3-compatible khi deploy |
| Email | SMTP (Mailpit khi dev) |
| Âm lịch | Thư viện chuyển đổi âm–dương lịch (chọn ở Sprint 06) |
| AI | LLM API (Claude hoặc GPT, Nhật chốt ở Sprint 01). Pipeline RAG tự viết bằng TypeScript, embedding lưu trong pgvector |
| Hạ tầng | Docker Compose (dev), GitHub Actions (CI), Vercel (FE), Render/Railway/Cloud Run (BE), Postgres managed có pgvector |

## Các phương án đã cân nhắc
- **Apache AGE / Neo4j cho đồ thị:** mạnh hơn cho graph traversal, nhưng thêm một hệ thống cần vận hành và học. Với quy mô một dòng họ, BFS trong bộ nhớ là đủ. Chỉ xem xét lại nếu đo thấy chậm.
- **BullMQ + Redis:** cần thêm Redis. Khối lượng job (vài email/ngày) không đáng để thêm.
- **LangChain.js / LlamaIndex.TS:** tài liệu cho phép, nhưng pipeline tự viết dễ kiểm soát và dễ giải trình trước hội đồng hơn.
- **Firebase Storage:** gắn chặt với Firebase. Dùng S3 API thì chạy local được bằng MinIO.

## Hệ quả
- (+) Docker Compose chỉ cần Postgres, MinIO và Mailpit.
- (+) TypeScript cả hai đầu, chia sẻ được type và Zod schema (ADR-0003).
- (−) Nếu dòng họ rất lớn (> 10k người), BFS trong bộ nhớ cần cache hoặc chuyển sang Apache AGE.
- (!) Anthropic không có embedding model riêng. Nếu chọn Claude làm LLM thì cần thêm một nhà cung cấp embedding (ví dụ Voyage AI hoặc OpenAI embeddings). Phải chốt cùng lúc ở Sprint 01.
