# LMS-009: Cây Radial / 3D

- **Trạng thái:** Todo
- **Owner:** Quân
- **Sprint:** Sprint 04 (radial), Sprint 07 (3D)
- **Spec liên quan:** `specs/features.md` (A2)

## User story
Là người dùng, tôi muốn xem gia phả theo dạng hướng tâm hoặc 3D để có góc nhìn khác.

## Tiêu chí chấp nhận
- [ ] Radial: thế hệ gốc ở tâm, các thế hệ sau tỏa ra theo vòng
- [ ] 3D: xoay, nghiêng, zoom; click vào node mở hồ sơ
- [ ] Chuyển qua lại giữa 2D / radial / 3D

## Phân việc
### BE – Sơn
- Dùng lại `GET /graph`

### FE – Quân
- D3 radial layout; React Three Fiber cho 3D

## Ghi chú kỹ thuật
Cây 3D là mục **đầu tiên** bị cắt nếu trễ (team-plan.md).
