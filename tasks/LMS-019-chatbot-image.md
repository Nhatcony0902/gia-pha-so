# LMS-019: Gửi ảnh để hỏi chatbot

- **Trạng thái:** In Progress
- **Owner:** Nhật
- **Sprint:** Sprint 07
- **Spec liên quan:** `specs/features.md` (C1), ADR-0006

## User story
Là thành viên dòng họ, tôi muốn gửi ảnh bia mộ, trang gia phả chép tay hoặc ảnh cũ có ghi chú rồi hỏi trợ lý, để biết người trong ảnh là ai trong gia phả.

## Tiêu chí chấp nhận
- [x] Đính kèm 1 ảnh mỗi câu hỏi: chọn file, dán (paste), kéo thả, chụp bằng camera trên điện thoại (bộ chọn ảnh của máy). Có xem trước và gỡ ảnh
- [x] Nút Chụp ảnh riêng: máy tính mở webcam ngay trong trang (xem trước, Chụp, Đổi camera), điện thoại mở ứng dụng camera của máy. Không cấp quyền hoặc không có camera thì báo lỗi và cho chọn ảnh có sẵn
- [x] Ảnh được nén ở trình duyệt (cạnh dài ≤ 1280 px). Server chỉ nhận JPEG/PNG/WebP ≤ 1.5 MB, kiểm tra magic bytes
- [x] Trợ lý đọc chữ trong ảnh rồi đối chiếu với dữ liệu dòng họ bằng tool. Không chắc thì nói không chắc (eval 22/11: I01, I02, I04 đạt)
- [x] Chữ trong ảnh không điều khiển được trợ lý (chống prompt injection) (eval 22/11: I03 đạt)
- [x] Ảnh không được lưu trên server. Lịch sử hội thoại chỉ giữ thumbnail ở trình duyệt
- [x] Hạn mức ảnh mỗi ngày (`AI_DAILY_IMAGE_LIMIT`)
- [x] Bộ đánh giá có thêm câu hỏi kèm ảnh (I01–I04)
- [ ] Kiểm thử thủ công trên trình duyệt (desktop, điện thoại), gồm cả chụp bằng webcam và camera điện thoại

## Ghi chú kỹ thuật
- Thiết kế: ADR-0006. Ảnh đi dưới dạng part `inlineData` của Gemini, không gửi lại ảnh trong lịch sử.
- Code: `chat.dto.ts`, `chat.service.ts`, `agent.ts`, `main.ts` (body limit cho route chat), `features/chatbot/` (`image.ts` nén ảnh, `camera.ts` + `CameraCapture.tsx` chụp ảnh), `ChatPage.tsx`.
- Kiểm thử 2026-11-16 (Edge chạy ngầm bằng Playwright, camera giả của Chromium, server Gemini giả): mở/đóng hộp thoại và camera tắt theo, chụp → xem trước → gỡ → gửi (Gemini nhận đúng 1 ảnh JPEG, câu hỏi mặc định, lịch sử không kèm ảnh), bị từ chối quyền → báo lỗi + Chọn ảnh có sẵn, camera bị ngắt giữa chừng → báo lỗi + Thử lại, giả lập điện thoại 390 px mở `<input capture>` và không tràn ngang. Chưa thử với webcam thật và điện thoại thật.
- Chạy I01–I04 với Gemini thật ngày 2026-11-16 chưa được: `gemini-3.5-flash` không phản hồi, `gemini-3.8-flash` trả 503 "high demand". Cần chạy lại `npm run ai:eval -- --only I01,I02,I03,I04 --no-search`.
- Chụp ảnh dùng `getUserMedia` (chỉ video, không xin micro), cần HTTPS hoặc localhost. Khung hình chụp đi qua đúng luồng nén của ảnh chọn từ máy, không đổi API.
- Branch: `feature/LMS-019-chatbot-image`.
