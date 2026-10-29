# LMS-012: Bình luận & thông báo

- **Trạng thái:** In Progress
- **Owner:** Sơn + Quân
- **Sprint:** Sprint 05
- **Spec liên quan:** `specs/features.md` (D3)

## User story
Là thành viên dòng họ, tôi muốn bình luận trên hồ sơ để bổ sung, đính chính hoặc chia sẻ kỷ niệm.

## Tiêu chí chấp nhận
- [ ] Thêm/xóa bình luận trên hồ sơ (người viết hoặc Admin được xóa)
- [ ] Thông báo khi có bình luận mới hoặc yêu cầu duyệt
- [ ] Realtime qua WebSocket (dự phòng: polling)

## Phân việc
### BE – Sơn
- Comment API, Notification, Socket.IO gateway

### FE – Quân
- Khung bình luận, chuông thông báo

## Ghi chú kỹ thuật

## Tiến độ
- [x] Bảng `Notification`, chuông thông báo, đánh dấu đã đọc / đọc hết (PR #8, hiện dùng cho sự kiện LMS-014)
- [ ] Bình luận trên hồ sơ
- [ ] Thông báo khi có bình luận mới hoặc yêu cầu duyệt
- [ ] Realtime qua WebSocket. Hiện chuông polling 60 giây/lần
