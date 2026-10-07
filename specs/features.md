# Features

> Mô tả đầy đủ: `docs/tai-lieu-du-an-gia-pha-so.docx`, mục 2. Độ khó theo thang 1–5 của tài liệu.

| Mã | Tính năng | Ưu tiên (tài liệu) | Độ khó | Task | Sprint |
|---|---|---|---|---|---|
| A1 | Sơ đồ cây gia phả 2D tương tác | Bắt buộc | 3 | LMS-004 | S02 |
| A2 | Cây gia phả Radial / 3D | Nên có | 4 | LMS-009 | S04 (radial), S07 (3D) |
| A3 | Hồ sơ thành viên | Bắt buộc | 2 | LMS-003, LMS-005 | S02–S03 |
| A4 | Timeline gia tộc | Bắt buộc | 3 | LMS-006 | S03 |
| B1 | Relationship Finder | Nên có | 4 | LMS-007 | S03–S04 |
| B2 | Family Statistics Dashboard | Bắt buộc | 2 | LMS-008 | S04 |
| C1 | AI Chatbot (RAG) | Nên có | 4 | LMS-016 (Nhật) | S01–S07 |
| C2 | AI viết tiểu sử tự động | Bắt buộc | 2 | LMS-015 (Nhật) | S04 |
| D1 | Cộng tác nhiều người dùng & phân quyền | Bắt buộc | 3 | LMS-002, LMS-010 | S01, S05 |
| D2 | Quy trình duyệt thay đổi | Bắt buộc | 3 | LMS-011 | S05 |
| D3 | Bình luận | Bắt buộc | 1 | LMS-012 | S05 |
| D4 | Memory Wall | Bắt buộc | 3 | LMS-013 | S06 |
| D5 | Quản lý sự kiện dòng họ | Bắt buộc | 3 | LMS-014 | S06 |
| E1 | Tạo quan hệ động | Mở rộng | 4 | – | Nếu dư thời gian |

## Tóm tắt từng tính năng

- **A1 – Cây 2D:** zoom, pan, mở/thu gọn nhánh, tìm theo tên, click vào node để mở hồ sơ. Thể hiện được cha mẹ–con, vợ chồng (kể cả tái hôn) và con nuôi.
- **A2 – Radial/3D:** radial tree (D3) đặt thế hệ gốc ở tâm; chế độ 3D (React Three Fiber) cho phép xoay góc nhìn.
- **A3 – Hồ sơ:** ảnh đại diện, ngày sinh/mất, nghề nghiệp, nơi sinh, tiểu sử, tài liệu đính kèm. Là trang trung tâm, liên kết tới timeline cá nhân, Memory Wall, bình luận, lịch sử sửa.
- **A4 – Timeline:** timeline của cả dòng họ và timeline cá nhân. Sự kiện được suy ra từ hồ sơ (sinh, cưới, mất) và có thể nhập tay thêm.
- **B1 – Relationship Finder:** chọn 2 người → tìm đường đi ngắn nhất (BFS) → bộ quy tắc ánh xạ sang xưng hô tiếng Việt, ví dụ "A gọi B là ông nội", "hai người là anh em họ đời thứ hai".
- **B2 – Thống kê:** tổng số người, tỉ lệ nam/nữ, tuổi trung bình, tuổi thọ trung bình, gia đình đông con nhất, nhánh lớn nhất. Biểu đồ pie/bar/line.
- **C1 – Chatbot RAG:** hỏi bằng ngôn ngữ tự nhiên. Câu hỏi về quan hệ dùng kết quả B1; các câu hỏi khác dùng truy vấn có cấu trúc kết hợp vector search. Chỉ trả lời dựa trên dữ liệu.
- **C2 – AI tiểu sử:** sinh bản nháp tiểu sử từ các trường hồ sơ. Người dùng sửa rồi mới lưu.
- **D1 – Phân quyền:** Admin/Editor/Viewer theo từng dòng họ; Editor chỉ sửa được nhánh được giao. Xem `user-roles.md`.
- **D2 – Duyệt thay đổi:** thay đổi của Editor vào trạng thái `PENDING`. Admin xem diff rồi duyệt hoặc từ chối. Có audit log và thông báo.
- **D3 – Bình luận:** bình luận trên hồ sơ, realtime qua WebSocket là tùy chọn.
- **D4 – Memory Wall:** ảnh, video, câu chuyện, ghi âm cho từng người; có thumbnail.
- **D5 – Sự kiện dòng họ:** giỗ (âm lịch), họp mặt, cưới hỏi; nhắc lịch qua email và thông báo trong app.
