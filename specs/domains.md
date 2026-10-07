# Domains

## Danh sách domain
| Domain | Mô tả | Thực thể chính |
|---|---|---|
| Identity | Tài khoản, xác thực, vai trò trong dòng họ | User, Membership, Invitation |
| Genealogy | Dữ liệu phả hệ: người và quan hệ | FamilyTree, Person, Relationship, LifeEvent |
| Media | Tệp đính kèm và ký ức đa phương tiện | Attachment, MemoryItem |
| Collaboration | Duyệt thay đổi, lịch sử, bình luận, thông báo | ChangeRequest, AuditLog, Comment, Notification |
| FamilyEvents | Sự kiện dòng họ và nhắc lịch | FamilyEvent, Reminder |
| AI | Chatbot RAG, sinh tiểu sử | PersonEmbedding, ChatSession |
| Analytics | Thống kê, chỉ đọc (truy vấn tổng hợp, không có bảng riêng) | – |

## Thuật ngữ (Ubiquitous Language)
> Trong tài liệu gốc, chữ "thành viên" dùng cho cả hai nghĩa. Trong code và spec, **bắt buộc** phân biệt:

- **User**: tài khoản đăng nhập hệ thống.
- **Person**: một người trong gia phả (còn sống hoặc đã mất). Không nhất thiết có tài khoản.
- **Membership**: User tham gia một FamilyTree với vai trò Admin/Editor/Viewer. Membership có thể liên kết tới đúng Person của chính user đó, để user tự sửa hồ sơ của mình.
- **FamilyTree**: một dòng họ / một cây gia phả.
- **Relationship**: cạnh trong đồ thị. Chỉ lưu 2 loại gốc:
  - `PARENT_CHILD`: kèm `kind` = `BIOLOGICAL` hoặc `ADOPTIVE`.
  - `SPOUSE`: kèm thứ tự hôn nhân, ngày cưới/ly hôn, để thể hiện trường hợp tái hôn.
- **Quan hệ phái sinh**: anh chị em, ông bà, cô chú, họ hàng… **không lưu** mà suy ra từ đồ thị.
- **LifeEvent**: sự kiện trong đời một Person (sinh, cưới, chuyển nơi ở, mất…), dùng cho Timeline.
- **FamilyEvent**: sự kiện của cả dòng họ (giỗ, họp mặt, cưới hỏi), có nhắc lịch.
- **ChangeRequest**: đề xuất thay đổi đang chờ duyệt, tương tự một Pull Request.

## Ghi chú mô hình hóa quan trọng
- **Thứ bậc anh chị em** (`birthOrder` hoặc ngày sinh) là bắt buộc cho Relationship Finder. Lý do: anh của cha là *bác*, em trai của cha là *chú*; con của anh/chị luôn vai trên con của em, kể cả khi ít tuổi hơn.
- **Giới tính** và **bên nội/ngoại** quyết định cách xưng hô: cô/chú (bên nội), dì/cậu (bên ngoại).
- **Ngày giỗ** tính theo âm lịch. Cần lưu ngày mất (dương lịch, và âm lịch nếu biết) để quy đổi khi nhắc lịch.
- Ngày tháng thường không đầy đủ (chỉ biết năm, hoặc "khoảng năm 1920"). Lưu ngày kèm độ chính xác (`YEAR` / `MONTH` / `DAY`).
- Ràng buộc khi tạo quan hệ: tối đa 2 cha/mẹ ruột, không tự quan hệ với chính mình, không tạo chu trình tổ tiên.
