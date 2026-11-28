# ADR-0008: Đồng ý gửi dữ liệu sang AI và ẩn chi tiết người còn sống

- **Trạng thái:** Proposed
- **Ngày:** 2026-11-28
- **Task:** LMS-023

## Bối cảnh

- Nhận xét tiến độ đồ án (mục 1.9 và mục 5) yêu cầu: dữ liệu người còn sống mặc định riêng tư, **phải có sự đồng ý trước khi gửi dữ liệu sang dịch vụ AI**, nội dung AI tạo phải được gắn nhãn và duyệt.
- Chatbot (ADR-0004, ADR-0005) đang gửi kết quả tool lên Gemini cho mọi gia phả, không hỏi ai. Kết quả tool gồm tên, ngày sinh, nghề nghiệp, nơi ở, tiểu sử của cả người còn sống, và văn bản tiểu sử được embed bằng Gemini.
- ADR-0005 đã ghi rủi ro: free tier của Gemini có thể dùng dữ liệu để cải thiện sản phẩm, "trước khi demo bằng dữ liệu gia đình thật thì phải chuyển sang gói trả phí hoặc xin đồng ý".
- Luật Bảo vệ dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP) yêu cầu chủ thể dữ liệu đồng ý trước khi xử lý và chuyển dữ liệu cho bên thứ ba.

## Quyết định

1. **AI tắt theo mặc định cho từng gia phả.** Admin bật trên trang Hỏi đáp AI sau khi đọc dữ liệu nào được gửi. Lưu `FamilyTree.aiEnabledAt` và `aiEnabledById` làm bằng chứng đồng ý. Gia phả chưa bật thì mọi API AI trả `403 AI_CONSENT_REQUIRED` **trước khi** tải dữ liệu hay gọi Gemini, và không trừ hạn mức.
2. **Ẩn chi tiết người còn sống theo mặc định** (`aiShareLivingDetails = false`). Với người chưa mất, trước khi dữ liệu vào bất kỳ tool nào:
   - bỏ nghề nghiệp, nơi ở hiện tại, tiểu sử;
   - rút ngày sinh về năm (`birthDatePrecision = YEAR`);
   - giữ tên, giới tính, năm sinh, quê quán và quan hệ, đủ cho câu hỏi quan hệ, xưng hô và thống kê.

   Ngoại lệ: hồ sơ của **chính người đang hỏi** giữ nguyên, vì họ tự hỏi về mình.
3. **Ẩn ở tầng dữ liệu, không ở prompt.** `snapshotForAi()` (`ai-privacy.ts`) chạy trên snapshot trước khi dựng `FamilyGraph`, nên tool, kết quả `search_content` và văn bản đem embed đều chỉ thấy bản đã ẩn. Prompt chỉ thêm một luật để model nói "thông tin được ẩn theo cài đặt riêng tư" thay vì "gia phả chưa có".
4. **Không bao giờ gửi** số điện thoại, email, địa chỉ, nhóm máu, mã định danh, ghi chú. Snapshot vốn không đọc các trường này. Giữ nguyên như vậy là ràng buộc của ADR này.
5. **Rút lại đồng ý:** Admin tắt AI thì xóa `PersonEmbedding` của mọi người trong gia phả (dữ liệu dẫn xuất từ văn bản đã gửi đi).
6. Tính năng AI mới (tiểu sử LMS-015, gợi ý câu hỏi LMS-024, chép lời kể LMS-025…) phải đi qua cùng cổng đồng ý và `snapshotForAi`.

## Các phương án đã cân nhắc

- **Đồng ý theo từng người** (mỗi thành viên tự cho phép gửi hồ sơ của mình): đúng tinh thần luật hơn, nhưng phần lớn người trong gia phả không có tài khoản (đã mất, trẻ em, người lớn tuổi). Để lại cho phần phân quyền theo chi (mục 1.8), có thể thêm cờ riêng từng hồ sơ sau.
- **Ẩn hết người còn sống, chỉ dùng mã thay tên:** chatbot không trả lời được "Bác Phúc là gì của tôi?", mất giá trị chính của C1.
- **Chỉ ghi điều khoản trong trang đăng ký:** không có bằng chứng ai đồng ý cho gia phả nào, không rút lại được.
- **Chuyển sang gói Gemini trả phí:** giảm rủi ro dùng dữ liệu để huấn luyện, nhưng không thay được bước đồng ý. Vẫn nên làm trước khi dùng dữ liệu thật.

## Hệ quả

- (+) Trả lời được câu hỏi của hội đồng: dữ liệu gì đi ra ngoài, ai cho phép, lúc nào, tắt thế nào.
- (+) Mặc định an toàn: gia phả mới hoặc gia phả có sẵn đều chưa gửi gì cho tới khi Admin bật.
- (−) Câu hỏi về nghề nghiệp, nơi ở của người còn sống ("Ai làm bác sĩ?") không trả lời được khi để mặc định. Dữ liệu mẫu (hư cấu) bật `aiShareLivingDetails` để `ai:eval` giữ nguyên.
- (−) Một người thuộc nhiều gia phả có cài đặt khác nhau thì embedding bị tạo lại khi đổi gia phả hỏi (hash văn bản đổi). Chấp nhận được vì hiếm.
- (!) Migration `20261128090000_ai_privacy_consent`: gia phả có sẵn trên máy chủ sẽ tắt AI cho tới khi Admin bật. Chạy lại `npm run db:seed` để bật cho dữ liệu mẫu.
