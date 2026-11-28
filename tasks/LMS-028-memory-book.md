# LMS-028: Tự dựng "Sách ký ức" PDF cho một người hoặc một chi

- **Trạng thái:** Todo
- **Owner:** _(Nhật giao)_
- **Sprint:** Nếu dư thời gian
- **Spec liên quan:** `specs/features.md` (A3, C2, D4)
- **Nguồn:** Nhận xét tiến độ ĐATN nhóm 3, mục 2 (xuất phả đồ) và mục 5 (mức "Nâng cao")
- **Phụ thuộc:** chức năng xuất PDF (mục 2 của nhận xét, chưa có task), LMS-015 (tiểu sử), LMS-013 (ký ức), LMS-025 (chép lời kể)

## User story
Là con cháu, tôi muốn xuất một cuốn sách gồm tiểu sử, ảnh và chuyện kể của ông bà để in tặng cả nhà vào ngày giỗ.

## Tiêu chí chấp nhận
- [ ] Chọn phạm vi: một người, hoặc một người và con cháu (một chi)
- [ ] Sách gồm: bìa, lời mở đầu, tiểu sử từng người (LMS-015), ảnh (ưu tiên ảnh đã duyệt), chuyện kể đã chép lời (LMS-025), dòng thời gian
- [ ] AI chỉ viết phần nối và lời mở đầu từ nội dung đã duyệt; mọi đoạn AI viết gắn nhãn và phải duyệt trước khi xuất
- [ ] Tùy chọn kèm hoặc không kèm thông tin người còn sống
- [ ] Xuất PDF khổ A4/A5, dùng chung bộ dựng HTML → PDF với chức năng xuất phả đồ

## Ghi chú kỹ thuật
- Dựng trang HTML theo mẫu rồi in PDF (Puppeteer), như đề xuất ở mục 2 của nhận xét.
