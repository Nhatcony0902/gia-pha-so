# LMS-010: Phân quyền Admin / Editor / Viewer

- **Trạng thái:** Todo
- **Owner:** Sơn + Quân
- **Sprint:** Sprint 05
- **Spec liên quan:** `specs/features.md` (D1)

## User story
Là Admin dòng họ, tôi muốn mời người khác và cấp quyền phù hợp để cùng quản lý gia phả an toàn.

## Tiêu chí chấp nhận
- [ ] Mời bằng link hoặc email; người nhận chấp nhận thì vào dòng họ
- [ ] Admin đổi vai trò, xóa thành viên, giao nhánh cho Editor
- [ ] Viewer không có quyền ghi (403); Editor chỉ đề xuất được trong nhánh được giao
- [ ] Liên kết tài khoản với Person của chính mình

## Phân việc
### BE – Sơn
- Invitation, Membership role + scope, NestJS Guard theo tree/nhánh
- Test quyền cho từng endpoint ghi

### FE – Quân
- Trang quản lý thành viên, ẩn/hiện thao tác theo quyền

## Ghi chú kỹ thuật
Chốt các câu hỏi mở trong `specs/user-roles.md`.
