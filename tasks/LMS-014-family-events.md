# LMS-014: Sự kiện dòng họ & nhắc lịch

- **Trạng thái:** Todo
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
