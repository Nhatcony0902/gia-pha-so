# Team Plan – 4 thành viên, 14 tuần

- **Ngày lập:** 2026-10-07 (cập nhật: Nhật phụ trách AI, Bình phụ trách tài liệu)
- **Thời gian:** 12/10/2026 – 17/01/2027 (14 tuần = 7 sprint × 2 tuần)
- **Phạm vi:** đủ phạm vi tài liệu: 13 tính năng (10 Bắt buộc + 3 Nên có), xem `specs/features.md`
- **Thành viên:**

| Người | Vai trò | Phụ trách chính | Task chính |
|---|---|---|---|
| **Sơn** | Backend | Kiến trúc, DB, auth/RBAC, approval workflow, Relationship Finder, Memory/Event API, scheduler, deploy BE, CI | LMS-001…014 (phần BE) |
| **Quân** | Frontend | Design system, cây 2D/radial/3D, hồ sơ, timeline, dashboard, giao diện cộng tác, Memory Wall, sự kiện, deploy FE | LMS-001…014 (phần FE) |
| **Nhật** | AI (end-to-end) | Chọn LLM/embedding, module `ai` (LLM client dùng chung), AI tiểu sử, chatbot RAG: backend + giao diện + đánh giá chất lượng | LMS-015, LMS-016 |
| **Bình** | Tài liệu | Báo cáo đồ án, sơ đồ, tài liệu API, hướng dẫn cài đặt/sử dụng, test case & điều phối kiểm thử, biên bản sprint, slide, video demo | LMS-018 |

> ⚠️ **Rủi ro lớn nhất:** Sơn và Quân vẫn gánh 11/13 tính năng và **không có tuần đệm**. Kế hoạch **chốt trước thứ tự cắt giảm** (cuối file) và một **mốc kiểm tra cứng ở cuối Sprint 04**.

## Timeline

| Sprint | Tuần | Thời gian | Mục tiêu | Sơn + Quân | Nhật | Bình |
|---|---|---|---|---|---|---|
| S01 | 1–2 | 12/10 – 25/10 | Nền tảng | LMS-001, LMS-002 | Chọn LLM + embedding, bộ câu hỏi đánh giá | Khung báo cáo, use-case, mẫu biên bản |
| S02 | 3–4 | 26/10 – 08/11 | Dữ liệu phả hệ + cây 2D | LMS-003, LMS-004 | Prototype RAG trên dữ liệu seed | Sơ đồ kiến trúc, ERD, hướng dẫn cài đặt |
| S03 | 5–6 | 09/11 – 22/11 | Hồ sơ, timeline, BFS | LMS-005, LMS-006, LMS-007 (phần 1) | Module `ai`, embedding vào pgvector | Chương tổng quan + yêu cầu, tài liệu API, test case A+B |
| S04 | 7–8 | 23/11 – 06/12 | Xưng hô, thống kê, radial · **kiểm thử giữa kỳ** | LMS-007, LMS-008, LMS-009 (radial) | **AI tiểu sử (LMS-015)**, re-embed, vector search + SQL | Chương thiết kế, điều phối kiểm thử giữa kỳ |
| S05 | 9–10 | 07/12 – 20/12 | Phân quyền, duyệt thay đổi, bình luận | LMS-010, LMS-011, LMS-012 | Định tuyến câu hỏi (dùng RF), giới hạn theo quyền | Hướng dẫn sử dụng, test case cộng tác |
| S06 | 11–12 | 21/12 – 03/01/2027 | Memory Wall, sự kiện | LMS-013, LMS-014 | Endpoint chat SSE + chat UI | Chương hiện thực, test case S06 |
| S07 | 13–14 | 04/01 – 17/01/2027 | 3D, kiểm thử, deploy, báo cáo | LMS-009 (3D), LMS-017 | Đánh giá, tinh chỉnh, deploy | Chương kiểm thử + kết luận, slide, video demo |

Tương ứng với lộ trình của tài liệu (mục 4.2): GĐ1 ≈ S01, GĐ2 ≈ S02–S03, GĐ3 ≈ S03–S04, GĐ4 ≈ S05–S06, GĐ5 ≈ S04–S07 (AI làm song song), GĐ6 ≈ tuần 14.

## Phân việc theo sprint

