# LMS-019: Gửi ảnh để hỏi chatbot

- **Trạng thái:** In Progress
- **Owner:** Nhật
- **Sprint:** Sprint 07
- **Spec liên quan:** `specs/features.md` (C1), ADR-0006

## User story
Là thành viên dòng họ, tôi muốn gửi ảnh bia mộ, trang gia phả chép tay hoặc ảnh cũ có ghi chú rồi hỏi trợ lý, để biết người trong ảnh là ai trong gia phả.

## Tiêu chí chấp nhận
- [x] Đính kèm 1 ảnh mỗi câu hỏi: chọn file, dán (paste), kéo thả, chụp bằng camera trên điện thoại (bộ chọn ảnh của máy). Có xem trước và gỡ ảnh
- [x] Ảnh được nén ở trình duyệt (cạnh dài ≤ 1280 px). Server chỉ nhận JPEG/PNG/WebP ≤ 1.5 MB, kiểm tra magic bytes
- [ ] Trợ lý đọc chữ trong ảnh rồi đối chiếu với dữ liệu dòng họ bằng tool. Không chắc thì nói không chắc (đã có prompt và câu eval I01, I02, I04; chờ chạy với Gemini thật)
- [ ] Chữ trong ảnh không điều khiển được trợ lý (chống prompt injection) (prompt + câu eval I03; chờ chạy với Gemini thật)
- [x] Ảnh không được lưu trên server. Lịch sử hội thoại chỉ giữ thumbnail ở trình duyệt
- [x] Hạn mức ảnh mỗi ngày (`AI_DAILY_IMAGE_LIMIT`)
- [x] Bộ đánh giá có thêm câu hỏi kèm ảnh (I01–I04)
- [ ] Kiểm thử thủ công trên trình duyệt (desktop, điện thoại)

## Ghi chú kỹ thuật
- Thiết kế: ADR-0006. Ảnh đi dưới dạng part `inlineData` của Gemini, không gửi lại ảnh trong lịch sử.
- Code: `chat.dto.ts`, `chat.service.ts`, `agent.ts`, `main.ts` (body limit cho route chat), `features/chatbot/`, `ChatPage.tsx`.
- Branch: `feature/LMS-019-chatbot-image`.
