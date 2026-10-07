# LMS-018: Tài liệu dự án & báo cáo đồ án

- **Trạng thái:** Todo
- **Owner:** Bình
- **Sprint:** Sprint 01–07
- **Spec liên quan:** `specs/features.md` (–)

## User story
Là nhóm đồ án, chúng tôi muốn tài liệu và báo cáo được viết dần theo từng sprint, để không dồn hết vào tuần cuối và hội đồng thấy được quá trình làm việc.

## Tiêu chí chấp nhận
- [ ] Báo cáo đồ án đúng mẫu của trường, đủ các chương: tổng quan, phân tích yêu cầu, thiết kế, hiện thực, kiểm thử, kết luận
- [ ] `docs/` có: sơ đồ kiến trúc, ERD, hướng dẫn cài đặt local, tài liệu API, hướng dẫn sử dụng
- [ ] Test case cho từng nhóm tính năng; kết quả kiểm thử giữa kỳ và cuối kỳ
- [ ] Biên bản họp / retro cuối mỗi sprint; trạng thái task và file sprint luôn khớp thực tế
- [ ] Slide bảo vệ, kịch bản demo, video demo dự phòng

## Phân việc
### Tài liệu – Bình
- S01: khung báo cáo theo mẫu trường, use-case diagram (cùng nhóm), mẫu biên bản họp, quy trình cập nhật sprint/task
- S02: sơ đồ kiến trúc, ERD bản trình bày (từ ERD của Sơn), hướng dẫn cài đặt local
- S03: chương tổng quan + phân tích yêu cầu; tài liệu API (từ `specs/api-contracts.md`); test case nhóm A + B
- S04: chương thiết kế (kiến trúc, CSDL, thuật toán xưng hô cùng Sơn); điều phối kiểm thử giữa kỳ
- S05: hướng dẫn sử dụng (ảnh chụp màn hình); test case phân quyền + duyệt thay đổi
- S06: chương hiện thực; test case Memory Wall, sự kiện, AI
- S07: chương kiểm thử + kết luận, slide, kịch bản demo, video demo dự phòng, rà soát `docs/`

## Ghi chú kỹ thuật
- Mỗi người code viết nháp kỹ thuật phần mình (Sơn: thuật toán + CSDL, Quân: trực quan hóa, Nhật: AI); Bình biên tập vào báo cáo.
- Sơ đồ vẽ bằng công cụ xuất được ảnh (draw.io / Mermaid), file nguồn lưu trong `docs/diagrams/`.
- Branch: `feature/LMS-018-<phần>`, commit `LMS-018: <mô tả>`.
