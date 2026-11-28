# LMS-015: AI viết tiểu sử

- **Trạng thái:** Todo
- **Owner:** Nhật
- **Sprint:** Sprint 04
- **Spec liên quan:** `specs/features.md` (C2)

## User story
Là người nhập liệu, tôi muốn AI viết bản nháp tiểu sử từ dữ liệu có sẵn để đỡ công nhập tay.

## Tiêu chí chấp nhận
- [ ] Sinh bản nháp từ các trường hồ sơ + sự kiện, văn phong tự nhiên
- [ ] Không bịa thông tin không có trong dữ liệu
- [ ] Người dùng sửa rồi mới lưu; lưu qua API sửa Person nên Editor tự động qua duyệt (từ S05)
- [ ] Tiểu sử có phần do AI viết được **gắn nhãn "AI tạo"** trên hồ sơ cho tới khi người duyệt xác nhận (nhận xét tiến độ, mục 5)
- [ ] Chế độ **phả ký**: đoạn ngắn theo lối gia phả truyền thống (tên húy/tự nếu có, con thứ mấy của ai, vợ/chồng, các con, ngày giỗ, nơi an táng), chỉ dùng dữ liệu có sẵn
- [ ] Chỉ chạy khi gia phả đã bật AI; người còn sống mà gia phả không chia sẻ chi tiết thì AI chỉ thấy phần đã ẩn (LMS-023, ADR-0008)
- [ ] Đánh giá: ≥ 10 hồ sơ mẫu, đếm số câu chứa thông tin không có trong dữ liệu (mục tiêu 0) và điểm văn phong 1–5. Ghi vào `docs/ai/eval-results/`

## Phân việc
### AI – Nhật
- Prompt template, endpoint `biography/generate` trong module `ai`
- Nút "AI viết tiểu sử" trên trang hồ sơ → xem trước → chỉnh sửa → lưu
- Bộ ≥ 10 hồ sơ mẫu để so sánh chất lượng prompt

## Ghi chú kỹ thuật
- Dùng chung LLM client và cơ chế chống bịa với chatbot (LMS-016), cổng đồng ý và `snapshotForAi` (LMS-023).
- Kiểm tra chống bịa tự động: mọi năm, địa danh, tên người trong bản nháp phải có trong dữ liệu đầu vào; nếu không thì đánh dấu để người dùng xem lại.
- Trang hồ sơ thuộc phần của Quân: thêm nút qua component riêng trong `features/biography/`, Quân review PR.
