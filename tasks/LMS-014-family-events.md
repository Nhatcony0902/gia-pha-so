# LMS-014: Sự kiện dòng họ & nhắc lịch

- **Trạng thái:** In Progress
- **Owner:** Sơn + Quân
- **Sprint:** Sprint 06
- **Spec liên quan:** `specs/features.md` (D5)

## User story
Là Admin dòng họ, tôi muốn quản lý ngày giỗ, họp mặt, cưới hỏi và tự động nhắc mọi người.

## Tiêu chí chấp nhận
- [ ] CRUD sự kiện; sự kiện giỗ tạo từ ngày mất, lặp hằng năm theo **âm lịch**
- [ ] Nhắc trước N ngày qua email + thông báo trong app
- [ ] Xem dạng lịch và danh sách

## Phân việc
### BE – Sơn
- FamilyEvent API, chuyển đổi âm–dương lịch, cron `@nestjs/schedule`, SMTP

### FE – Quân
- Lịch / danh sách sự kiện, form, cài nhắc

## Ghi chú kỹ thuật

## Tiến độ
Làm sớm trong PR #8 (kế hoạch: Sprint 06).
- [x] CRUD sự kiện dòng họ (giỗ, họp mặt, cưới hỏi…), ảnh bìa và ảnh/video qua Cloudinary
- [x] Mời khách tham gia sự kiện, khách chấp nhận/từ chối
- [x] Thông báo trong app và email khi sự kiện bắt đầu/kết thúc (job quét định kỳ)
- [x] Xem dạng lịch và danh sách (trang Timeline)
- [ ] Giỗ tạo từ ngày mất, lặp hằng năm theo âm lịch. Hiện âm lịch chỉ dùng để hiển thị
- [ ] Nhắc trước N ngày. Hiện chỉ báo đúng lúc sự kiện bắt đầu
