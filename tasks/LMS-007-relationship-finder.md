# LMS-007: Relationship Finder

- **Trạng thái:** Todo
- **Owner:** Sơn (Quân: UI)
- **Sprint:** Sprint 03–04
- **Spec liên quan:** `specs/features.md` (B1)

## User story
Là thành viên dòng họ, tôi muốn chọn hai người và biết họ quan hệ gì, gọi nhau thế nào theo cách xưng hô tiếng Việt.

## Tiêu chí chấp nhận
- [ ] Phần 1 (S03): BFS trả đường đi ngắn nhất dạng chuỗi bước (cha, mẹ, con, vợ/chồng)
- [ ] Phần 2 (S04): trả `aCallsB`, `bCallsA` và câu mô tả, ví dụ "A gọi B là ông nội", "anh em họ đời thứ hai"
- [ ] Đúng các trường hợp: nội/ngoại, bác/chú theo thứ bậc, cô/dì/cậu, dâu/rể, họ đời thứ n
- [ ] Pass toàn bộ bộ test case (≥ 30 case)
- [ ] FE hiển thị kết quả và highlight đường đi trên cây
- [ ] Có service gọi được từ module khác (chatbot của Nhật dùng ở S05)

## Phân việc
### BE – Sơn
- BFS + rule engine là hàm thuần TypeScript, unit test
- Viết bộ test case từ S03

### FE – Quân
- Chọn 2 người (autocomplete), hiển thị kết quả, highlight path trên cây 2D

## Ghi chú kỹ thuật
Tính năng "linh hồn kỹ thuật". Cần `birthOrder` và giới tính chính xác (xem `specs/domains.md`).
