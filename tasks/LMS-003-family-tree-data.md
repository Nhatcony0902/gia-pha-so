# LMS-003: Quản lý dòng họ, người & quan hệ

- **Trạng thái:** In Progress
- **Owner:** Sơn + Quân
- **Sprint:** Sprint 02
- **Spec liên quan:** `specs/features.md` (A3)

## User story
Là Admin dòng họ, tôi muốn tạo dòng họ, thêm người và khai báo quan hệ cha mẹ – con, vợ chồng để số hóa gia phả.

## Tiêu chí chấp nhận
- [ ] Tạo dòng họ → người tạo là Admin
- [x] CRUD Person: họ tên, giới tính, ngày sinh/mất (kèm độ chính xác), thứ bậc anh chị em, nghề nghiệp, nơi sinh, tiểu sử
- [x] Thêm quan hệ `PARENT_CHILD` (ruột/nuôi) và `SPOUSE` (có thứ tự hôn nhân)
- [ ] Từ chối: > 2 cha/mẹ ruột, chu trình tổ tiên, tự quan hệ (409)
- [ ] Mọi thao tác ghi đi qua `ChangeService` (ADR-0001), có hook để chatbot re-embed
- [ ] Seed dòng họ mẫu ≥ 50 người, 5 đời, có tái hôn và con nuôi

## Phân việc
### BE – Sơn
- Prisma schema + migration
- ChangeService (hiện chỉ có nhánh Admin), audit log, event sau khi ghi
- Kiểm tra chu trình bằng duyệt tổ tiên

### FE – Quân
- Trang danh sách / tạo dòng họ
- Form người (RHF + Zod), thêm cha/mẹ/con/vợ-chồng từ một người

## Ghi chú kỹ thuật
Quan hệ phái sinh (anh em, ông bà…) không lưu. Xem `specs/domains.md`.
