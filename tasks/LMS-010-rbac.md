# LMS-010: Phân quyền Admin / Editor / Viewer

- **Trạng thái:** In Progress
- **Owner:** Sơn + Quân
- **Sprint:** Sprint 05
- **Spec liên quan:** `specs/features.md` (D1)

## User story
Là Admin dòng họ, tôi muốn mời người khác và cấp quyền phù hợp để cùng quản lý gia phả an toàn.

## Tiêu chí chấp nhận
- [x] Mời bằng link hoặc email; người nhận chấp nhận thì vào dòng họ
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

## Tiến độ
- [x] Bảng `Membership` (vai trò theo từng gia phả) và `Invitation`. Migration tự gán người tạo gia phả cũ thành Admin
- [x] Đọc gia phả theo Membership. Chỉ Admin ghi được, Viewer ghi nhận 403
- [x] Link mời Viewer: tạo, xem trước công khai, chấp nhận, thu hồi, hết hạn, giới hạn lượt
- [x] Admin xem và xóa người có quyền truy cập
- [x] FE: hộp thoại "Chia sẻ", trang `/invite/:token`, ẩn nút sửa/xóa với Viewer
- [x] Mời qua email, gắn tài khoản với Person khi chấp nhận (nút "Mời người này" ở trang hồ sơ) (PR #7)
- [x] Gắn hồ sơ cho người đã vào bằng link chung: Admin mời lại qua email kèm Person, giữ nguyên vai trò (PR #9)
- [ ] Mời Editor qua email, đổi vai trò, giao nhánh cho Editor (cần LMS-011 để Editor đề xuất qua duyệt)
- [ ] Người dùng tự nhận hồ sơ của mình khi không được mời kèm Person
