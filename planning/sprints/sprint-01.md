# Sprint 01

- **Thời gian:** 12/10/2026 – 25/10/2026
- **Mục tiêu sprint:** Nền tảng: thiết kế, khung dự án, đăng nhập

## Phạm vi
- [ ] LMS-001 Khởi tạo dự án, hạ tầng & CI
  - [ ] Sơn: monorepo, NestJS + Prisma, docker-compose, CI (còn thiếu CI)
  - [ ] Quân: Vite + React + Tailwind/shadcn, router, API client, MSW (còn thiếu shadcn/ui, MSW)
  - [ ] Cả nhóm: ERD, wireframe, chốt ADR-0001/0002/0003
- [x] LMS-002 Đăng ký / đăng nhập (PR #2)
  - [x] Sơn: register, login, refresh, /auth/me
  - [x] Quân: trang đăng ký/đăng nhập, route guard
- [ ] LMS-016 AI Chatbot – nghiên cứu
  - [ ] Nhật: chốt LLM + embedding (ADR-0002), bộ câu hỏi đánh giá ≥ 20 câu
- [ ] LMS-018 Tài liệu – khởi động
  - [ ] Bình: khung báo cáo theo mẫu của trường, use-case diagram (cùng nhóm), mẫu biên bản họp, quy trình cập nhật sprint/task

**Done khi:** Đăng nhập bằng API thật được; CI xanh; đã chốt nhà cung cấp AI; có khung báo cáo.

Chi tiết phân việc: `planning/team-plan.md`

## Họp nhóm 18/10/2026
Nguồn: Meeting Note trên Drive nhóm (thư mục ĐATN).

**Đã làm**
- Đăng ký/đăng nhập: bằng form (mã xác thực gửi email) hoặc Google; JWT + refresh token; quên mật khẩu qua mã email.
- Cây gia phả: CRUD cây, giao diện cây.
- Thành viên: CRUD, giao diện danh sách và chi tiết.
- Quan hệ: CRUD vợ–chồng và cha/mẹ–con; thêm mới hoặc thêm từ gia phả khác; một người có thể thuộc nhiều gia phả.

**Backlog cần review/sửa**
- Đồng bộ và cải thiện UI/UX.
- Validate chặt chẽ thêm/sửa/xóa gia phả, thành viên, quan hệ.

**Chưa làm:** timeline, nhắc lịch, bình luận, phân quyền, lưu trữ tài liệu, AI.

## Tiến độ giữa sprint (19/10/2026, `dev` @ `839afc7`)
Làm trước kế hoạch: một phần LMS-003, 004, 005, 006 (vốn thuộc S02–S03) đã merge qua PR #3, #4, #5.

| Task | Trạng thái | Còn thiếu |
|---|---|---|
| LMS-001 | In Progress | CI, test runner, MSW, shadcn/ui, ERD, wireframe, ADR `Accepted` |
| LMS-002 | Done | – |
| LMS-003 | In Progress | `ChangeService`, Membership (người tạo = Admin), seed ≥ 50 người / 5 đời |
| LMS-004 | In Progress | Mở/thu gọn nhánh, thử 500 người |
| LMS-005 | In Progress | Tệp đính kèm |
| LMS-006 | In Progress | LifeEvent, sự kiện nhập tay, sự kiện cưới (hiện chỉ suy ra từ ngày sinh/mất) |
| LMS-016 (S01) | Todo | Chốt LLM + embedding, bộ câu hỏi đánh giá ≥ 20 câu. ADR-0004 đang ở bản nháp |
| LMS-018 (S01) | Chưa thấy trong repo | Khung báo cáo, use-case, mẫu biên bản |

**Cần xử lý trước khi hết sprint**
- Làm phần nền móng trước khi thêm tính năng: `ChangeService`, Membership (ADR-0001).
- Ghi lại quyết định dùng Cloudinary thay MinIO/S3 (khác ADR-0002).
- Chốt lại phân công FE: commit FE hiện đều của Sơn.
- Cập nhật Nhật ký công việc trên Drive: các task code chưa gắn người làm.

## Kết quả / Retro
- Làm tốt:
- Cần cải thiện:
