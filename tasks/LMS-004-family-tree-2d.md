# LMS-004: Cây gia phả 2D tương tác

- **Trạng thái:** Todo
- **Owner:** Quân (Sơn: graph API)
- **Sprint:** Sprint 02
- **Spec liên quan:** `specs/features.md` (A1)

## User story
Là thành viên dòng họ, tôi muốn xem cây gia phả và thao tác trực tiếp để hình dung các thế hệ.

## Tiêu chí chấp nhận
- [ ] Hiển thị toàn bộ dòng họ từ `GET /graph`
- [ ] Zoom, pan, mở/thu gọn từng nhánh
- [ ] Tìm theo tên → cây tự di chuyển tới người đó
- [ ] Thể hiện vợ chồng, tái hôn, con nuôi (nét khác)
- [ ] Click vào node để mở hồ sơ
- [ ] Mượt với dữ liệu seed; thử với 500 người

## Phân việc
### BE – Sơn
- `GET /trees/{id}/graph` trả nodes + edges

### FE – Quân
- React Flow + elkjs; gom vợ chồng thành family node
- Spike layout ngay tuần 3

## Ghi chú kỹ thuật
Đây là màn hình "bộ mặt" của đồ án, ưu tiên UX.
