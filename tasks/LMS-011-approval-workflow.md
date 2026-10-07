# LMS-011: Quy trình duyệt thay đổi

- **Trạng thái:** Todo
- **Owner:** Sơn + Quân
- **Sprint:** Sprint 05
- **Spec liên quan:** `specs/features.md` (D2)

## User story
Là Admin, tôi muốn xem xét thay đổi của Editor trước khi áp dụng để giữ dữ liệu gia phả chính xác.

## Tiêu chí chấp nhận
- [ ] Editor ghi → trả 202 + ChangeRequest `PENDING`
- [ ] Admin xem diff (trước/sau) rồi duyệt (áp dụng trong transaction) hoặc từ chối (kèm lý do)
- [ ] Phát hiện xung đột nếu dữ liệu gốc đã đổi sau khi tạo request
- [ ] Audit log mọi thay đổi đã áp dụng; Editor nhận thông báo kết quả

## Phân việc
### BE – Sơn
- Bật nhánh Editor trong ChangeService, diff JSON, approve/reject

### FE – Quân
- Hàng chờ duyệt, màn hình diff, badge "chờ duyệt", lịch sử sửa trong hồ sơ

## Ghi chú kỹ thuật
Mô hình tương tự Pull Request. Xem ADR-0001. Chỉ re-embed cho chatbot khi thay đổi đã được duyệt.
