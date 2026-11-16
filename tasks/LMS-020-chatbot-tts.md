# LMS-020: Chatbot đọc câu trả lời thành tiếng

- **Trạng thái:** In Progress
- **Owner:** Nhật
- **Sprint:** Sprint 07
- **Spec liên quan:** `specs/features.md` (C1), ADR-0006

## User story
Là thành viên lớn tuổi trong dòng họ, tôi muốn nghe trợ lý đọc câu trả lời bằng tiếng Việt, để không phải đọc chữ nhỏ trên điện thoại.

## Tiêu chí chấp nhận
- [x] Mỗi câu trả lời đã xong có nút Đọc / Dừng đọc. Mỗi lúc chỉ đọc một câu trả lời
- [x] Công tắc "Tự đọc câu trả lời", nhớ lựa chọn trên trình duyệt
- [x] Đọc bằng giọng tiếng Việt của máy. Không đọc ký hiệu markdown hay đường link. Năm và ngày tháng đọc tự nhiên
- [x] Tự dừng khi hỏi câu mới, bắt đầu cuộc trò chuyện mới hoặc rời trang
- [x] Máy không có giọng tiếng Việt thì báo và hướng dẫn cài, không đọc bằng giọng tiếng Anh
- [ ] Kiểm thử thủ công trên Edge, Chrome Android, Safari iOS

## Ghi chú kỹ thuật
- Dùng Web Speech API (`speechSynthesis`), không cần backend (ADR-0006).
- Code: `src/frontend/src/features/chatbot/speech.ts` (làm sạch, cắt câu, chọn giọng, bộ đọc), `useSpeech.ts`, `ChatPage.tsx`.
- Kiểm thử 2026-11-16 (Edge chạy ngầm bằng Playwright, có theo dõi lệnh gọi `speechSynthesis`): bấm Đọc → đọc từng câu với `lang = vi-VN`, đã bỏ markdown, "1905 – 1988" thành "1905 đến 1988", `12/03/1988` thành "ngày 12 tháng 3 năm 1988"; nút đổi sang Dừng đọc và dừng được; Tự đọc lưu `localStorage`, đọc khi câu trả lời xong, tải lại trang không đọc câu cũ; máy chỉ có giọng tiếng Anh thì hiện hướng dẫn và không đọc. Chưa nghe bằng tai trên Edge, Chrome Android, Safari iOS (Edge chạy ngầm trên máy phát triển không có giọng tiếng Việt).
- Dự phòng (chưa làm): endpoint TTS bằng Gemini cho máy không có giọng tiếng Việt.
