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

## Phân việc
### AI – Nhật
- Prompt template, endpoint `biography/generate` trong module `ai`
- Nút "AI viết tiểu sử" trên trang hồ sơ → xem trước → chỉnh sửa → lưu
- Bộ ≥ 10 hồ sơ mẫu để so sánh chất lượng prompt

## Ghi chú kỹ thuật
- Dùng chung LLM client và cơ chế chống bịa với chatbot (LMS-016).
- Trang hồ sơ thuộc phần của Quân: thêm nút qua component riêng trong `features/biography/`, Quân review PR.
