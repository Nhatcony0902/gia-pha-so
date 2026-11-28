# LMS-026: Phát hiện người trùng và dữ liệu bất thường

- **Trạng thái:** Todo
- **Owner:** _(Nhật giao)_
- **Sprint:** Sprint 09
- **Spec liên quan:** `specs/features.md` (A3), `specs/domains.md`
- **Nguồn:** Nhận xét tiến độ ĐATN nhóm 3, mục 1.4, 1.5 và mục 5 (mức "Nâng cao")

## User story
Là trưởng họ, tôi muốn được cảnh báo khi một người bị nhập hai lần hoặc có dữ liệu vô lý, để gia phả không sai lệch khi nhiều người cùng đóng góp.

## Tiêu chí chấp nhận
- [ ] **Luật cứng, không cần AI** (chặn khi lưu): vòng lặp tổ tiên; con sinh trước cha mẹ; năm mất trước năm sinh; cha/mẹ dưới 12 hoặc trên 80 tuổi lúc sinh con; tuổi thọ > 120
- [ ] **Cảnh báo mềm** (cho lưu nhưng hiện cảnh báo): vợ chồng chênh > 40 tuổi, con sinh sau khi cha mất > 1 năm, cùng tên + cùng năm sinh trong một gia phả
- [ ] **Gợi ý người trùng:** điểm giống nhau từ tên (bỏ dấu, tên gọi, bí danh), năm sinh/mất, cha mẹ, vợ chồng. Danh sách cặp nghi trùng cho Admin, kèm lý do
- [ ] Công cụ gộp hai hồ sơ: chọn giá trị từng trường, chuyển quan hệ, ảnh, ký ức sang hồ sơ giữ lại, ghi lịch sử
- [ ] Đánh giá: tạo bộ dữ liệu có ≥ 20 cặp trùng cố ý trong dữ liệu mẫu, đo precision/recall của gợi ý

## Ghi chú kỹ thuật
- Bắt đầu bằng điểm có trọng số (deterministic), giải thích được. Chỉ dùng embedding/LLM để so tiểu sử khi điểm ở vùng lưng chừng, và phải qua cổng đồng ý AI (ADR-0008).
- Luật kiểm tra dùng chung với `trees/relationship-validation.ts`.