### S01 – Nền tảng (12/10 – 25/10)
| Sơn (BE) | Quân (FE) |
|---|---|
| Use-case diagram, **ERD** + mô hình đồ thị quan hệ (chủ trì) | **Wireframe** các màn hình chính (chủ trì) |
| Monorepo (npm workspaces), NestJS + Prisma, docker-compose (Postgres+pgvector, MinIO, Mailpit) | Vite + React + TS, Tailwind + shadcn/ui, router, layout |
| CI GitHub Actions (lint, test, build) | API client + TanStack Query, MSW mock |
| Error handler chuẩn, validation, `GET /health` | Trang đăng ký, đăng nhập, route guard |
| Auth: register, login, refresh, `/auth/me` | Màn hình chọn dòng họ (gọi mock) |

**Nhật:** chọn LLM + embedding (phần AI của ADR-0002), viết bộ câu hỏi đánh giá ≥ 20 câu.
**Bình:** khung báo cáo theo mẫu của trường, use-case diagram (cùng nhóm), mẫu biên bản họp, quy trình cập nhật sprint/task.
**Cả nhóm:** chốt ADR-0001/0002/0003 (`Accepted`), chốt contract Auth + Sprint 02.
**Done khi:** đăng nhập bằng API thật được; CI xanh.

### S02 – Dữ liệu phả hệ + Cây 2D (26/10 – 08/11)
| Sơn (BE) | Quân (FE) |
|---|---|
| FamilyTree + Membership (người tạo = Admin) | Danh sách / tạo dòng họ |
| Person, Relationship CRUD qua `ChangeService` (ADR-0001), phát event sau mỗi lần ghi | Form thêm/sửa người (RHF + Zod) |
| Ràng buộc: ≤ 2 cha/mẹ ruột, không chu trình, không tự quan hệ | Thêm cha/mẹ/con/vợ-chồng ngay từ một node |
| `GET /graph` | **Cây 2D (React Flow + elkjs):** layout, zoom/pan, mở/thu nhánh, tìm theo tên, click mở hồ sơ |
| **Seed dòng họ mẫu** (≥ 50 người, 5 đời, có tái hôn, con nuôi) | Thể hiện vợ chồng, tái hôn, con nuôi trên cây |

**Nhật:** prototype pipeline RAG (script độc lập) trên dữ liệu seed.
**Bình:** sơ đồ kiến trúc, ERD bản trình bày (từ ERD của Sơn), hướng dẫn cài đặt local.
**Done khi:** cây vẽ đúng dữ liệu seed bằng API thật.

### S03 – Hồ sơ, Timeline, BFS (09/11 – 22/11)
| Sơn (BE) | Quân (FE) |
|---|---|
| Storage service (presigned upload, MinIO) | Trang hồ sơ đầy đủ: avatar, thông tin, tệp đính kèm, upload có tiến trình |
| Attachment API | Timeline cả dòng họ + timeline cá nhân |
| LifeEvent: suy ra từ hồ sơ + nhập tay; API timeline | Form thêm sự kiện nhập tay |
| **Relationship Finder phần 1:** BFS tìm đường đi ngắn nhất, trả path thô | Khung UI Relationship Finder (chọn 2 người, gọi mock) |
| **Bộ test case xưng hô** (≥ 30 case, tham khảo người lớn trong nhà) | |

**Nhật:** module `ai` trong backend (LLM client dùng chung); văn bản mô tả mỗi người → embedding → pgvector.
**Bình:** chương tổng quan + phân tích yêu cầu; tài liệu API; test case nhóm A + B.

### S04 – Xưng hô, Thống kê, Radial (23/11 – 06/12)
| Sơn (BE) | Quân (FE) |
|---|---|
| **Rule engine xưng hô:** nội/ngoại, bác/chú theo thứ bậc, cô/dì/cậu, dâu/rể, họ đời thứ n, xưng hô 2 chiều | UI Relationship Finder: hiển thị câu xưng hô + **highlight đường đi trên cây** |
| Stats API (truy vấn tổng hợp) | Dashboard thống kê (Recharts) |
| | **Cây radial (D3)** |

**Nhật:** **AI viết tiểu sử (LMS-015)** end-to-end (endpoint + nút trên trang hồ sơ); tự re-embed khi dữ liệu đổi; vector search + truy vấn SQL.
**Bình:** chương thiết kế (kiến trúc, CSDL, thuật toán xưng hô cùng Sơn); điều phối kiểm thử giữa kỳ, ghi kết quả.
**Cả nhóm (tuần 8):** kiểm thử giữa kỳ nhóm A + B, sửa lỗi.
**🚩 Mốc kiểm tra cứng:** nếu đến cuối S04 trễ > 1 tuần so với plan thì kích hoạt danh sách cắt giảm.

