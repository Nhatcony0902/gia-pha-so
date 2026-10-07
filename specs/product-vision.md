# Product Vision – Hệ thống quản lý gia phả số

> Nguồn: `docs/tai-lieu-du-an-gia-pha-so.docx` (v1.0)

## Vấn đề
Gia phả truyền thống thường được ghi trên giấy và nằm rải rác ở nhiều chi họ, nên khó cập nhật, khó tra cứu và dễ thất lạc. Con cháu đời sau khó biết mình có quan hệ gì với người khác trong họ, nhất là khi cách xưng hô tiếng Việt rất phức tạp (nội/ngoại, bác/chú, cô/dì/cậu, họ đời thứ n…).

## Mục tiêu sản phẩm
Một nền tảng web giúp cả dòng họ cùng lưu trữ, trực quan hóa và khai thác gia phả, dựa trên 4 trụ cột kỹ thuật:
1. **Trực quan hóa đồ thị:** cây gia phả 2D tương tác, dạng radial/3D.
2. **Thuật toán trên đồ thị:** tìm và diễn giải quan hệ giữa hai người theo cách xưng hô tiếng Việt.
3. **AI tạo sinh:** chatbot hỏi đáp (RAG), tự động viết tiểu sử.
4. **Cộng tác nhiều người dùng:** phân quyền, duyệt thay đổi, bình luận, kho ký ức, sự kiện dòng họ.

## Đối tượng người dùng
Thành viên các dòng họ, gồm người lớn tuổi quản lý gia phả và con cháu đóng góp, tra cứu. Chi tiết: `user-roles.md`.

## Chỉ số thành công (cho đồ án)
- Hoàn thành 13 tính năng trong `features.md` trong 14 tuần.
- Demo trọn luồng: tạo dòng họ → nhập ≥ 50 người, ≥ 4 đời → xem cây → tìm quan hệ → hỏi chatbot.
- Relationship Finder trả đúng xưng hô cho toàn bộ bộ test case quan hệ chuẩn (đề xuất ≥ 30 case).
- Cây 2D vẫn thao tác mượt với dòng họ khoảng 500 người (đề xuất).

## Ngoài phạm vi
Đã loại khỏi phạm vi chính thức theo tài liệu:
- Bản đồ di cư gia tộc
- Upload ảnh cũ và phục hồi ảnh bằng AI
- OCR tài liệu gia phả cũ
- AI phát hiện dữ liệu bất thường

Chỉ làm nếu còn thời gian: Tạo quan hệ động (E1), xuất gia phả ra PDF, nhập dữ liệu từ file GEDCOM.
