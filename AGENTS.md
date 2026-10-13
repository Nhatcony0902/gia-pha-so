# AGENTS.md – Luật chơi cho AI & team

## Nguồn context
- Trước khi làm task, đọc: `specs/` (nghiệp vụ), `adrs/` (quyết định kiến trúc), task tương ứng trong `tasks/`.
- Không tự ý đi ngược một ADR đã `Accepted`. Muốn thay đổi → tạo ADR mới với trạng thái `Proposed`.

## Quy ước
- Task đặt tên: `LMS-XXX-<slug>.md` (ví dụ `LMS-004-quiz.md`).
- ADR đặt tên: `NNNN-<slug>.md`, đánh số tăng dần, không sửa số cũ.
- Branch: `feature/LMS-XXX-<slug>`, `fix/LMS-XXX-<slug>`.
- Commit: `LMS-XXX: <mô tả ngắn>`.

## Quy trình làm task
1. Cập nhật trạng thái task → `In Progress`.
2. Code trong `src/`, kèm test.
3. Cập nhật spec/docs nếu hành vi thay đổi.
4. Mở PR, link tới task. Sau khi merge → task `Done`.

## Quy trình Git
- Repo: https://github.com/Nhatcony0902/gia-pha-so · Lead: **Nhật** (@Nhatcony0902).
- `main`: bản ổn định để demo/bảo vệ. `dev`: nhánh tích hợp (nhánh mặc định).
- Luồng: `feature/*`, `fix/*` → PR vào `dev` → cuối sprint PR `dev` → `main`.
- `main` và `dev` được bảo vệ: không push trực tiếp, mọi PR phải được **Nhật approve** (CODEOWNERS) mới merge được.
