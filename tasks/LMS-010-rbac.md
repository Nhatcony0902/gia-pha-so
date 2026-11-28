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
- [x] Nút "Gửi qua Zalo" cạnh link mời: điện thoại mở bảng chia sẻ của máy để chọn Zalo; máy tính chép sẵn tin nhắn mời (tên gia phả, link, ngày hết hạn) rồi mở Zalo Web để dán. Không dùng plugin chia sẻ của Zalo vì cần mã Official Account
- [x] Trang **Quản trị** `/trees/:treeId/admin` (Nhật, 28/11/2026): số liệu nhanh, người có quyền truy cập, lời mời, trợ lý AI (LMS-023). Mục "Quản trị" trên thanh điều hướng chỉ Admin thấy. Hộp thoại "Chia sẻ" giữ nguyên, trang quản trị dùng lại API có sẵn
- [x] Đổi vai trò Admin ↔ Viewer: `PATCH /trees/:treeId/members/:userId`. Người tạo gia phả luôn là Admin; luôn còn ít nhất một Admin; Admin tự rút về Viewer được (rời trang quản trị). Test: `memberships.service.test.ts` ("đổi vai trò")
- [ ] Mời Editor qua email, chọn vai trò Editor, giao nhánh cho Editor (cần LMS-011 để Editor đề xuất qua duyệt). API đang trả `400 ROLE_NOT_AVAILABLE` cho `EDITOR`
- [ ] Người dùng tự nhận hồ sơ của mình khi không được mời kèm Person

## Kiểm thử trang Quản trị (28/11/2026)
DB Docker + Chromium chạy ngầm (Playwright), 30/30 bước đạt: Admin thấy mục Quản trị và mở được trang; badge "Người tạo", ô vai trò của người tạo bị khóa; nâng Minh lên trưởng họ (có hộp xác nhận) → Minh thấy mục Quản trị; Minh gọi API hạ người tạo → `400 CANNOT_DEMOTE_CREATOR`; hạ Minh về Viewer → mất mục Quản trị, vào thẳng `/admin` bị chặn; API `EDITOR` → `400 ROLE_NOT_AVAILABLE`, Viewer đổi vai trò → `403`, vai trò lạ → `400`; thu hồi lời mời; tắt rồi bật AI ngay trên trang; nút "Mời người mới" mở hộp thoại Chia sẻ; 390/1024/1280/1440 px không tràn ngang, không lỗi JS.
