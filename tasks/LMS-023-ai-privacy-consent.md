# LMS-023: Đồng ý và riêng tư khi dùng AI

- **Trạng thái:** In Progress
- **Owner:** Nhật
- **Sprint:** Sprint 08
- **Spec liên quan:** `specs/features.md` (C1, C2), `specs/user-roles.md`, ADR-0008
- **Nguồn:** Nhận xét tiến độ ĐATN nhóm 3, mục 1.9 và "Nguyên tắc chung khi sử dụng AI" (mục 5)

## User story
Là trưởng họ (Admin), tôi muốn biết dữ liệu nào của dòng họ được gửi sang dịch vụ AI và chỉ bật AI khi tôi đồng ý, để thông tin của người còn sống không bị đưa ra ngoài khi chưa được phép.

## Tiêu chí chấp nhận
- [x] Gia phả mặc định **tắt** AI. Chưa bật thì `POST /trees/:treeId/chat` trả `403 AI_CONSENT_REQUIRED`, không gọi Gemini, không trừ hạn mức
- [x] Chỉ Admin bật/tắt được (`PUT /trees/:treeId/chat/settings`), thành viên khác nhận `403 AI_SETTINGS_FORBIDDEN`, người ngoài nhận `404`
- [x] Lưu thời điểm và người bật (`aiEnabledAt`, `aiEnabledById`). Đổi tùy chọn khi đang bật không đổi thời điểm đồng ý
- [x] Mặc định ẩn nghề nghiệp, nơi ở, tiểu sử, ngày sinh cụ thể (chỉ giữ năm) của người còn sống với AI. Hồ sơ của chính người hỏi và người đã mất giữ nguyên
- [x] Ẩn trên snapshot trước khi vào tool, nên `search_content` và embedding cũng chỉ thấy bản đã ẩn
- [x] Hỏi về chi tiết bị ẩn thì chatbot nói "được ẩn theo cài đặt riêng tư", không nói "gia phả không có"
- [x] Tắt AI thì xóa embedding của gia phả
- [x] Trang Hỏi đáp AI: Admin thấy giải thích dữ liệu nào được gửi, tùy chọn chia sẻ chi tiết người còn sống, nút "Đồng ý và bật". Thành viên khác thấy lời nhắn nhờ trưởng họ bật
- [x] Khi đang bật: dòng trạng thái riêng tư dưới ô hỏi; Admin mở ra để đổi tùy chọn hoặc tắt
- [x] `ai:chat`, `ai:eval` dùng cùng luật. Seed bật sẵn AI cho hai gia phả mẫu (hư cấu / người của công chúng)
- [x] Chạy migration trên DB thật và kiểm thử trên web (Admin bật, Viewer bị chặn, tắt rồi bật lại)
- [ ] Chạy lại `npm run ai:eval` sau khi seed để chắc 34/34 không đổi

## Ghi chú kỹ thuật
- Code: `src/backend/src/modules/ai/ai-privacy.ts` (`snapshotForAi`, `PRIVACY_RULES`), `chat.service.ts` (`updateSettings`, kiểm tra đồng ý trong `prepare`), `chat.controller.ts`, `cli/setup.ts`. Frontend: `features/chatbot/AiConsentPanel.tsx`, `pages/ChatPage.tsx`.
- Test: `ai-privacy.test.ts`, `chat.service.test.ts` (suite "đồng ý và riêng tư").
- Migration: `20261128090000_ai_privacy_consent`. Gia phả có sẵn sẽ tắt AI cho tới khi Admin bật.
- Kiểm thử 2026-11-28 (DB Docker, Gemini thật, Chromium chạy ngầm bằng Playwright): migration làm cả 3 gia phả có sẵn tắt AI, seed bật lại 2 gia phả mẫu. API: Viewer `PUT settings` → 403 `AI_SETTINGS_FORBIDDEN`; body sai → 400; gia phả không phải thành viên → 404; Admin tắt → Viewer và cả Admin hỏi đều nhận 403 `AI_CONSENT_REQUIRED`, không mất lượt; embedding của gia phả 35 → 0, bật lại ở chế độ ẩn thì chỉ embed lại 11 người (đã mất + người hỏi). Hỏi "Lê Đình Hùng làm nghề gì?" khi đang ẩn → "được ẩn theo cài đặt riêng tư… xem trang hồ sơ". Web: Admin thấy thẻ đồng ý, ô chia sẻ mặc định không chọn, ô hỏi khóa; Viewer chỉ thấy lời nhắn; bật → mở ô hỏi và hiện dòng trạng thái; Viewer tải lại thì hỏi được, không có nút tắt; Admin tắt (có hộp xác nhận) → quay về thẻ đồng ý; màn hình 390 px không tràn ngang; trang chat không có lỗi console.
- Không thuộc task này: ẩn thông tin người còn sống với người ngoài chi trên trang hồ sơ (cần phân quyền theo chi, mục 1.8 của nhận xét).
