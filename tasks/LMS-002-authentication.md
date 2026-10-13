# LMS-002: Đăng ký / đăng nhập

- **Trạng thái:** In Progress
- **Owner:** Sơn + Quân
- **Sprint:** Sprint 01
- **Spec liên quan:** `specs/features.md` (D1)

## User story
Là người dùng, tôi muốn đăng ký và đăng nhập để truy cập các dòng họ của mình.

## Tiêu chí chấp nhận
- [x] Đăng ký email + mật khẩu; email trùng trả 409
- [x] Đăng nhập trả access token + refresh cookie; sai mật khẩu trả 401
- [x] FE tự refresh access token; refresh thất bại thì đăng xuất
- [x] `/auth/me` trả user + danh sách membership (hiện là mảng rỗng)
- [x] Có `ProtectedRoute` chuyển người chưa đăng nhập về `/auth?mode=login`
- [x] Đăng ký chỉ hoàn tất sau OTP email
- [x] Đăng nhập/đăng ký Google và liên kết user form cùng email
- [x] Quên mật khẩu qua OTP; reset thu hồi các phiên cũ
- [x] Navbar, toast, alert và confirm dialog responsive, dùng chung

## Phân việc
### BE – Sơn
- User/OTP/session Prisma, Argon2id, JWT, refresh rotation
- SMTP template, Google ID token và rate limit

### FE – Quân
- Trang auth dùng chung: form, Google, OTP và quên mật khẩu
- Access token memory, refresh interceptor, route guard
- Navbar, đăng xuất và popup dùng chung

## Ghi chú kỹ thuật

Google và SMTP cần biến môi trường trong `src/.env` và `src/backend/.env`. Mail local xem tại `http://localhost:8025`.
