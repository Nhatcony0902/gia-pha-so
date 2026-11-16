# ADR-0006: Chatbot nhận ảnh và đọc câu trả lời thành tiếng

- **Trạng thái:** Proposed
- **Ngày:** 2026-11-13

## Bối cảnh

- Chatbot (ADR-0004, ADR-0005) mới chỉ nhận chữ và trả lời bằng chữ.
- Người dùng muốn gửi ảnh để hỏi, ví dụ ảnh bia mộ, trang gia phả chép tay hoặc ảnh cũ có ghi chú: "Bia này của ai trong họ?".
- Nhiều thành viên dòng họ là người lớn tuổi, đọc chữ nhỏ trên điện thoại khó. Cần nghe được câu trả lời.
- Ràng buộc: free tier Gemini rất ít request mỗi ngày, ảnh tốn token, và dữ liệu gia đình là dữ liệu riêng tư.

## Quyết định

### 1. Ảnh: gửi kèm câu hỏi dưới dạng base64 tới Gemini, không lưu lại

- `POST /trees/:treeId/chat` nhận thêm `image?: { mimeType, data }` (base64). Mỗi câu hỏi tối đa 1 ảnh, chỉ JPEG/PNG/WebP. Server kiểm tra magic bytes và giới hạn 1.5 MB sau khi giải mã.
- Trình duyệt nén ảnh trước khi gửi (cạnh dài ≤ 1280 px, JPEG) để request nhỏ và đỡ token.
- Ảnh được gửi cho Gemini dưới dạng part `inlineData` trong lượt hỏi cuối. Model vẫn dùng các tool cũ (`find_person`, `get_relatives`…) để đối chiếu với dữ liệu dòng họ.
- **Không lưu ảnh** (không DB, không Cloudinary). Lịch sử hội thoại gửi lên chỉ có chữ, kèm ghi chú "[đã gửi 1 ảnh]".
- System prompt coi chữ trong ảnh là dữ liệu, không phải lệnh (chống prompt injection qua ảnh). Đọc không rõ thì nói không chắc, không đoán.
- Hạn mức riêng `AI_DAILY_IMAGE_LIMIT` (mặc định 10 ảnh/ngày/tài khoản), tính thêm vào hạn mức câu hỏi.
- Không làm nhận diện khuôn mặt.

### 2. Đọc thành tiếng: Web Speech API của trình duyệt

- Dùng `window.speechSynthesis`, chọn giọng `vi-*` có sẵn trên máy. Ưu tiên giọng "Natural"/"Online" (Edge: HoaiMy, NamMinh). Android và iOS (Linh) đều có giọng tiếng Việt.
- Trước khi đọc thì làm sạch văn bản: bỏ markdown và link, đọc "1905 – 1988" thành "1905 đến 1988", đọc `12/03/1950` thành "ngày 12 tháng 3 năm 1950". Câu dài được cắt nhỏ, vì Chrome hay tự ngắt khi một lần đọc quá dài.
- Mỗi câu trả lời có nút Đọc/Dừng. Có công tắc "Tự đọc câu trả lời" (lưu `localStorage`), đọc khi câu trả lời đã xong chứ không đọc lúc đang stream. Lý do: phần đang stream có thể bị `discard`, và bản cuối còn được làm sạch link.
- Hoàn toàn ở frontend, không tốn request Gemini, không gửi thêm dữ liệu đi đâu.

## Các phương án đã cân nhắc

- **Ảnh: tải lên Cloudinary trước rồi gửi URL (dùng lại luồng ảnh hồ sơ).** Có sẵn hạ tầng, nhưng phải lưu ảnh riêng tư của người dùng, thêm một bước tải lên, và backend phải tải ảnh về lại để gửi cho Gemini. Không cần cho mục đích hỏi đáp.
- **Ảnh: `multipart/form-data`.** Đỡ khoảng 33% dung lượng so với base64, nhưng phải đổi cách validate DTO (`expectedType`) và luồng SSE đang dùng body JSON. Ảnh đã được nén nhỏ nên base64 vẫn chấp nhận được.
- **TTS: model TTS của Gemini.** Giọng tự nhiên và giống nhau trên mọi máy, nhưng tốn request (free tier rất ít), chậm hơn, phải đổi PCM sang WAV, và gửi câu trả lời đi thêm một lần. Để làm dự phòng sau này cho máy không có giọng tiếng Việt.
- **TTS: dịch vụ tiếng Việt riêng (FPT.AI, Zalo AI, Google Cloud TTS).** Giọng tốt, nhưng thêm nhà cung cấp và key, đi ngược mục tiêu một nhà cung cấp của ADR-0005.

## Hệ quả

- (+) TTS không tốn chi phí, phản hồi ngay, chạy cả khi Gemini hết quota.
- (+) Ảnh không bị lưu, giảm rủi ro riêng tư. Câu hỏi bằng ảnh vẫn đi qua đúng các tool có kiểm tra quyền.
- (−) Chất lượng giọng đọc tùy máy. Máy không có giọng tiếng Việt (ví dụ Windows chưa cài gói ngôn ngữ) thì không đọc được, UI hiện hướng dẫn cài giọng.
- (−) Mỗi ảnh tốn thêm khoảng vài trăm đến hơn nghìn token đầu vào. Body của route chat phải nâng lên khoảng 2 MB (mặc định của Express là 100 KB).
- (!) Hỏi tiếp về ảnh ở câu sau thì model không còn thấy ảnh, chỉ thấy câu trả lời trước đó. Người dùng phải gửi lại ảnh nếu cần.
- (!) Ảnh vẫn được gửi cho Google. Lưu ý về free tier trong ADR-0005 áp dụng cho cả ảnh.
