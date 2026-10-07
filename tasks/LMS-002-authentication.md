# LMS-002: Đăng ký / đăng nhập

- **Trạng thái:** Todo
- **Owner:** Sơn + Quân
- **Sprint:** Sprint 01
- **Spec liên quan:** `specs/features.md` (D1)

## User story
Là người dùng, tôi muốn đăng ký và đăng nhập để truy cập các dòng họ của mình.

## Tiêu chí chấp nhận
- [ ] Đăng ký bằng email + mật khẩu; email trùng trả 409
- [ ] Đăng nhập trả access + refresh token; sai mật khẩu trả 401
- [ ] Access token hết hạn thì FE tự refresh, refresh thất bại thì đăng xuất
- [ ] `/auth/me` trả user + danh sách dòng họ đã tham gia
- [ ] Trang chưa đăng nhập bị chuyển về /login

## Phân việc
### BE – Sơn
- User model, hash mật khẩu (bcrypt/argon2)
- Passport JWT strategy, refresh token
- Test e2e auth

### FE – Quân
- Trang đăng ký, đăng nhập (RHF + Zod)
- Lưu token, interceptor refresh, route guard
- Menu user, đăng xuất

## Ghi chú kỹ thuật
