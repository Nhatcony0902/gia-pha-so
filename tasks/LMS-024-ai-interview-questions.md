# LMS-024: AI gợi ý câu hỏi phỏng vấn "Ông bà kể chuyện"

- **Trạng thái:** Todo
- **Owner:** Nhật
- **Sprint:** Sprint 08
- **Spec liên quan:** `specs/features.md` (C2, D4), ADR-0008
- **Nguồn:** Nhận xét tiến độ ĐATN nhóm 3, mục 4 ("Ông bà kể chuyện") và mục 5 (mức "Nên làm")
- **Phụ thuộc:** LMS-023 (cổng đồng ý AI)

## User story
Là con cháu, tôi muốn có sẵn bộ câu hỏi hợp với từng ông bà để phỏng vấn, ghi âm hoặc ghi chép lời kể trước khi những câu chuyện đó mất đi.

## Tiêu chí chấp nhận
- [ ] Bộ câu hỏi gốc theo chủ đề, không cần AI: tuổi thơ, quê hương, cha mẹ và anh chị em, học hành, nghề nghiệp, chiến tranh và thời bao cấp, ngày cưới, nuôi con, lời dặn con cháu
- [ ] Trên trang hồ sơ, nút "Gợi ý câu hỏi phỏng vấn": AI chọn và viết lại 8–12 câu dựa trên hồ sơ người đó (năm sinh → bối cảnh thời kỳ, quê quán, nghề nghiệp, số con, người thân đã mất…)
- [ ] Mỗi câu gắn chủ đề và lý do ngắn ("vì ông sinh năm 1940 ở Nam Định"). Không bịa sự kiện cá nhân; bối cảnh lịch sử chung thì được dùng
- [ ] Tránh hoặc đánh dấu câu nhạy cảm (mất người thân, chiến tranh) để người phỏng vấn cân nhắc
- [ ] Chọn câu → lưu thành danh sách phỏng vấn của người đó, in hoặc chia sẻ được; khi có LMS-013/LMS-025 thì mỗi câu gắn được ghi âm hoặc ghi chép
- [ ] Gia phả chưa bật AI vẫn dùng được bộ câu hỏi gốc. Người còn sống mà gia phả không chia sẻ chi tiết thì AI chỉ thấy phần đã ẩn (`snapshotForAi`)
- [ ] Đánh giá: ≥ 10 hồ sơ mẫu; mỗi bộ được 2 người chấm theo thang 1–5 (phù hợp với người đó, không trùng lặp, không bịa). Ghi kết quả vào `docs/ai/eval-results/`

## Ghi chú kỹ thuật
- Endpoint `POST /trees/:treeId/persons/:personId/interview-questions` trong module `ai`, dùng chung `createGemini`, retry, hạn mức ngày và cổng đồng ý với chatbot.
- Output dạng JSON có schema (`responseSchema` của Gemini) để kiểm tra được, không parse chữ tự do.
- Không lưu câu trả lời của model nếu người dùng không chọn.
