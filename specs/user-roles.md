# User Roles

Quyền chia làm 2 cấp: **tài khoản hệ thống** và **vai trò trong từng dòng họ**. Một tài khoản có thể tham gia nhiều dòng họ, mỗi dòng họ một vai trò khác nhau.

| Vai trò | Phạm vi | Quyền chính |
|---|---|---|
| User | Hệ thống | Đăng ký, đăng nhập; tạo dòng họ mới (tự động thành Admin của dòng họ đó); nhận lời mời vào dòng họ khác |
| Admin | Một dòng họ | Toàn quyền: sửa trực tiếp dữ liệu, mời thành viên và đổi quyền, giao nhánh cho Editor, duyệt/từ chối thay đổi, quản lý sự kiện |
| Editor | Một dòng họ | Đề xuất thêm/sửa người và quan hệ **trong nhánh được giao**, sửa hồ sơ của chính mình. Mọi thay đổi vào hàng chờ duyệt. Được bình luận, đăng ký ức |
| Viewer | Một dòng họ | Xem cây, hồ sơ, timeline, thống kê; tìm quan hệ; hỏi chatbot; bình luận |

## Lời mời
- **Link mời** (đã có): Admin tạo link, gửi vào nhóm Zalo. Ai có link và đăng nhập thì vào gia phả với quyền **Viewer**. Link chung không bao giờ cấp quyền Editor/Admin, để lộ link cũng không ai sửa được dữ liệu.
- Link có hạn dùng (1–30 ngày, mặc định 7), có thể giới hạn số lượt, Admin thu hồi được bất cứ lúc nào. DB chỉ lưu hash của token.
- Người đã ở trong gia phả bấm lại link thì giữ nguyên vai trò cũ (không bị hạ quyền).
- **Mời qua email** (đã có): mời đích danh, dùng một lần, chỉ tài khoản đúng email (đã xác minh) mới chấp nhận được. Có thể gắn với một Person: khi chấp nhận, tài khoản được liên kết với đúng người đó trong cây (mỗi Person chỉ gắn một tài khoản trong một gia phả). Mời lại cùng email thì link cũ bị thu hồi.
  - Hiện mới cấp quyền **Viewer**. Mời Editor qua email sẽ mở khi có luồng duyệt (LMS-011).
- Người ngoài gia phả gọi API của gia phả nhận `404` (không lộ gia phả tồn tại). Thành viên không đủ quyền ghi nhận `403`.

## Câu hỏi mở (chốt ở Sprint 05)
- Editor sửa hồ sơ của chính mình có cần qua duyệt không? Hiện tại đang theo tài liệu (D2): mọi thay đổi của Editor đều qua duyệt.
- Viewer có được đăng lên Memory Wall không?
- Bình luận và ký ức có cần duyệt không? Đề xuất: không cần, Admin có quyền xóa.
