# LMS-021: Hỏi chatbot bằng giọng nói

- **Trạng thái:** In Progress
- **Owner:** Nhật
- **Sprint:** Sprint 07
- **Spec liên quan:** `specs/features.md` (C1), ADR-0007
- **Tham khảo:** P-147 GlucoCare (`web/components/voice-input.tsx`, `report/voice-stt-model-choice.md`)

## User story
Là thành viên lớn tuổi trong dòng họ, tôi muốn nói câu hỏi thay vì gõ, để hỏi trợ lý nhanh hơn trên điện thoại.

## Tiêu chí chấp nhận
- [x] Nút micro cạnh nút Gửi. Bấm thì nghe tiếng Việt, chữ hiện dần trong ô câu hỏi khi đang nói
- [x] Ngừng giữa câu không bị cắt: chỉ tự dừng sau 2,5 s không có chữ mới, tối đa 30 s. Bấm lại nút thì dừng ngay
- [x] Trong lúc nghe hiện lời nhắc (đưa máy sát miệng, nói xong tự dừng) và câu quyền riêng tư
- [x] Trình duyệt không chắc (độ tin cậy < 0,6) thì nhắc đọc lại chữ, nhất là tên người
- [x] Không tự gửi: câu nhận dạng được nối vào chữ đã gõ, người dùng sửa được rồi mới gửi
- [x] Đang nghe mà tự gõ, hoặc gửi câu hỏi, thì tắt micro và bỏ kết quả về muộn
- [x] Bật micro thì dừng giọng đọc; không tự đọc câu trả lời khi đang nghe
- [x] Trình duyệt không hỗ trợ thì ẩn nút. Chặn quyền micro, không có micro, không nghe thấy, mất mạng thì báo bằng tiếng Việt
- [ ] Kiểm thử thủ công bằng micro thật trên Chrome/Edge máy tính, Chrome Android, Safari iOS

## Ghi chú kỹ thuật
- Dùng Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`), không cần backend (ADR-0007).
- Code: `src/frontend/src/features/chatbot/dictation.ts` (ghép chữ, lời nhắn lỗi, lớp `Dictation`), `useDictation.ts`, `ChatPage.tsx`. Test: `dictation.test.ts`.
- Kiểm thử 2026-11-23 (Chromium chạy ngầm bằng Playwright, thay `SpeechRecognition` bằng bản giả vì không có micro): cấu hình `vi-VN`, `interimResults`, `continuous`; lời nhắc và câu quyền riêng tư hiện khi nghe, ẩn khi xong; chữ tạm hiện ngay và nối sau chữ đã gõ; kết thúc thì giữ chữ trong ô, không tự gửi, focus về ô; ngừng 1,5 s vẫn nghe, im 2,5 s thì tự `stop()`; độ tin cậy 0,42 thì nhắc đọc lại, sửa chữ thì ẩn nhắc; nút Dừng nghe gọi `stop()`; lỗi `no-speech` hiện thông báo và đóng được; tự gõ khi đang nghe thì gọi `abort()` và kết quả về muộn không ghi đè; không có API thì ẩn nút; màn hình 390 px không tràn ngang. Chưa thử bằng micro thật.
- Không làm (Nhật chốt 23/11/2026, xem ADR-0007): ghi âm gửi backend để Gemini chép với gợi ý là tên người trong gia phả. Chỉ dùng Web Speech: miễn phí, không cần key, không tốn lượt Gemini.
