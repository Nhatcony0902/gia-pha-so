# LMS-006: Timeline gia tộc

- **Trạng thái:** In Progress
- **Owner:** Quân + Sơn
- **Sprint:** Sprint 03
- **Spec liên quan:** `specs/features.md` (A4)

## User story
Là thành viên dòng họ, tôi muốn xem các sự kiện của dòng họ theo trục thời gian để hiểu câu chuyện gia đình.

## Tiêu chí chấp nhận
- [ ] Sự kiện sinh, cưới, mất tự suy ra từ dữ liệu hồ sơ/quan hệ
- [ ] Thêm/sửa/xóa sự kiện nhập tay (chuyển nơi ở…)
- [ ] Timeline cả dòng họ (lọc theo khoảng năm, nhánh) và timeline cá nhân trong hồ sơ

## Phân việc
### BE – Sơn
- LifeEvent model, API timeline (gộp sự kiện suy ra + nhập tay)

### FE – Quân
- Timeline dạng social feed (Tailwind tự dựng hoặc vis-timeline)

## Ghi chú kỹ thuật

## Tiến độ
- [x] Timeline dòng họ gộp ngày sinh/mất suy ra từ hồ sơ và sự kiện dòng họ (`GET /trees/{id}/timeline`, PR #8)
- [x] Lọc theo loại sự kiện, tìm kiếm, sắp xếp; xem dạng lịch kèm ngày âm lịch
- [ ] Sự kiện cưới suy ra từ quan hệ `SPOUSE`
- [ ] Sự kiện cá nhân nhập tay (LifeEvent, ví dụ chuyển nơi ở). Hiện chỉ có sự kiện cấp dòng họ (LMS-014)
- [ ] Lọc theo khoảng năm, theo nhánh
- [ ] Timeline cá nhân trong trang hồ sơ