### S05 – Cộng tác (07/12 – 20/12)
| Sơn (BE) | Quân (FE) |
|---|---|
| Lời mời (link/email), Membership role, giao nhánh cho Editor | Trang quản lý thành viên dòng họ: mời, đổi quyền, giao nhánh |
| Guard RBAC theo dòng họ + theo nhánh | Ẩn/hiện thao tác theo quyền |
| **Approval workflow:** bật nhánh Editor → `ChangeRequest`, diff JSON, duyệt/từ chối (transaction), audit log | Hàng chờ duyệt cho Admin: xem diff, duyệt/từ chối; badge "chờ duyệt" cho Editor |
| Comment API, Notification, WebSocket gateway | Bình luận trên hồ sơ, chuông thông báo realtime, lịch sử sửa |

**Nhật:** phân loại câu hỏi → gọi service Relationship Finder / SQL thống kê / vector search; áp Guard RBAC để chỉ đọc dữ liệu được phép.
**Bình:** hướng dẫn sử dụng (ảnh chụp màn hình); test case phân quyền + duyệt thay đổi.
**Cả nhóm:** deploy thử bản staging.

### S06 – Memory Wall, Sự kiện (21/12 – 03/01/2027)
> Có Giáng sinh và Tết dương lịch. Cả nhóm nên thống nhất trước ngày nghỉ.

| Sơn (BE) | Quân (FE) |
|---|---|
| Memory item (ảnh/video/audio/câu chuyện), thumbnail ảnh | Memory Wall: lưới, upload, trình phát audio/video, **ghi âm (MediaRecorder)** |
| FamilyEvent CRUD, quy đổi **giỗ âm lịch**, cron nhắc lịch (email + in-app) | Lịch/danh sách sự kiện, form, cài nhắc |

**Nhật:** endpoint chat (SSE) + **chat UI** (stream, câu hỏi gợi ý, link tới hồ sơ).
**Bình:** chương hiện thực (ảnh chụp màn hình, đoạn code tiêu biểu); test case Memory Wall, sự kiện, AI.

### S07 – 3D, Hoàn thiện (04/01 – 17/01/2027)
| Sơn (BE) | Quân (FE) |
|---|---|
| Deploy BE + DB (pgvector) + storage; cấu hình production | **Cây 3D (React Three Fiber)**, tối ưu render cây lớn; deploy Vercel |

**Nhật:** chạy bộ đánh giá, tinh chỉnh prompt chống bịa, giới hạn chi phí/lượt hỏi, deploy cấu hình AI.
**Bình:** chương kiểm thử + kết luận, slide, kịch bản demo, video demo dự phòng, rà soát `docs/`.
**Feature freeze cuối tuần 13.** Tuần 14: Sơn, Quân, Nhật chạy UAT (Bình điều phối) và sửa lỗi; cả nhóm tập bảo vệ.

## Phụ thuộc giữa các bạn
| Ai cần | Cái gì | Từ ai | Hạn |
|---|---|---|---|
| Nhật | Docker-compose có pgvector, Prisma schema Person/Relationship, dữ liệu seed | Sơn | Cuối S02 |
| Nhật | Event sau mỗi lần ghi trong `ChangeService` (để re-embed) | Sơn | Cuối S02 |
| Nhật | Layout, shadcn/ui, trang hồ sơ (để gắn nút AI tiểu sử) | Quân | Cuối S03 |
| Nhật | Service Relationship Finder gọi được từ module khác | Sơn | Cuối S04 |
| Nhật | Guard RBAC dùng lại được | Sơn | Giữa S05 |
| Bình | ERD, sơ đồ module | Sơn | Cuối S01 |
| Bình | Wireframe, ảnh chụp màn hình các tính năng đã xong | Quân | Cuối mỗi sprint |
| Bình | Nháp kỹ thuật cho báo cáo (Sơn: thuật toán + CSDL, Quân: trực quan hóa, Nhật: AI) | Sơn, Quân, Nhật | Sprint làm tính năng đó |

## Nguyên tắc phối hợp

