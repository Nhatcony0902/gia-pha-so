# API Contracts
Base URL: `/api`

## Health check

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/health` | Kiểm tra trạng thái backend và database |

## Xác thực

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/auth/register` | Đăng ký tài khoản |
| POST | `/auth/register/verify` | Xác thực OTP đăng ký |
| POST | `/auth/register/resend` | Gửi lại OTP đăng ký |
| POST | `/auth/login` | Đăng nhập bằng email và mật khẩu |
| POST | `/auth/google` | Đăng nhập bằng Google |
| POST | `/auth/refresh` | Làm mới access token |
| POST | `/auth/logout` | Đăng xuất |
| GET | `/auth/me` | Lấy thông tin người dùng hiện tại |
| POST | `/auth/password-reset/request` | Yêu cầu đặt lại mật khẩu |
| POST | `/auth/password-reset/verify` | Xác thực OTP đặt lại mật khẩu |
| POST | `/auth/password-reset/confirm` | Đặt mật khẩu mới |

## Cây gia phả

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/trees` | Danh sách cây gia phả |
| POST | `/trees` | Tạo cây gia phả |
| GET | `/trees/{treeId}` | Chi tiết cây gia phả |
| PATCH | `/trees/{treeId}` | Cập nhật cây gia phả |
| DELETE | `/trees/{treeId}` | Xóa cây gia phả |
| GET | `/trees/{treeId}/graph` | Dữ liệu sơ đồ gia phả |

## Thành viên và quan hệ

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/trees/{treeId}/persons` | Danh sách thành viên |
| POST | `/trees/{treeId}/persons` | Thêm thành viên |
| GET | `/trees/{treeId}/persons/{personId}` | Chi tiết thành viên |
| PATCH | `/trees/{treeId}/persons/{personId}` | Cập nhật thành viên |
| DELETE | `/trees/{treeId}/persons/{personId}` | Xóa thành viên |
| GET | `/trees/{treeId}/relationships` | Danh sách quan hệ |
| POST | `/trees/{treeId}/relationships` | Thêm quan hệ |
| DELETE | `/trees/{treeId}/relationships/{relId}` | Xóa quan hệ |
| GET | `/trees/{treeId}/relationship-finder?from={id}&to={id}` | Tìm quan hệ giữa hai người |

## Hồ sơ, tệp và timeline

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/trees/{treeId}/uploads` | Tạo presigned upload URL |
| GET | `/trees/{treeId}/persons/{personId}/attachments` | Danh sách tệp đính kèm |
| POST | `/trees/{treeId}/persons/{personId}/attachments` | Thêm tệp đính kèm |
| DELETE | `/trees/{treeId}/persons/{personId}/attachments/{id}` | Xóa tệp đính kèm |
| GET | `/trees/{treeId}/timeline` | Timeline cây gia phả |
| GET | `/trees/{treeId}/persons/{personId}/timeline` | Timeline thành viên |
| POST | `/trees/{treeId}/persons/{personId}/life-events` | Thêm sự kiện cuộc đời |
| PATCH | `/trees/{treeId}/persons/{personId}/life-events/{id}` | Cập nhật sự kiện cuộc đời |
| DELETE | `/trees/{treeId}/persons/{personId}/life-events/{id}` | Xóa sự kiện cuộc đời |
| GET | `/trees/{treeId}/stats` | Thống kê cây gia phả |

## Cộng tác

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/trees/{treeId}/members` | Danh sách cộng tác viên (chỉ Admin) |
| PATCH | `/trees/{treeId}/members/{userId}` | Cập nhật quyền cộng tác viên |
| DELETE | `/trees/{treeId}/members/{userId}` | Xóa cộng tác viên. Admin xóa người khác, hoặc tự rời gia phả. Không xóa được Admin |
| GET | `/trees/{treeId}/invitations` | Danh sách link mời kèm trạng thái (chỉ Admin) |
| POST | `/trees/{treeId}/invitations` | Tạo lời mời `{ expiresInDays?: 1–30 (mặc định 7), maxUses?, email?, personId? }`. Không có `email`: link chung, trả `token` **một lần duy nhất**. Có `email`: gửi email, dùng một lần, trả `token: null`, thu hồi lời mời cũ cùng email. `personId` chỉ dùng kèm `email` |
| DELETE | `/trees/{treeId}/invitations/{id}` | Thu hồi link mời. Người đã vào vẫn giữ quyền |
| GET | `/invitations/{token}` | Xem trước lời mời, **không cần đăng nhập**. Chỉ trả tên gia phả, vai trò, người mời, trạng thái |
| POST | `/invitations/{token}/accept` | Chấp nhận lời mời. Đã là thành viên thì trả `alreadyMember: true` và giữ nguyên vai trò. Lời mời email: tài khoản phải đúng email và đã xác minh, sai thì `403` |
| GET | `/trees/{treeId}/change-requests?status=PENDING` | Danh sách yêu cầu thay đổi |
| GET | `/trees/{treeId}/change-requests/{id}` | Chi tiết yêu cầu thay đổi |
| POST | `/trees/{treeId}/change-requests/{id}/approve` | Duyệt yêu cầu thay đổi |
| POST | `/trees/{treeId}/change-requests/{id}/reject` | Từ chối yêu cầu thay đổi |
| GET | `/trees/{treeId}/audit-logs` | Nhật ký thay đổi |
| GET | `/trees/{treeId}/persons/{personId}/comments` | Danh sách bình luận |
| POST | `/trees/{treeId}/persons/{personId}/comments` | Thêm bình luận |
| DELETE | `/trees/{treeId}/comments/{id}` | Xóa bình luận |
| GET | `/notifications` | Danh sách thông báo |
| PATCH | `/notifications/{id}/read` | Đánh dấu thông báo đã đọc |
| WS | `/ws` | Kết nối realtime |

## Kỷ niệm, sự kiện và AI

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/trees/{treeId}/persons/{personId}/memories` | Danh sách kỷ niệm |
| POST | `/trees/{treeId}/persons/{personId}/memories` | Thêm kỷ niệm |
| DELETE | `/trees/{treeId}/memories/{id}` | Xóa kỷ niệm |
| GET | `/trees/{treeId}/events` | Danh sách sự kiện dòng họ |
| POST | `/trees/{treeId}/events` | Thêm sự kiện dòng họ |
| PATCH | `/trees/{treeId}/events/{id}` | Cập nhật sự kiện dòng họ |
| DELETE | `/trees/{treeId}/events/{id}` | Xóa sự kiện dòng họ |
| POST | `/trees/{treeId}/persons/{personId}/biography/generate` | Tạo bản nháp tiểu sử |
| POST | `/trees/{treeId}/chat` | Chatbot gia phả |
