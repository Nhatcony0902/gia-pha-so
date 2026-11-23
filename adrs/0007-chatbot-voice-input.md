# ADR-0007: Hỏi chatbot bằng giọng nói

- **Trạng thái:** Proposed
- **Ngày:** 2026-11-23

## Bối cảnh

- ADR-0006 đã cho chatbot đọc câu trả lời thành tiếng. Người dùng vẫn phải gõ câu hỏi.
- Nhiều thành viên dòng họ là người lớn tuổi, gõ tiếng Việt có dấu trên điện thoại chậm và dễ sai. Họ muốn nói câu hỏi.
- Dự án P-147 (GlucoCare, cùng người lead) đã làm và đo nhận giọng nói tiếng Việt cho người lớn tuổi (`report/voice-stt-model-choice.md`, 06/10/2026: 3 người, 80 câu, 8 cách nghe). ADR này dùng lại cách làm và số đo đó.
- Ràng buộc như ADR-0005 và ADR-0006: free tier Gemini rất ít request mỗi ngày, dữ liệu gia đình là dữ liệu riêng tư, chỉ dùng một nhà cung cấp AI.

## Quyết định

Dùng Web Speech API (`SpeechRecognition`) của trình duyệt để đọc chính tả vào ô câu hỏi.

- Nút micro cạnh nút Gửi. Bấm thì nghe với `lang = "vi-VN"`, `interimResults = true` để chữ hiện dần trong lúc nói.
- Theo P-147: người lớn tuổi hay ngừng giữa câu, nên nghe liên tục (`continuous = true`) và **chỉ tự dừng sau 2,5 s không có chữ mới**, tối đa 30 s. Bấm lại nút thì dừng ngay. Chrome Android khi nghe liên tục hay lặp lại câu trước ở đầu đoạn sau, nên khi ghép chữ thì đoạn nào bắt đầu bằng đoạn trước thì thay đoạn trước.
- Trong lúc nghe hiện lời nhắc (đưa máy sát miệng, nói chậm và rõ; nói xong tự dừng, đọc lại rồi bấm Gửi) và câu quyền riêng tư. Đoạn đã chốt có độ tin cậy dưới 0,6 (Chrome trả 0 khi không chấm, coi là không biết) thì nhắc đọc lại chữ, nhất là tên người.
- **Không tự gửi.** Câu nhận dạng được nối vào chữ đang có trong ô để người dùng xem, sửa tên người (hay bị nhận sai) rồi mới bấm Gửi. Câu hỏi đi qua đúng luồng và hạn mức như câu gõ.
- Trình duyệt không có API (Firefox) thì ẩn nút micro. Lỗi (chặn quyền micro, không có micro, không nghe thấy, mất mạng, không hỗ trợ tiếng Việt) hiện lời nhắn tiếng Việt cạnh ô nhập.
- Bật micro thì tắt giọng đọc đang phát, và không tự đọc câu trả lời trong lúc đang nghe, để micro không thu giọng đọc.
- Hoàn toàn ở frontend: không thêm endpoint, không tốn request Gemini.

## Các phương án đã cân nhắc

- **Ghi âm (`MediaRecorder`) rồi gửi lên backend để Gemini chép, kèm danh sách tên người trong gia phả làm gợi ý.** Đây là cách P-147 chọn (với `gpt-transcribe` + tên thuốc). Số đo của P-147: so với Web Speech, có gợi ý thì nghe đúng tên riêng có trong danh sách hơn rõ (sót 2–3/12 so với 9/12), nhưng tỉ lệ chữ sai chung chưa phân biệt được (WER 14,6% so với 17,6%, khoảng tin cậy chứa 0); Gemini + gợi ý p50 5,7 s, có lần 503. Ở dự án này tên người trong gia phả đóng vai tên thuốc, nên đáng làm, nhưng mỗi câu hỏi tốn thêm một request Gemini (free tier rất ít, đang hay quá tải), phải ghi xong mới có chữ, thêm endpoint nhận audio, và gửi cả giọng nói lẫn danh sách tên người cho Google. **Không làm** (Nhật chốt 23/11/2026: chỉ dùng Web Speech, miễn phí và không cần key). Nếu sau này cần thì Web Speech vẫn là đường dự phòng như P-147 (lỗi 2 lần liên tiếp thì quay về Web Speech).
- **Đo tiếng ồn 0,5 s trước khi nghe (như P-147).** Bỏ: phải mở micro bằng `getUserMedia` trước Web Speech, plan của P-147 ghi rủi ro giữ micro làm Web Speech không mở được trên Chrome Android và hỏi quyền hai lần. Chỉ giữ lời nhắc đưa máy sát miệng.
- **Gửi audio thẳng làm câu hỏi cho agent (không qua chữ).** Đỡ một bước, nhưng người dùng không xem và sửa được câu trước khi hỏi, và lịch sử hội thoại không có chữ của câu hỏi.
- **Dịch vụ nhận dạng tiếng Việt riêng (FPT.AI, Zalo AI, Google Cloud Speech-to-Text).** Chất lượng tốt, nhưng thêm nhà cung cấp và key, đi ngược mục tiêu một nhà cung cấp của ADR-0005.

## Hệ quả

- (+) Không tốn chi phí và quota Gemini, chữ hiện ngay khi nói, không phải đổi backend.
- (+) Người dùng sửa được câu trước khi gửi, nên nhận dạng sai tên không làm hỏng câu trả lời.
- (−) Web Speech không biết tên người trong gia phả, nên hay nghe sai tên riêng (P-147: sót 9/12 tên thuốc có trong danh sách). Lời nhắc đọc lại và bước sửa trước khi gửi là cách bù hiện tại.
- (−) Không có trên Firefox. Chất lượng nhận dạng tùy trình duyệt.
- (−) Cần HTTPS hoặc localhost và quyền micro.
- (!) Chrome gửi âm thanh tới máy chủ của Google, Edge tới Microsoft, Safari tới Apple (hoặc nhận dạng ngay trên máy) để nhận dạng. Câu hỏi là chữ do người dùng tự nói ra, không có dữ liệu gia phả, nhưng vẫn cần ghi rõ trong tài liệu.
