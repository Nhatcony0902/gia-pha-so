# LMS-025: Chép lời kể từ ghi âm và tóm tắt (ASR tiếng Việt)

- **Trạng thái:** Todo
- **Owner:** Nhật
- **Sprint:** Sprint 09
- **Spec liên quan:** `specs/features.md` (D4), ADR-0008
- **Nguồn:** Nhận xét tiến độ ĐATN nhóm 3, mục 5 (mức "Nên làm")
- **Phụ thuộc:** LMS-013 (Memory Wall: ghi âm, lưu audio), LMS-023 (cổng đồng ý AI), LMS-024 (câu hỏi phỏng vấn)

## User story
Là con cháu, sau khi ghi âm ông bà kể chuyện, tôi muốn có bản chép lời và bản tóm tắt để đọc lại, tìm kiếm và đưa vào tiểu sử.

## Tiêu chí chấp nhận
- [ ] Ký ức dạng audio (LMS-013) có nút "Chép lời": gửi audio lên máy chủ, chép thành văn bản tiếng Việt có dấu, chia đoạn theo thời gian
- [ ] Gợi ý tên riêng từ gia phả (tên người, địa danh quê quán) để chép đúng tên, kể cả phương ngữ
- [ ] Tóm tắt 3–5 ý chính và gợi ý sự kiện cho timeline (năm, nơi chốn). Tóm tắt gắn nhãn "AI tạo", người đăng duyệt/sửa rồi mới lưu
- [ ] Bản chép lời sửa được; giữ bản gốc của AI để so sánh
- [ ] Chỉ chạy khi gia phả đã bật AI. Người được ghi âm còn sống thì cần người đăng xác nhận đã được người kể đồng ý
- [ ] Đánh giá **WER** (tỷ lệ lỗi từ) trên ≥ 10 đoạn ghi âm mẫu 1–3 phút có bản chép chuẩn (giọng Bắc, Trung, Nam; người lớn tuổi). Báo cáo WER chung và WER riêng cho tên riêng

## Ghi chú kỹ thuật
- Ứng viên: Gemini (audio input, đã có key, gợi ý tên bằng prompt), Whisper large-v3 / PhoWhisper (chạy local, không gửi ra ngoài). Chốt bằng ADR mới sau khi đo WER trên cùng bộ mẫu.
- ADR-0007 chọn Web Speech cho câu hỏi ngắn; ghi âm dài (vài phút) không dùng được Web Speech vì không chép từ file.
- Tính WER: chuẩn hóa chữ thường, bỏ dấu câu, giữ dấu tiếng Việt; khoảng cách Levenshtein theo từ.
