# LMS-017: Kiểm thử tổng thể & deploy

- **Trạng thái:** Todo
- **Owner:** Sơn + Quân + Nhật (Bình: điều phối UAT)
- **Sprint:** Sprint 07
- **Spec liên quan:** `specs/features.md` (–)

## User story
Là nhóm đồ án, chúng tôi muốn có bản demo ổn định để bảo vệ.

## Tiêu chí chấp nhận
- [ ] Feature freeze cuối tuần 13
- [ ] Chạy toàn bộ test case của Bình + UAT với vài người dùng thật; lỗi nghiêm trọng đã sửa
- [ ] Bản demo online (FE Vercel, BE + DB + storage) với dữ liệu demo

## Phân việc
### BE – Sơn
- Deploy BE, DB pgvector, storage; seed dữ liệu demo

### FE – Quân
- Deploy Vercel, tối ưu hiệu năng

### AI Chatbot – Nhật
- Biến môi trường/API key production, giới hạn chi phí, kết quả đánh giá chatbot

### Tài liệu – Bình
- Điều phối UAT, tổng hợp lỗi và kết quả kiểm thử

## Ghi chú kỹ thuật
Báo cáo, slide, video demo nằm ở LMS-018.
