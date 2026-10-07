# LMS-016: AI Chatbot (RAG)

- **Trạng thái:** Todo
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
- Phụ thuộc Sơn: schema Person/Relationship (S02), hook ChangeService (S02), service Relationship Finder (S04), Guard RBAC (S05).
- Phụ thuộc Quân: layout + shadcn/ui để chat UI đồng bộ giao diện, route tới trang hồ sơ.
- Code: `src/backend/src/modules/ai/`, `src/frontend/src/features/chatbot/`. Branch: `feature/LMS-016-rag-chatbot-<phần>`.
- Dự phòng nếu trễ: bỏ vector search, chỉ dùng truy vấn có cấu trúc + Relationship Finder.
