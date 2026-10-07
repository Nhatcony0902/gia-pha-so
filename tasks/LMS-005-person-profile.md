# LMS-005: Hồ sơ thành viên đầy đủ + tệp đính kèm

- **Trạng thái:** Todo
- **Owner:** Quân + Sơn
- **Sprint:** Sprint 03
- **Spec liên quan:** `specs/features.md` (A3)

## User story
Là thành viên dòng họ, tôi muốn xem và cập nhật hồ sơ đầy đủ của một người, kèm ảnh và tài liệu.

## Tiêu chí chấp nhận
- [ ] Upload ảnh đại diện và tài liệu đính kèm (giới hạn loại file + dung lượng)
- [ ] Trang hồ sơ hiển thị thông tin, tệp, và các tab: timeline, ký ức, bình luận (các tab này làm ở sprint sau)
- [ ] Xóa tệp đính kèm

## Phân việc
### BE – Sơn
- Storage service S3-compatible (presigned URL)
- Attachment API

### FE – Quân
- Trang hồ sơ, upload có tiến trình, xem trước ảnh/PDF

## Ghi chú kỹ thuật
