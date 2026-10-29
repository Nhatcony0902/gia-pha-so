# LMS-016: AI Chatbot (RAG)

- **Trạng thái:** In Progress
- **Owner:** Nhật
- **Sprint:** Sprint 01–07
- **Spec liên quan:** `specs/features.md` (C1)

## User story
Là thành viên dòng họ, tôi muốn hỏi bằng ngôn ngữ tự nhiên về gia phả và nhận câu trả lời dựa trên dữ liệu thật.

## Tiêu chí chấp nhận
- [ ] Trả lời được: "Ông nội tôi là ai?", "Tôi có quan hệ gì với X?", "Ai sống thọ nhất?"
- [ ] Câu hỏi quan hệ dùng kết quả Relationship Finder (LMS-007)
- [ ] Không có dữ liệu thì nói không biết, không bịa; có link tới hồ sơ liên quan
- [ ] Trả lời dạng stream
- [ ] Chỉ truy cập dữ liệu dòng họ mà user có quyền xem
- [ ] Chạy bộ câu hỏi đánh giá (≥ 20 câu) trước mỗi demo, ghi kết quả vào `docs/`

## Phân việc
### AI Chatbot – Nhật
- S01: chốt LLM + embedding (ADR-0002), bộ câu hỏi đánh giá
- S02: prototype pipeline trên dữ liệu seed
- S03: module `ai` (LLM client dùng chung), văn bản mô tả mỗi người → embedding → pgvector
- S04: re-embed khi dữ liệu đổi (hook ChangeService), vector search + truy vấn SQL
- S05: phân loại câu hỏi → Relationship Finder / SQL thống kê / vector; giới hạn theo quyền
- S06: endpoint chat SSE + chat UI (stream, câu hỏi gợi ý, link hồ sơ)
- S07: chạy đánh giá, tinh chỉnh prompt, giới hạn chi phí/lượt hỏi, deploy, viết phần AI trong báo cáo

## Ghi chú kỹ thuật
- Kiến trúc chatbot: RAG có tool calling, xem ADR-0004.
- Phụ thuộc Sơn: schema Person/Relationship (S02), hook ChangeService (S02), service Relationship Finder (S04), Guard RBAC (S05).
- Phụ thuộc Quân: layout + shadcn/ui để chat UI đồng bộ giao diện, route tới trang hồ sơ.
- Code: `src/backend/src/modules/ai/`, `src/frontend/src/features/chatbot/`. Branch: `feature/LMS-016-rag-chatbot-<phần>`.
- Dự phòng nếu trễ: bỏ vector search, chỉ dùng truy vấn có cấu trúc + Relationship Finder.

## Hiện trạng phụ thuộc (đánh giá ngày 2026-10-17, nhánh `dev` @ `fe567f4`)

| Thứ chatbot cần | Hiện trạng | Ảnh hưởng |
|---|---|---|
| Xác thực, lấy `userId` từ request | Có: `JwtAuthGuard`, `request.user.userId` | Dùng lại được ngay |
| Dữ liệu Person/Relationship có `birthOrder`, ngày sinh/mất | Có, kèm `GET /trees/:treeId/graph` trả cả cây | Viết được `find_person`, `get_relatives`, `get_stats` |
| Kiểm tra quyền xem dòng họ | Chỉ có kiểm tra người tạo (`ownedTree`, `createdById`). Chưa có Membership/vai trò (LMS-010) | Tạm dùng lại `ownedTree`, sau đổi sang Guard RBAC |
| Liên kết user ↔ Person ("tôi") | **Chưa có** | Chặn "Ông nội tôi là ai?" và "Tôi có quan hệ gì với X?". Tạm thời cho user chọn "Tôi là…" trên UI chat |
| Relationship Finder (LMS-007) | **Chưa có** | Chặn `find_relationship`. Có thể viết BFS tạm, chưa có xưng hô |
| `ChangeService` / hook ghi dữ liệu | **Chưa có**, `TreesService` ghi thẳng | Chưa re-embed tự động được. Tạm so `updatedAt` để embed lại khi cần |
| pgvector | Image `pgvector/pgvector:pg16` có sẵn, nhưng chưa có migration bật extension và chưa có bảng embedding | Thêm migration `CREATE EXTENSION vector` + bảng `PersonEmbedding` (Prisma dùng `Unsupported("vector(n)")` + raw SQL) |
| Dữ liệu văn bản để embed | Seed 41 người (hoàng gia Anh), không có `biography`/`occupation` | `search_content` chưa có gì để tìm. Cần seed tiểu sử, đủ ≥ 50 người theo product vision |
| Module `ai`, SDK LLM, biến môi trường API key | **Chưa có**, chưa chốt LLM + embedding | Việc S01 |
| SSE | Chưa có ở BE. FE `apiRequest` chỉ parse JSON | Cần `@Sse`/stream response ở BE và hàm fetch đọc `ReadableStream` ở FE (không dùng `EventSource` vì không gửi được header `Authorization`) |
| Test | Chưa có test runner ở `backend` | Cần thêm (ví dụ Vitest) để test tool và chạy bộ câu hỏi đánh giá |
| UI | Có layout, Navbar, route `/trees/:treeId/persons/:personId` cho link hồ sơ. Chưa có `features/chatbot/` | Làm được chat UI ngay |
| Nhánh `feature/LMS-005-relationship` | Chưa merge, sửa nhiều `trees.service.ts` | Module `ai` gọi qua service, không copy truy vấn, để tránh conflict |

## Tiến độ
- [x] ADR-0004 kiến trúc agentic RAG (PR #6, đang `Proposed`)
- [ ] Chốt LLM + embedding, bộ câu hỏi đánh giá ≥ 20 câu (việc S01, đang trễ)
- [ ] Prototype pipeline RAG trên dữ liệu seed (S02)
