# API Contracts

> **Bản nháp.** Request/response chi tiết được chốt **đầu mỗi sprint** (contract-first), qua PR sửa file này. Cả BE và FE cùng review.

- Base URL: `/api`
- Định dạng: JSON. Riêng upload dùng presigned URL (S3-compatible).
- Xác thực: `Authorization: Bearer <access token>`
- Phân trang: `?page=1&pageSize=20` → `{ "items": [...], "total": 0, "page": 1, "pageSize": 20 }`
- Lỗi (dùng chung cho mọi API):
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [{ "field": "email", "message": "..." }] } }
  ```
  Mã HTTP: 400 validate · 401 chưa đăng nhập · 403 thiếu quyền · 404 không tồn tại · 409 xung đột (ví dụ quan hệ tạo chu trình).
- Ghi dữ liệu với vai trò Editor: trả `202 Accepted` + `{ "changeRequestId": "..." }` thay vì áp dụng ngay (xem D2).

## Health check

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/health` | Kiểm tra backend và truy vấn bảng `User` qua Prisma |

Response `200 OK` khi backend và database hoạt động:

```json
{
  "status": "ok",
  "service": "family-tree-api",
  "timestamp": "2026-10-09T10:00:00.000Z"
}
```

Nếu truy vấn database thất bại, endpoint vẫn trả HTTP `200` nhưng `status` là `degraded`.

## Auth – Sprint 01
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/auth/register` | Đăng ký |
| POST | `/auth/login` | Đăng nhập, trả access + refresh token |
| POST | `/auth/refresh` | Lấy access token mới |
| GET | `/auth/me` | Thông tin user hiện tại + danh sách dòng họ đã tham gia |

## Dòng họ, người, quan hệ – Sprint 02
| Method | Endpoint | Mô tả |
|---|---|---|
| GET / POST | `/trees` | Danh sách dòng họ của tôi / tạo dòng họ (người tạo thành Admin) |
| GET / PATCH / DELETE | `/trees/{treeId}` | Chi tiết / sửa / xóa dòng họ |
| GET / POST | `/trees/{treeId}/persons` | Danh sách (tìm theo tên) / thêm người |
| GET / PATCH / DELETE | `/trees/{treeId}/persons/{personId}` | Chi tiết / sửa / xóa người |
| GET / POST | `/trees/{treeId}/relationships` | Danh sách / thêm quan hệ (`PARENT_CHILD`, `SPOUSE`) |
| DELETE | `/trees/{treeId}/relationships/{relId}` | Xóa quan hệ |
| GET | `/trees/{treeId}/graph` | Toàn bộ `{ nodes, edges }` để vẽ cây |

## Hồ sơ, tệp, timeline – Sprint 03
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/trees/{treeId}/uploads` | Xin presigned URL để upload |
| GET / POST | `/trees/{treeId}/persons/{personId}/attachments` | Tài liệu đính kèm |
| DELETE | `/trees/{treeId}/persons/{personId}/attachments/{id}` | Xóa tài liệu |
| GET | `/trees/{treeId}/timeline` | Timeline cả dòng họ |
| GET | `/trees/{treeId}/persons/{personId}/timeline` | Timeline cá nhân |
| POST / PATCH / DELETE | `/trees/{treeId}/persons/{personId}/life-events[/{id}]` | Sự kiện nhập tay |

## Quan hệ & thống kê – Sprint 03–04
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/trees/{treeId}/relationship-finder?from={id}&to={id}` | `{ path: [...], aCallsB, bCallsA, description }` |
| GET | `/trees/{treeId}/stats` | Số liệu cho dashboard |

## Cộng tác – Sprint 05
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/trees/{treeId}/members` | Danh sách user trong dòng họ + vai trò |
| PATCH / DELETE | `/trees/{treeId}/members/{userId}` | Đổi vai trò, giao nhánh / xóa khỏi dòng họ |
| POST | `/trees/{treeId}/invitations` | Tạo lời mời (link hoặc email) |
| POST | `/invitations/{token}/accept` | Chấp nhận lời mời |
| GET | `/trees/{treeId}/change-requests?status=PENDING` | Hàng chờ duyệt |
| GET | `/trees/{treeId}/change-requests/{id}` | Chi tiết + diff |
| POST | `/trees/{treeId}/change-requests/{id}/approve` | Duyệt |
| POST | `/trees/{treeId}/change-requests/{id}/reject` | Từ chối (kèm lý do) |
| GET | `/trees/{treeId}/audit-logs` | Lịch sử thay đổi |
| GET / POST | `/trees/{treeId}/persons/{personId}/comments` | Bình luận |
| DELETE | `/trees/{treeId}/comments/{id}` | Xóa bình luận |
| GET / PATCH | `/notifications`, `/notifications/{id}/read` | Thông báo / đánh dấu đã đọc |
| WS | `/ws` | Sự kiện realtime: `comment.created`, `change-request.created`, `notification.created` |

## Memory Wall, sự kiện, AI – Sprint 06–07
| Method | Endpoint | Mô tả |
|---|---|---|
| GET / POST | `/trees/{treeId}/persons/{personId}/memories` | Ký ức (ảnh / video / audio / câu chuyện) |
| DELETE | `/trees/{treeId}/memories/{id}` | Xóa ký ức |
| GET / POST | `/trees/{treeId}/events` | Sự kiện dòng họ (lọc theo khoảng ngày) |
| PATCH / DELETE | `/trees/{treeId}/events/{id}` | Sửa / xóa sự kiện |
| POST | `/trees/{treeId}/persons/{personId}/biography/generate` | Sinh bản nháp tiểu sử (không tự lưu) |
| POST | `/trees/{treeId}/chat` | Hỏi chatbot, trả về dạng stream (SSE) |