1. **Contract-first:** ngày 1–2 mỗi sprint, người làm BE và FE của task chốt request/response trong `specs/api-contracts.md` qua PR. FE code trên mock MSW, BE code theo contract, không ai phải chờ ai.
2. **Type dùng chung** trong `src/shared/` (DTO, enum, Zod schema). Thay đổi ở đây cần người liên quan review.
3. **Ranh giới code và tài liệu:**
   - Sơn sở hữu `src/backend`, trừ `modules/ai/`.
   - Quân sở hữu `src/frontend`, trừ `features/chatbot/` và `features/biography/`.
   - Nhật sở hữu 3 thư mục `modules/ai/`, `features/chatbot/`, `features/biography/`.
   - Bình sở hữu `docs/`.
   - Sửa phần của người khác thì người đó review.
4. **Nhịp sprint:** ngày 5 tích hợp thử, ngày 9 tích hợp xong, ngày 10 demo + retro. Bình ghi biên bản và cập nhật file sprint/task.
5. **Branch:** `feature/LMS-XXX-<slug>-api` (Sơn), `feature/LMS-XXX-<slug>-ui` (Quân), `feature/LMS-015|016-<phần>` (Nhật), `feature/LMS-018-<phần>` (Bình). Commit `LMS-XXX: <mô tả>`.
6. **Review chéo** mọi PR, để ai cũng hiểu phần của người khác (phòng khi có người ốm, và để cả nhóm trả lời được hội đồng).
7. **Daily sync** 10–15 phút hoặc nhắn async: hôm qua làm gì, hôm nay làm gì, có bị block không.

## Definition of Done (mỗi task)
- [ ] Code trong `src/` có test, CI xanh
- [ ] Contract trong `specs/api-contracts.md` khớp code thật; FE đã bỏ mock
- [ ] Kiểm tra quyền: Viewer/Editor/Admin (từ S05 trở đi)
- [ ] PR đã được ít nhất 1 người khác review, link tới task
- [ ] Đã gửi Bình nháp kỹ thuật + ảnh chụp màn hình cho báo cáo
- [ ] Task `Done`, cập nhật file sprint

## Thứ tự cắt giảm khi trễ (đã thống nhất trước)
Cắt từ trên xuống, mỗi lần một mục, cho đến khi kịp:

| # | Cắt / đơn giản hóa | Giữ lại | Giảm tải cho |
|---|---|---|---|
| 1 | Cây 3D (A2) | Cây radial | Quân |
| 2 | Realtime WebSocket | Polling thông báo 30 giây | Sơn, Quân |
| 3 | Ghi âm trực tiếp trên Memory Wall | Upload file audio có sẵn | Quân |
| 4 | Nhắc lịch qua email | Thông báo trong app | Sơn |
| 5 | Giao nhánh cho Editor | Editor sửa được cả dòng họ (vẫn qua duyệt) | Sơn, Quân |
| 6 | Vector search trong chatbot | Chatbot chỉ dùng truy vấn có cấu trúc + Relationship Finder | Nhật |

Trước khi cắt, xem Nhật có thể nhận thêm việc không (ví dụ giao diện Dashboard LMS-008, hoặc Stats API).

## Rủi ro khác
| Rủi ro | Cách xử lý |
|---|---|
| Layout cây gia phả (vợ chồng, tái hôn) khó hơn cây thường | Dùng elkjs, gom vợ chồng thành "family node"; spike ngay tuần 3 |
| Quy tắc xưng hô sai hoặc thiếu | Viết bộ test case từ S03, hỏi người lớn trong gia đình; rule engine là hàm thuần, test kỹ |
| Tích hợp approval workflow phải refactor | Đường ghi qua `ChangeService` ngay từ S02 (ADR-0001) |
| Chatbot bị chặn vì Relationship Finder / RBAC xong muộn | Nhật dựng trước bằng interface giả, nối thật khi Sơn xong; giữ phương án dự phòng #6 |
| Báo cáo dồn vào tuần cuối | Bình viết theo sprint; mỗi task chỉ `Done` khi đã gửi nháp kỹ thuật (DoD) |
| Chi phí / giới hạn LLM API | Cache kết quả, giới hạn số lượt gọi; dùng model nhỏ khi dev |
| Deploy lỗi sát ngày bảo vệ | Deploy thử bản staging từ S05; tuần 14 chỉ sửa lỗi |
